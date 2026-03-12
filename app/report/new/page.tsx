import { connection } from "next/server";

import { prisma } from "@/lib/prisma";

import { ReportForm } from "./report-form";

const PLATFORM_ORDER = [
	"Facebook",
	"LINE",
	"Instagram",
	"Threads",
	"X",
	"YouTube",
	"Google検索",
	"TikTok",
	"その他",
] as const;

function sortPlatforms(
	platforms: Array<{
		id: number;
		name: string;
	}>,
) {
	const orderMap = new Map<string, number>(
		PLATFORM_ORDER.map((name, index) => [name, index]),
	);

	return [...platforms].sort((left, right) => {
		const leftOrder = orderMap.get(left.name) ?? Number.MAX_SAFE_INTEGER;
		const rightOrder = orderMap.get(right.name) ?? Number.MAX_SAFE_INTEGER;

		if (leftOrder !== rightOrder) {
			return leftOrder - rightOrder;
		}

		return left.name.localeCompare(right.name, "ja");
	});
}

export default async function NewReportPage() {
	await connection();

	const platforms = sortPlatforms(
		await prisma.platform.findMany({
			where: {
				isActive: true,
			},
			select: {
				id: true,
				name: true,
			},
		}),
	);

	return <ReportForm platforms={platforms} />;
}
