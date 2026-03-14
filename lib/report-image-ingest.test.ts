import assert from "node:assert/strict";
import test from "node:test";

const { readReportImageFiles, validateAndPrepareReportImages } = await import(
	new URL("./report-image-ingest.ts", import.meta.url).href
);

test("readReportImageFiles allows an empty selection when files are optional", () => {
	const formData = new FormData();

	const files = readReportImageFiles(formData, "files", {
		required: false,
		maxFileCount: 3,
	});

	assert.deepEqual(files, []);
});

test("readReportImageFiles rejects selections above the configured max count", () => {
	const formData = new FormData();
	for (let index = 0; index < 4; index += 1) {
		formData.append(
			"files",
			new File([`file-${index}`], `file-${index}.png`, {
				type: "image/png",
			}),
		);
	}

	assert.throws(
		() =>
			readReportImageFiles(formData, "files", {
				maxFileCount: 3,
			}),
		/画像は最大3枚までです。/,
	);
});

test("validateAndPrepareReportImages enforces custom size limits before processing", async () => {
	const oversizedFile = new File(
		[new Uint8Array(1024 * 1024 + 1)],
		"oversized.png",
		{
			type: "image/png",
		},
	);

	await assert.rejects(
		() =>
			validateAndPrepareReportImages([oversizedFile], {
				maxFileSizeBytes: 1024 * 1024,
			}),
		/各ファイルは1MB以下にしてください。/,
	);
});
