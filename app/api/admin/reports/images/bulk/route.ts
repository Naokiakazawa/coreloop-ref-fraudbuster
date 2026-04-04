import { revalidatePath, revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { ADMIN_REPORT_STATUSES_PATH } from "@/lib/admin-report-statuses";
import {
	badRequestResponse,
	errorResponse,
	successResponse,
} from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { getSafeReportImageProxyPath } from "@/lib/report-image-delivery";
import {
	cleanupStoredReportImages,
	getReportImageStorageBucket,
	getReportImageStoragePathFromUrl,
	resolveSupabaseProjectOrigin,
} from "@/lib/report-image-storage";

function getUniqueStringValues(values: string[]) {
	return Array.from(
		new Set(values.map((value) => value.trim()).filter(Boolean)),
	);
}

function readReportIds(request: NextRequest) {
	return getUniqueStringValues(
		request.nextUrl.searchParams.getAll("reportIds"),
	);
}

function readImageIds(payload: unknown) {
	if (!payload || typeof payload !== "object" || !("imageIds" in payload)) {
		return [];
	}

	const imageIds = (payload as { imageIds?: unknown }).imageIds;
	if (!Array.isArray(imageIds)) {
		return [];
	}

	return getUniqueStringValues(
		imageIds.filter((value): value is string => typeof value === "string"),
	);
}

export async function GET(request: NextRequest) {
	const session = getAdminSessionFromRequest(request);
	if (!session) {
		return errorResponse("再度ログインしてください。", 401);
	}

	try {
		const reportIds = readReportIds(request);
		if (reportIds.length === 0) {
			return badRequestResponse("通報IDが不正です。");
		}

		const reportOrder = new Map(
			reportIds.map((reportId, index) => [reportId, index]),
		);
		const reports = await prisma.report.findMany({
			where: {
				id: {
					in: reportIds,
				},
			},
			select: {
				id: true,
				title: true,
				url: true,
				images: {
					select: {
						id: true,
						imageUrl: true,
						displayOrder: true,
					},
					orderBy: { displayOrder: "asc" },
				},
			},
		});

		reports.sort(
			(left, right) =>
				(reportOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
				(reportOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER),
		);

		return successResponse({
			reports: reports.map((report) => ({
				id: report.id,
				title: report.title,
				url: report.url,
				images: report.images.map((image) => ({
					id: image.id,
					previewUrl: getSafeReportImageProxyPath(image),
					displayOrder: image.displayOrder ?? null,
				})),
			})),
		});
	} catch (error) {
		console.error("Failed to fetch bulk admin report images:", error);
		return errorResponse("画像一覧の取得に失敗しました。", 500);
	}
}

export async function DELETE(request: NextRequest) {
	const session = getAdminSessionFromRequest(request);
	if (!session) {
		return errorResponse("再度ログインしてください。", 401);
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return badRequestResponse("削除対象の画像が不正です。");
	}

	try {
		const imageIds = readImageIds(payload);
		if (imageIds.length === 0) {
			return badRequestResponse("削除対象の画像が不正です。");
		}

		const [images, admin] = await Promise.all([
			prisma.reportImage.findMany({
				where: {
					id: {
						in: imageIds,
					},
				},
				select: {
					id: true,
					reportId: true,
					imageUrl: true,
				},
			}),
			prisma.admin.findUnique({
				where: { email: session.email },
				select: { id: true },
			}),
		]);

		if (images.length === 0) {
			return errorResponse("対象の画像が見つかりません。", 404);
		}

		const deletedImageIds = images.map((image) => image.id);
		const reportIds = Array.from(
			new Set(images.map((image) => image.reportId)),
		);
		const now = new Date();
		const deletedCountByReport = new Map<string, number>();

		for (const image of images) {
			deletedCountByReport.set(
				image.reportId,
				(deletedCountByReport.get(image.reportId) ?? 0) + 1,
			);
		}

		await prisma.$transaction([
			prisma.reportImage.deleteMany({
				where: {
					id: {
						in: deletedImageIds,
					},
				},
			}),
			...reportIds.map((reportId) =>
				prisma.report.update({
					where: { id: reportId },
					data: {
						updatedAt: now,
					},
				}),
			),
			...Array.from(deletedCountByReport.entries()).map(([reportId, count]) =>
				prisma.reportTimeline.create({
					data: {
						reportId,
						actionLabel: "証拠画像削除",
						description: `${count}枚の画像を削除`,
						createdBy: admin?.id ?? null,
					},
				}),
			),
		]);

		const storageFiles = images
			.map((image) => {
				const path = getReportImageStoragePathFromUrl(image.imageUrl);
				if (!path) {
					return null;
				}

				return {
					path,
					publicUrl: image.imageUrl,
					contentType: "",
					size: 0,
				};
			})
			.filter(
				(
					file,
				): file is {
					path: string;
					publicUrl: string;
					contentType: string;
					size: number;
				} => file !== null,
			);
		const supabaseOrigin = resolveSupabaseProjectOrigin();
		const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

		if (storageFiles.length > 0 && supabaseOrigin && serviceRoleKey) {
			await cleanupStoredReportImages({
				files: storageFiles,
				bucket: getReportImageStorageBucket(),
				serviceRoleKey,
				supabaseOrigin,
			});
		}

		revalidateTag("reports", "max");
		revalidatePath(ADMIN_REPORT_STATUSES_PATH);
		revalidatePath("/admin");
		for (const reportId of reportIds) {
			revalidatePath(`/reports/${reportId}`);
		}

		return successResponse({
			deletedCount: deletedImageIds.length,
			affectedReportCount: reportIds.length,
		});
	} catch (error) {
		console.error("Failed to bulk delete admin report images:", error);
		return errorResponse("画像の削除に失敗しました。", 500);
	}
}
