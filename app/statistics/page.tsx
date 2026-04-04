"use client";

import { Activity, BarChart3 } from "lucide-react";
import * as React from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
	StatisticsBreakdownItem,
	StatisticsResponse,
} from "@/lib/types/api";

const FALLBACK_TREND_DATA = [
	{ date: "2026/02/08", count: 42 },
	{ date: "2026/02/09", count: 56 },
	{ date: "2026/02/10", count: 48 },
	{ date: "2026/02/11", count: 72 },
	{ date: "2026/02/12", count: 64 },
	{ date: "2026/02/13", count: 88 },
	{ date: "2026/02/14", count: 94 },
];

function ChartTooltipStyle() {
	return {
		backgroundColor: "var(--card)",
		borderRadius: "var(--radius)",
		border: "1px solid var(--border)",
	};
}

type StatisticsRange = "all" | "week";

export default function StatisticsPage() {
	const [selectedRange, setSelectedRange] =
		React.useState<StatisticsRange>("all");
	const [stats, setStats] = React.useState<StatisticsResponse | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [isRefreshing, setIsRefreshing] = React.useState(false);
	const [hasError, setHasError] = React.useState(false);
	const hasLoadedOnceRef = React.useRef(false);

	React.useEffect(() => {
		const controller = new AbortController();

		async function fetchStats() {
			if (hasLoadedOnceRef.current) {
				setIsRefreshing(true);
			} else {
				setLoading(true);
			}

			try {
				const url =
					selectedRange === "week"
						? "/api/statistics?days=7"
						: "/api/statistics";
				const res = await fetch(url, {
					cache: "no-store",
					signal: controller.signal,
				});
				if (!res.ok) {
					throw new Error(`Failed to fetch statistics: ${res.status}`);
				}

				const data: StatisticsResponse = await res.json();
				setStats(data);
				setHasError(false);
				hasLoadedOnceRef.current = true;
			} catch (error) {
				if (controller.signal.aborted) return;
				console.error("Failed to fetch statistics:", error);
				setHasError(true);
			} finally {
				if (!controller.signal.aborted) {
					setLoading(false);
					setIsRefreshing(false);
				}
			}
		}

		void fetchStats();
		return () => controller.abort();
	}, [selectedRange]);

	const trendData = stats?.trend.length ? stats.trend : FALLBACK_TREND_DATA;
	const cumulativeTrendData = React.useMemo(() => {
		let runningTotal = 0;

		return trendData.map((item) => {
			runningTotal += item.count;
			return {
				...item,
				cumulativeCount: runningTotal,
			};
		});
	}, [trendData]);
	const platformData: StatisticsBreakdownItem[] =
		stats?.breakdown.platform ?? [];
	const statusData: StatisticsBreakdownItem[] = stats?.breakdown.status ?? [];
	const rangeLabel = selectedRange === "all" ? "全期間" : "過去1週間";

	const updatedAtLabel = React.useMemo(() => {
		if (!stats?.updatedAt) return "データ未取得";
		const date = new Date(stats.updatedAt);
		if (Number.isNaN(date.getTime())) return "データ未取得";
		return date.toLocaleString("ja-JP");
	}, [stats?.updatedAt]);

	if (loading) {
		return (
			<div className="container py-12 space-y-10">
				<div className="space-y-2">
					<Skeleton className="h-10 w-48" />
					<Skeleton className="h-4 w-96" />
				</div>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					{[1, 2].map((i) => (
						<Skeleton key={i} className="h-32 w-full rounded-2xl" />
					))}
				</div>
				<Skeleton className="h-[640px] w-full rounded-2xl" />
				<Skeleton className="h-[300px] w-full rounded-2xl" />
			</div>
		);
	}

	return (
		<div className="container py-12 space-y-12">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold tracking-tight">詐欺トレンド統計</h1>
				<p className="text-muted-foreground">
					プラットフォームに集約された情報を元に、現在のネット詐欺の傾向を可視化しています。
				</p>
			</div>

			{hasError ? (
				<Card className="border-destructive/30 bg-destructive/5">
					<CardContent className="py-6 text-sm text-destructive">
						統計データの取得に失敗しました。時間をおいて再度お試しください。
					</CardContent>
				</Card>
			) : null}

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<Card className="border-primary/10 bg-primary/5">
					<CardHeader className="pb-2">
						<CardDescription className="text-xs font-bold tracking-wider uppercase">
							累計通報件数
						</CardDescription>
						<CardTitle className="text-3xl font-black">
							{stats?.summary.totalReports.toLocaleString() ?? "0"}
						</CardTitle>
					</CardHeader>
					<CardContent />
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription className="text-xs font-bold tracking-wider uppercase">
							本日の通報数
						</CardDescription>
						<CardTitle className="text-3xl font-black">
							{stats?.summary.todayReports ?? 0}
						</CardTitle>
					</CardHeader>
					<CardContent />
				</Card>
			</div>

			<div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
				<Card className="lg:col-span-2">
					<CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
						<div className="space-y-1.5">
							<CardTitle className="flex items-center gap-2">
								<Activity className="h-5 w-5 text-primary" />
								通報件数の推移
							</CardTitle>
						</div>
						<Tabs
							value={selectedRange}
							onValueChange={(value) =>
								setSelectedRange(value as StatisticsRange)
							}
							className="w-full md:w-auto"
						>
							<TabsList className="grid w-full grid-cols-2 md:w-auto">
								<TabsTrigger value="all" disabled={isRefreshing}>
									全期間
								</TabsTrigger>
								<TabsTrigger value="week" disabled={isRefreshing}>
									過去1週間
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</CardHeader>
					<CardContent className="space-y-8">
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-semibold">累積通報件数</p>
									<p className="text-xs text-muted-foreground">
										{rangeLabel}の累積推移
									</p>
								</div>
								<Badge variant="secondary">累積</Badge>
							</div>
							<div className="h-[220px]">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={cumulativeTrendData}>
										<defs>
											<linearGradient
												id="cumulativeTrendFill"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor="var(--primary)"
													stopOpacity={0.28}
												/>
												<stop
													offset="95%"
													stopColor="var(--primary)"
													stopOpacity={0.04}
												/>
											</linearGradient>
										</defs>
										<CartesianGrid
											strokeDasharray="3 3"
											vertical={false}
											stroke="oklch(0.9 0.02 240)"
										/>
										<XAxis
											dataKey="date"
											stroke="oklch(0.5 0.05 240)"
											fontSize={12}
											tickLine={false}
											axisLine={false}
										/>
										<YAxis
											stroke="oklch(0.5 0.05 240)"
											fontSize={12}
											tickLine={false}
											axisLine={false}
										/>
										<Tooltip
											contentStyle={ChartTooltipStyle()}
											itemStyle={{ color: "var(--primary)" }}
										/>
										<Area
											type="monotone"
											dataKey="cumulativeCount"
											name="累積通報件数"
											stroke="var(--primary)"
											strokeWidth={3}
											fill="url(#cumulativeTrendFill)"
											dot={{
												r: 4,
												fill: "var(--primary)",
												strokeWidth: 2,
												stroke: "var(--card)",
											}}
											activeDot={{ r: 6, strokeWidth: 0 }}
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
						</div>

						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-semibold">日別通報件数</p>
									<p className="text-xs text-muted-foreground">
										{rangeLabel}の日別件数
									</p>
								</div>
								<Badge variant="outline">日別</Badge>
							</div>
							<div className="h-[260px]">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={trendData}>
										<CartesianGrid
											strokeDasharray="3 3"
											vertical={false}
											stroke="oklch(0.9 0.02 240)"
										/>
										<XAxis
											dataKey="date"
											stroke="oklch(0.5 0.05 240)"
											fontSize={12}
											tickLine={false}
											axisLine={false}
										/>
										<YAxis
											stroke="oklch(0.5 0.05 240)"
											fontSize={12}
											tickLine={false}
											axisLine={false}
										/>
										<Tooltip
											contentStyle={ChartTooltipStyle()}
											itemStyle={{ color: "var(--primary)" }}
										/>
										<Line
											type="monotone"
											dataKey="count"
											name="日別通報件数"
											stroke="var(--primary)"
											strokeWidth={4}
											dot={{
												r: 6,
												fill: "var(--primary)",
												strokeWidth: 2,
												stroke: "var(--card)",
											}}
											activeDot={{ r: 8, strokeWidth: 0 }}
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<BarChart3 className="h-5 w-5 text-primary" />
							プラットフォーム別内訳
						</CardTitle>
					</CardHeader>
					<CardContent className="h-[300px]">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={platformData}>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									stroke="oklch(0.9 0.02 240)"
								/>
								<XAxis
									dataKey="label"
									stroke="oklch(0.5 0.05 240)"
									fontSize={12}
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									stroke="oklch(0.5 0.05 240)"
									fontSize={12}
									tickLine={false}
									axisLine={false}
								/>
								<Tooltip
									contentStyle={ChartTooltipStyle()}
									cursor={{ fill: "var(--muted)", opacity: 0.4 }}
								/>
								<Bar
									dataKey="count"
									fill="var(--primary)"
									radius={[4, 4, 0, 0]}
									barSize={40}
								/>
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>
			</div>

			<section className="space-y-6 rounded-3xl bg-muted/30 p-8 lg:p-12">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div className="space-y-1">
						<h2 className="text-2xl font-bold">データについて</h2>
						<p className="text-sm text-muted-foreground">
							統計情報はAPIルート経由で集計し、可視化しています。
						</p>
					</div>
					<Badge
						variant="outline"
						className="h-fit w-fit border-primary/20 bg-background px-4 py-2"
					>
						最終更新: {updatedAtLabel}
					</Badge>
				</div>
				{statusData.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{statusData.map((item) => (
							<Badge
								key={`${item.label}-${item.id ?? "null"}`}
								variant="secondary"
							>
								{item.label}: {item.count}
							</Badge>
						))}
					</div>
				) : null}
			</section>
		</div>
	);
}
