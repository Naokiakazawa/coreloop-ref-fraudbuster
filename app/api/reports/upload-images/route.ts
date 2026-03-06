import { randomUUID } from "node:crypto";
import {
	badRequestResponse,
	errorResponse,
	successResponse,
	getClientIp,
	verifyReportSessionToken,
} from "@/lib/api-utils";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import {
	ALLOWED_REPORT_IMAGE_FORMATS_LABEL,
	type CanonicalImageExtension,
	canonicalizeImageExtension,
	canonicalizeImageMimeType,
	extractFileExtension,
	getCanonicalImageExtensionFromMimeType,
	getCanonicalMimeTypeFromImageExtension,
	isAllowedImageExtension,
	isAllowedImageMimeType,
	MAX_REPORT_IMAGE_FILE_COUNT,
	MAX_REPORT_IMAGE_FILE_SIZE_BYTES,
	normalizeImageMimeType,
} from "@/lib/report-image-upload";
import {
	checkAndRecordImageUploadRateLimit,
	checkSessionUploadBudget,
	recordSessionUploadSuccess,
} from "@/lib/upload-abuse-guard";

const DEFAULT_STORAGE_BUCKET = "report-screenshots";
const MAX_REENCODE_INPUT_PIXELS = 40_000_000;
const JPEG_REENCODE_QUALITY = 85;
const WEBP_REENCODE_QUALITY = 85;

type UploadedScreenshot = {
	path: string;
	publicUrl: string;
	contentType: string;
	size: number;
};

function resolveSupabaseProjectUrl(): string | null {
	const raw =
		process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
	if (!raw) return null;

	try {
		const parsed = new URL(raw);
		if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
			return null;
		}
		return parsed.origin;
	} catch {
		return null;
	}
}

function buildStorageObjectUrl(
	supabaseUrl: string,
	bucket: string,
	objectPath: string,
	publicAccess: boolean,
): string {
	const encodedBucket = encodeURIComponent(bucket);
	const encodedObjectPath = objectPath
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");
	const basePath = publicAccess
		? `/storage/v1/object/public/${encodedBucket}/${encodedObjectPath}`
		: `/storage/v1/object/${encodedBucket}/${encodedObjectPath}`;
	return new URL(basePath, supabaseUrl).toString();
}

async function readResponseText(response: Response): Promise<string> {
	try {
		return (await response.text()).slice(0, 500);
	} catch {
		return "";
	}
}

async function uploadToStorage({
	bytes,
	size,
	bucket,
	serviceRoleKey,
	supabaseUrl,
	filePath,
	contentType,
}: {
	bytes: Buffer;
	size: number;
	bucket: string;
	serviceRoleKey: string;
	supabaseUrl: string;
	filePath: string;
	contentType: string;
}): Promise<UploadedScreenshot> {
	const objectPath = filePath;
	const uploadUrl = buildStorageObjectUrl(
		supabaseUrl,
		bucket,
		objectPath,
		false,
	);

	const uploadResponse = await fetch(uploadUrl, {
		// `Buffer` を明示的に `ArrayBuffer` ベースへ変換し、fetch の BodyInit 型と整合させる
		body: new Blob([Uint8Array.from(bytes)], { type: contentType }),
		method: "POST",
		headers: {
			Authorization: `Bearer ${serviceRoleKey}`,
			apikey: serviceRoleKey,
			"Content-Type": contentType,
			"x-upsert": "false",
			"cache-control": "3600",
		},
		cache: "no-store",
	});

	if (!uploadResponse.ok) {
		const reason = await readResponseText(uploadResponse);
		throw new Error(
			reason || `Storage upload failed with ${uploadResponse.status}`,
		);
	}

	return {
		path: objectPath,
		publicUrl: buildStorageObjectUrl(supabaseUrl, bucket, objectPath, true),
		contentType,
		size,
	};
}

async function cleanupUploadedFiles({
	files,
	bucket,
	serviceRoleKey,
	supabaseUrl,
}: {
	files: UploadedScreenshot[];
	bucket: string;
	serviceRoleKey: string;
	supabaseUrl: string;
}) {
	await Promise.allSettled(
		files.map((file) =>
			fetch(buildStorageObjectUrl(supabaseUrl, bucket, file.path, false), {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${serviceRoleKey}`,
					apikey: serviceRoleKey,
				},
				cache: "no-store",
			}),
		),
	);
}

async function reencodeAndSanitizeImage({
	inputBuffer,
	targetExtension,
}: {
	inputBuffer: Buffer;
	targetExtension: CanonicalImageExtension;
}): Promise<{
	buffer: Buffer;
	contentType: string;
	extension: CanonicalImageExtension;
}> {
	const image = sharp(inputBuffer, {
		animated: true,
		failOn: "error",
		limitInputPixels: MAX_REENCODE_INPUT_PIXELS,
	});
	const normalized = image.rotate();

	if (targetExtension === "jpg") {
		return {
			buffer: await normalized
				.jpeg({ quality: JPEG_REENCODE_QUALITY, mozjpeg: true })
				.toBuffer(),
			contentType: "image/jpeg",
			extension: "jpg",
		};
	}
	if (targetExtension === "png") {
		return {
			buffer: await normalized.png({ compressionLevel: 9 }).toBuffer(),
			contentType: "image/png",
			extension: "png",
		};
	}
	if (targetExtension === "webp") {
		return {
			buffer: await normalized
				.webp({ quality: WEBP_REENCODE_QUALITY })
				.toBuffer(),
			contentType: "image/webp",
			extension: "webp",
		};
	}

	return {
		buffer: await normalized.gif().toBuffer(),
		contentType: "image/gif",
		extension: "gif",
	};
}

/**
 * POST /api/reports/upload-images
 * Upload screenshots to Supabase Storage and return public URLs
 */
export async function POST(request: Request) {
	try {
		const supabaseUrl = resolveSupabaseProjectUrl();
		const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
		const bucket =
			process.env.SUPABASE_REPORT_SCREENSHOT_BUCKET?.trim() ||
			DEFAULT_STORAGE_BUCKET;
		const clientIp = getClientIp(request);
		const userAgent = request.headers.get("user-agent")?.trim() || "unknown";
		const rateLimitKey = clientIp
			? `ip:${clientIp}`
			: `ua:${userAgent.slice(0, 160).toLowerCase()}`;
		const rateLimit = checkAndRecordImageUploadRateLimit(rateLimitKey);

		if (!rateLimit.allowed) {
			return Response.json(
				{
					error:
						"画像アップロードのリクエストが多すぎます。時間を空けて再試行してください。",
				},
				{
					status: 429,
					headers: {
						"Retry-After": String(rateLimit.retryAfterSeconds ?? 60),
					},
				},
			);
		}

		if (!supabaseUrl || !serviceRoleKey) {
			return errorResponse(
				"Storageの設定が不足しています。管理者へお問い合わせください。",
				503,
			);
		}

		const formData = await request.formData();
		const rawFiles = formData.getAll("files");
		const reportSessionToken = formData.get("reportSessionToken");

		if (typeof reportSessionToken !== "string" || !reportSessionToken.trim()) {
			return badRequestResponse("レポートセッショントークンが未指定です。");
		}

		// Verify Report Session Token
		const sessionPayload = verifyReportSessionToken(reportSessionToken.trim());
		if (!sessionPayload) {
			return errorResponse(
				"レポートセッションが無効、または期限切れです。フォームを再読み込みしてください。",
				401,
			);
		}

		if (rawFiles.length === 0) {
			return badRequestResponse("アップロードする画像を選択してください。");
		}
		if (rawFiles.length > MAX_REPORT_IMAGE_FILE_COUNT) {
			return badRequestResponse("スクリーンショットは最大5枚までです。");
		}

		const files: File[] = [];
		for (const rawFile of rawFiles) {
			if (!(rawFile instanceof File)) {
				return badRequestResponse("ファイル形式が不正です。");
			}
			files.push(rawFile);
		}
		const incomingTotalBytes = files.reduce((sum, file) => sum + file.size, 0);
		const budget = checkSessionUploadBudget(sessionPayload.sessionId, {
			incomingFileCount: files.length,
			incomingTotalBytes,
		});
		if (!budget.allowed) {
			return Response.json(
				{ error: budget.message ?? "画像アップロードの上限に達しました。" },
				{ status: 429 },
			);
		}

		const validatedFiles: Array<{
			bytes: Buffer;
			contentType: string;
			extension: string;
			size: number;
		}> = [];

		for (const file of files) {
			const normalizedMimeType = normalizeImageMimeType(file.type);
			const fileExtension = extractFileExtension(file.name);
			const hasAllowedMimeType =
				normalizedMimeType.length > 0 &&
				isAllowedImageMimeType(normalizedMimeType);
			const hasAllowedExtension = isAllowedImageExtension(fileExtension);

			if (!hasAllowedMimeType && !hasAllowedExtension) {
				return badRequestResponse(
					`${ALLOWED_REPORT_IMAGE_FORMATS_LABEL} のみ添付できます。`,
				);
			}
			if (file.size <= 0) {
				return badRequestResponse("空のファイルはアップロードできません。");
			}
			if (file.size > MAX_REPORT_IMAGE_FILE_SIZE_BYTES) {
				return badRequestResponse("各ファイルは5MB以下にしてください。");
			}

			// Magic byte check
			const rawBuffer = Buffer.from(await file.arrayBuffer());
			const detectedType = await fileTypeFromBuffer(rawBuffer);
			const detectedMimeType = canonicalizeImageMimeType(detectedType?.mime);
			if (!detectedMimeType) {
				return badRequestResponse(
					`不正なファイル形式です。${ALLOWED_REPORT_IMAGE_FORMATS_LABEL} のみ添付できます。`,
				);
			}

			const detectedExtension = canonicalizeImageExtension(detectedType?.ext);
			const declaredCanonicalMimeType =
				getCanonicalMimeTypeFromImageExtension(fileExtension) ??
				canonicalizeImageMimeType(normalizedMimeType);
			const extension =
				detectedExtension ??
				getCanonicalImageExtensionFromMimeType(declaredCanonicalMimeType) ??
				getCanonicalImageExtensionFromMimeType(detectedMimeType) ??
				"jpg";
			let sanitizedImage: {
				buffer: Buffer;
				contentType: string;
				extension: CanonicalImageExtension;
			};
			try {
				sanitizedImage = await reencodeAndSanitizeImage({
					inputBuffer: rawBuffer,
					targetExtension: extension,
				});
			} catch {
				return badRequestResponse(
					`${file.name} の画像処理に失敗しました。別の画像で再試行してください。`,
				);
			}
			if (sanitizedImage.buffer.length <= 0) {
				return badRequestResponse(
					`${file.name} の画像処理結果が不正です。別の画像で再試行してください。`,
				);
			}
			if (sanitizedImage.buffer.length > MAX_REPORT_IMAGE_FILE_SIZE_BYTES) {
				return badRequestResponse(
					`${file.name} は画像処理後に5MBを超えました。別の画像で再試行してください。`,
				);
			}

			validatedFiles.push({
				bytes: sanitizedImage.buffer,
				contentType: sanitizedImage.contentType,
				extension: sanitizedImage.extension,
				size: sanitizedImage.buffer.length,
			});
		}

		const uploadedFiles: UploadedScreenshot[] = [];
		try {
			for (const validatedFile of validatedFiles) {
				const fileName = `${randomUUID()}.${validatedFile.extension}`;
				// セッションIDごとにディレクトリを分けることでクリーンアップを容易にする
				const filePath = `reports/temp/${sessionPayload.sessionId}/${fileName}`;

				const uploadedFile = await uploadToStorage({
					bytes: validatedFile.bytes,
					size: validatedFile.size,
					bucket,
					serviceRoleKey,
					supabaseUrl,
					filePath,
					contentType: validatedFile.contentType,
				});
				uploadedFiles.push(uploadedFile);
			}
		} catch (uploadError) {
			await cleanupUploadedFiles({
				files: uploadedFiles,
				bucket,
				serviceRoleKey,
				supabaseUrl,
			});
			throw uploadError;
		}
		const uploadedTotalBytes = uploadedFiles.reduce(
			(sum, uploadedFile) => sum + uploadedFile.size,
			0,
		);
		recordSessionUploadSuccess(sessionPayload.sessionId, {
			uploadedFileCount: uploadedFiles.length,
			uploadedTotalBytes,
		});

		return successResponse({ files: uploadedFiles }, 201);
	} catch (error) {
		console.error("Failed to upload screenshots:", error);
		return errorResponse(
			"スクリーンショットのアップロードに失敗しました。",
			502,
		);
	}
}
