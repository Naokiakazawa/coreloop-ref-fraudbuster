import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 300;

const STATIC_ROUTES: MetadataRoute.Sitemap = [
	{
		url: "/",
		changeFrequency: "hourly",
		priority: 1,
	},
	{
		url: "/statistics",
		changeFrequency: "daily",
		priority: 0.8,
	},
	{
		url: "/announcements",
		changeFrequency: "daily",
		priority: 0.8,
	},
	{
		url: "/contact",
		changeFrequency: "monthly",
		priority: 0.7,
	},
	{
		url: "/terms",
		changeFrequency: "yearly",
		priority: 0.3,
	},
	{
		url: "/privacy",
		changeFrequency: "yearly",
		priority: 0.3,
	},
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const siteUrl = getSiteUrl();
	const [reports, announcements] = await Promise.all([
		prisma.report.findMany({
			select: {
				id: true,
				updatedAt: true,
				createdAt: true,
			},
			orderBy: {
				updatedAt: "desc",
			},
		}),
		prisma.announcement.findMany({
			where: {
				isPublished: true,
			},
			select: {
				id: true,
				publishedAt: true,
				createdAt: true,
			},
			orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
		}),
	]);

	return [
		...STATIC_ROUTES.map((route) => ({
			...route,
			url: new URL(route.url, siteUrl).toString(),
		})),
		...reports.map((report) => ({
			url: new URL(`/reports/${report.id}`, siteUrl).toString(),
			lastModified: report.updatedAt ?? report.createdAt ?? undefined,
			changeFrequency: "daily" as const,
			priority: 0.7,
		})),
		...announcements.map((announcement) => ({
			url: new URL(`/announcements/${announcement.id}`, siteUrl).toString(),
			lastModified:
				announcement.publishedAt ?? announcement.createdAt ?? undefined,
			changeFrequency: "weekly" as const,
			priority: 0.6,
		})),
	];
}
