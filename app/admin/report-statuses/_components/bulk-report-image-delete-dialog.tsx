"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type BulkReportImageDeleteDialogProps = {
	reportIds: string[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type BulkImagesResponse = {
	reports?: Array<{
		id: string;
		title: string | null;
		url: string;
		images: Array<{
			id: string;
			previewUrl: string | null;
			displayOrder: number | null;
		}>;
	}>;
	error?: string;
};

type DeleteResponse = {
	deletedCount?: number;
	error?: string;
};

export function BulkReportImageDeleteDialog({
	reportIds,
	open,
	onOpenChange,
}: BulkReportImageDeleteDialogProps) {
	const router = useRouter();
	const [reports, setReports] = React.useState<
		NonNullable<BulkImagesResponse["reports"]>
	>([]);
	const [isLoadingImages, setIsLoadingImages] = React.useState(false);
	const [isDeleting, setIsDeleting] = React.useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
	const [selectedImageIds, setSelectedImageIds] = React.useState<string[]>([]);
	const selectAllRef = React.useRef<HTMLInputElement | null>(null);
	const [isRefreshing, startTransition] = React.useTransition();
	const isPending = isLoadingImages || isDeleting || isRefreshing;
	const allImageIds = reports.flatMap((report) =>
		report.images.map((image) => image.id),
	);
	const allSelected =
		allImageIds.length > 0 && selectedImageIds.length === allImageIds.length;
	const someSelected =
		selectedImageIds.length > 0 && selectedImageIds.length < allImageIds.length;

	const loadImages = React.useCallback(
		async (signal?: AbortSignal) => {
			if (reportIds.length === 0) {
				setReports([]);
				setSelectedImageIds([]);
				return;
			}

			const searchParams = new URLSearchParams();
			for (const reportId of reportIds) {
				searchParams.append("reportIds", reportId);
			}

			setIsLoadingImages(true);

			try {
				const response = await fetch(
					`/api/admin/reports/images/bulk?${searchParams.toString()}`,
					{
						cache: "no-store",
						signal,
					},
				);
				const payload = (await response
					.json()
					.catch(() => null)) as BulkImagesResponse | null;

				if (!response.ok) {
					if (response.status === 401) {
						router.push("/admin/login");
						return;
					}

					throw new Error(payload?.error || "画像一覧の取得に失敗しました。");
				}

				if (signal?.aborted) {
					return;
				}

				setReports(payload?.reports ?? []);
				setSelectedImageIds([]);
			} catch (error) {
				if (signal?.aborted) {
					return;
				}

				console.error(error);
				toast.error(
					error instanceof Error
						? error.message
						: "画像一覧の取得に失敗しました。",
				);
			} finally {
				if (!signal?.aborted) {
					setIsLoadingImages(false);
				}
			}
		},
		[reportIds, router],
	);

	React.useEffect(() => {
		if (!selectAllRef.current) {
			return;
		}

		selectAllRef.current.indeterminate = someSelected;
	}, [someSelected]);

	React.useEffect(() => {
		if (!open) {
			return;
		}

		const abortController = new AbortController();
		void loadImages(abortController.signal);

		return () => {
			abortController.abort();
		};
	}, [loadImages, open]);

	function toggleAllImages(checked: boolean) {
		setSelectedImageIds(checked ? allImageIds : []);
	}

	function toggleImageSelection(imageId: string, checked: boolean) {
		setSelectedImageIds((current) => {
			if (checked) {
				return current.includes(imageId) ? current : [...current, imageId];
			}

			return current.filter((id) => id !== imageId);
		});
	}

	const handleDeleteSelected = React.useCallback(async () => {
		if (selectedImageIds.length === 0) {
			toast.error("削除する画像を選択してください。");
			return;
		}

		const deletingIds = [...selectedImageIds];
		setIsDeleting(true);

		try {
			const response = await fetch("/api/admin/reports/images/bulk", {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					imageIds: deletingIds,
				}),
			});
			const payload = (await response
				.json()
				.catch(() => null)) as DeleteResponse | null;

			if (!response.ok) {
				if (response.status === 401) {
					router.push("/admin/login");
					return;
				}

				throw new Error(payload?.error || "画像の削除に失敗しました。");
			}

			const deletedIds = new Set(deletingIds);
			setReports((current) =>
				current.map((report) => ({
					...report,
					images: report.images.filter((image) => !deletedIds.has(image.id)),
				})),
			);
			setSelectedImageIds([]);
			setIsDeleteDialogOpen(false);
			toast.success(
				`${payload?.deletedCount ?? deletingIds.length}枚の画像を削除しました。`,
			);
			startTransition(() => {
				router.refresh();
			});
		} catch (error) {
			console.error(error);
			toast.error(
				error instanceof Error ? error.message : "画像の削除に失敗しました。",
			);
		} finally {
			setIsDeleting(false);
		}
	}, [router, selectedImageIds]);

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && isPending) {
					return;
				}

				onOpenChange(nextOpen);
				if (!nextOpen) {
					setIsDeleteDialogOpen(false);
					setSelectedImageIds([]);
				}
			}}
		>
			<DialogContent className="sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>選択した通報の画像を一括削除</DialogTitle>
					<DialogDescription>
						一覧で選択中の通報から、不要な画像だけをまとめて削除できます。
					</DialogDescription>
				</DialogHeader>

				<div className="relative space-y-4">
					{isDeleting ? (
						<div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
							<div className="inline-flex items-center rounded-full border bg-background px-4 py-2 text-sm font-medium shadow-sm">
								<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
								画像を削除しています...
							</div>
						</div>
					) : null}

					<div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="space-y-1">
							<p className="text-sm font-medium">
								{reportIds.length}件の通報を対象にしています
							</p>
							<p className="text-xs text-muted-foreground">
								合計 {allImageIds.length}枚の画像から削除対象を選べます。
							</p>
						</div>
						{allImageIds.length > 0 ? (
							<div className="flex flex-wrap items-center gap-2">
								<label className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-2 text-xs font-medium ring-1 ring-border/50">
									<input
										ref={selectAllRef}
										type="checkbox"
										checked={allSelected}
										onChange={(event) => toggleAllImages(event.target.checked)}
										disabled={isPending}
										className="h-4 w-4 rounded border-input"
									/>
									すべて選択
								</label>
								<AlertDialog
									open={isDeleteDialogOpen}
									onOpenChange={(nextOpen) => {
										if (isDeleting) {
											return;
										}

										setIsDeleteDialogOpen(nextOpen);
									}}
								>
									<AlertDialogTrigger asChild>
										<Button
											type="button"
											size="sm"
											variant="destructive"
											disabled={isPending || selectedImageIds.length === 0}
										>
											<Trash2 className="mr-2 h-4 w-4" />
											選択した画像を削除
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent size="sm">
										<AlertDialogHeader>
											<AlertDialogTitle>
												選択した画像を削除しますか？
											</AlertDialogTitle>
											<AlertDialogDescription>
												{selectedImageIds.length}
												枚の画像を削除します。対象の通報詳細ページからも非表示になり、この操作は元に戻せません。
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel disabled={isDeleting}>
												キャンセル
											</AlertDialogCancel>
											<AlertDialogAction
												type="button"
												variant="destructive"
												onClick={(event) => {
													event.preventDefault();
													void handleDeleteSelected();
												}}
												disabled={isDeleting}
											>
												{isDeleting ? (
													<>
														<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
														削除中...
													</>
												) : (
													"削除する"
												)}
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
						) : null}
					</div>

					{isLoadingImages ? (
						<div className="flex items-center justify-center rounded-lg border bg-muted/20 px-4 py-10 text-sm text-muted-foreground">
							<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
							画像を読み込んでいます...
						</div>
					) : reports.length === 0 ? (
						<div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
							対象の通報が見つかりませんでした。
						</div>
					) : (
						<div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
							{reports.map((report) => {
								const displayTitle =
									report.title?.trim() || "（タイトル未設定）";

								return (
									<section key={report.id} className="rounded-xl border p-4">
										<div className="space-y-1">
											<p className="font-medium">{displayTitle}</p>
											<p className="break-all text-xs text-muted-foreground">
												{report.url}
											</p>
											<p className="text-xs text-muted-foreground">
												登録画像: {report.images.length}枚
											</p>
										</div>

										{report.images.length > 0 ? (
											<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
												{report.images.map((image, index) => {
													const isSelected = selectedImageIds.includes(
														image.id,
													);

													return (
														<div
															key={image.id}
															className={cn(
																"rounded-lg border bg-muted/20 p-3 transition",
																isSelected
																	? "ring-2 ring-primary/45"
																	: "ring-1 ring-transparent",
															)}
														>
															<div className="flex items-center justify-between gap-3">
																<label className="inline-flex items-center gap-2 text-xs font-medium">
																	<input
																		type="checkbox"
																		checked={isSelected}
																		onChange={(event) =>
																			toggleImageSelection(
																				image.id,
																				event.target.checked,
																			)
																		}
																		disabled={isPending}
																		className="h-4 w-4 rounded border-input"
																	/>
																	削除対象に含める
																</label>
																<p className="text-xs text-muted-foreground">
																	画像{" "}
																	{image.displayOrder !== null
																		? image.displayOrder + 1
																		: index + 1}
																</p>
															</div>
															<div className="mt-3 overflow-hidden rounded-md border bg-muted/40">
																{image.previewUrl ? (
																	<Image
																		src={image.previewUrl}
																		alt={`${displayTitle} の証拠画像 ${index + 1}`}
																		width={960}
																		height={720}
																		className="h-36 w-full object-cover"
																	/>
																) : (
																	<div className="flex h-36 items-center justify-center px-4 text-center text-xs text-muted-foreground">
																		この画像はプレビューできませんが、削除は可能です。
																	</div>
																)}
															</div>
														</div>
													);
												})}
											</div>
										) : (
											<div className="mt-4 rounded-lg border border-dashed bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
												この通報には現在画像がありません。
											</div>
										)}
									</section>
								);
							})}
						</div>
					)}
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						閉じる
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
