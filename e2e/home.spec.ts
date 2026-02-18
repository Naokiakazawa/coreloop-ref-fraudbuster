import { expect, test, type Page } from "@playwright/test";

import type { ReportsListResponse, ReportSummary } from "../lib/types/api";

function createReport(params: {
	id: string;
	title: string;
	description: string;
	createdAt: string;
}): ReportSummary {
	return {
		id: params.id,
		url: `https://example.com/${params.id}`,
		title: params.title,
		description: params.description,
		createdAt: params.createdAt,
		riskScore: 85,
		platform: { id: 1, name: "LINE" },
		category: { id: 1, name: "フィッシング" },
		status: { id: 1, label: "調査中" },
		images: [],
	};
}

function createReportRange(
	prefix: string,
	start: number,
	count: number,
	baseDate: Date,
): ReportSummary[] {
	return Array.from({ length: count }, (_, index) => {
		const number = start + index;
		const date = new Date(baseDate);
		date.setDate(baseDate.getDate() - index);

		return createReport({
			id: `${prefix}-${number}`,
			title: `${prefix} 通報 ${number}`,
			description: `${prefix} の説明 ${number}`,
			createdAt: date.toISOString(),
		});
	});
}

const newestItems = createReportRange(
	"最新",
	2,
	11,
	new Date("2026-02-15T00:00:00.000Z"),
);
newestItems.unshift(
	createReport({
		id: "newest-1",
		title: "最新: Amazonなりすまし",
		description: "最新順の先頭データ",
		createdAt: "2026-02-15T12:00:00.000Z",
	}),
);

const popularItems = createReportRange(
	"話題",
	2,
	11,
	new Date("2026-02-14T00:00:00.000Z"),
);
popularItems.unshift(
	createReport({
		id: "popular-1",
		title: "話題: 高リスク投資詐欺",
		description: "人気順の先頭データ",
		createdAt: "2026-02-01T12:00:00.000Z",
	}),
);

const NEWEST_PAGE_1: ReportsListResponse = {
	items: newestItems,
	nextCursor: "newest-cursor-1",
};

const NEWEST_PAGE_2: ReportsListResponse = {
	items: createReportRange("最新", 13, 6, new Date("2026-01-31T00:00:00.000Z")),
	nextCursor: null,
};

const POPULAR_PAGE_1: ReportsListResponse = {
	items: popularItems,
	nextCursor: null,
};

const SEARCH_PAGE: ReportsListResponse = {
	items: [
		createReport({
			id: "search-1",
			title: "LINE緊急確認",
			description: "検索結果データ",
			createdAt: "2026-02-15T09:00:00.000Z",
		}),
	],
	nextCursor: null,
};

async function mockReportsApi(page: Page) {
	await page.route("**/api/reports**", async (route) => {
		const url = new URL(route.request().url());
		const sort = url.searchParams.get("sort") ?? "newest";
		const cursor = url.searchParams.get("cursor");
		const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

		let payload: ReportsListResponse;
		if (q.length > 0) {
			payload = q.includes("line")
				? SEARCH_PAGE
				: { items: [], nextCursor: null };
		} else if (sort === "popular") {
			payload = POPULAR_PAGE_1;
		} else {
			payload = cursor === "newest-cursor-1" ? NEWEST_PAGE_2 : NEWEST_PAGE_1;
		}

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(payload),
		});
	});
}

test.describe("Home / reports grid", () => {
	test.beforeEach(async ({ page }) => {
		await mockReportsApi(page);
	});

	test("searches reports using the top search input", async ({ page }) => {
		await page.goto("/");

		await expect(page.locator('[data-testid="report-card"]')).toHaveCount(12);

		const searchInput = page.getByTestId("report-search-input");
		await searchInput.fill("LINE");

		await expect(page.locator('[data-testid="report-card"]')).toHaveCount(1);
		await expect(
			page.getByRole("heading", { name: "LINE緊急確認" }),
		).toBeVisible();
	});

	test("switches sort order between 最新 and 話題", async ({ page }) => {
		await page.goto("/");

		const firstTitle = page.locator('[data-testid="report-card"] h3').first();
		await expect(firstTitle).toHaveText("最新: Amazonなりすまし");

		await page.getByRole("tab", { name: "話題" }).click();
		await expect(firstTitle).toHaveText("話題: 高リスク投資詐欺");

		await page.getByRole("tab", { name: "最新" }).click();
		await expect(firstTitle).toHaveText("最新: Amazonなりすまし");
	});

	test("loads next page when scrolling to the infinite-scroll sentinel", async ({
		page,
	}) => {
		await page.goto("/");

		const cards = page.locator('[data-testid="report-card"]');
		await expect(cards).toHaveCount(12);

		const sentinel = page.getByTestId("report-scroll-sentinel");
		await sentinel.scrollIntoViewIfNeeded();

		await expect(cards).toHaveCount(18);
	});
});
