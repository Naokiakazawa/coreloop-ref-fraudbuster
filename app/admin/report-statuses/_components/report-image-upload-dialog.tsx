"use client";

import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
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
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	ALLOWED_REPORT_IMAGE_FORMATS_LABEL,
	formatReportImageFileSize,
	MAX_REPORT_IMAGE_FILE_COUNT,
	MAX_REPORT_IMAGE_FILE_SIZE_BYTES,
	REPORT_IMAGE_INPUT_ACCEPT,
} from "@/lib/report-image-upload";
import { cn } from "@/lib/utils";

type ReportImageUploadDialogProps = {
	reportId: string;
	reportTitle: string | null;
	reportUrl: string;
	existingImageCount: number;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	hideTrigger?: boolean;
};

type UploadResponse = {
	error?: string;
	uploadedCount?: number;
	totalImageCount?: number;
};

type DeleteResponse = {
	deletedCount?: number;
	error?: string;
};

type CurrentImagesResponse = {
	images?: Array<{
		id: string;
		previewUrl: string | null;
		displayOrder: number | null;
	}>;
	error?: string;
};

export function ReportImageUploadDialog({
	reportId,
	reportTitle,
	reportUrl,
	existingImageCount,
	open: openProp,
	onOpenChange,
	hideTrigger = false,
}: ReportImageUploadDialogProps) {
	const router = useRouter();
	const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
	const [files, setFiles] = React.useState<File[]>([]);
	const [isUploading, setIsUploading] = React.useState(false);
	const [isDeleting, setIsDeleting] = React.useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
	const [isLoadingImages, setIsLoadingImages] = React.useState(false);
	const [hasLoadedImages, setHasLoadedImages] = React.useState(false);
	const [currentImages, setCurrentImages] = React.useState<
		NonNullable<CurrentImagesResponse["images"]>
	>([]);
	const [selectedImageIds, setSelectedImageIds] = React.useState<string[]>([]);
	const selectAllRef = React.useRef<HTMLInputElement | null>(null);
	const [isRefreshing, startTransition] = React.useTransition();
	const isMutating = isUploading || isDeleting;
	const isPending = isMutating || isRefreshing;
	const displayTitle = reportTitle?.trim() || "（タイトル未設定）";
	const inputId = `report-image-upload-${reportId}`;
	const open = openProp ?? uncontrolledOpen;
	const allImageIds = currentImages.map((image) => image.id);
	const allCurrentSelected =
		allImageIds.length > 0 && selectedImageIds.length === allImageIds.length;
	const someCurrentSelected =
		selectedImageIds.length > 0 && selectedImageIds.length < allImageIds.length;

	const setOpen = React.useCallback(
		(nextOpen: boolean) => {
			if (openProp === undefined) {
				setUncontrolledOpen(nextOpen);
			}

			onOpenChange?.(nextOpen);
		},
		[onOpenChange, openProp],
	);

	const resetSelection = React.useCallback(() => {
		setFiles([]);
		setSelectedImageIds([]);
	}, []);

	const loadCurrentImages = React.useCallback(
		async (signal?: AbortSignal) => {
			setIsLoadingImages(true);

			try {
				const response = await fetch(`/api/admin/reports/${reportId}/images`, {
					cache: "no-store",
					signal,
				});
				const payload = (await response
					.json()
					.catch(() => null)) as CurrentImagesResponse | null;

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

				setCurrentImages(payload?.images ?? []);
				setSelectedImageIds([]);
				setHasLoadedImages(true);
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
		[reportId, router],
	);

	React.useEffect(() => {
		if (!selectAllRef.current) {
			return;
		}

		selectAllRef.current.indeterminate = someCurrentSelected;
	}, [someCurrentSelected]);

	React.useEffect(() => {
		if (!open || hasLoadedImages) {
			return;
		}

		const abortController = new AbortController();
		void loadCurrentImages(abortController.signal);

		return () => {
			abortController.abort();
		};
	}, [hasLoadedImages, loadCurrentImages, open]);

	const handleOpenChange = React.useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen && isPending) {
				return;
			}

			setOpen(nextOpen);
			if (!nextOpen) {
				resetSelection();
				setIsDeleteDialogOpen(false);
			}
		},
		[isPending, resetSelection, setOpen],
	);

	const handleFileChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const selectedFiles = Array.from(event.target.files ?? []).slice(
				0,
				MAX_REPORT_IMAGE_FILE_COUNT,
			);
			setFiles(selectedFiles);
		},
		[],
	);

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

	const handleSubmit = React.useCallback(
		async (event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();

			if (files.length === 0) {
				toast.error("アップロードする画像を選択してください。");
				return;
			}

			const formData = new FormData();
			for (const file of files) {
				formData.append("files", file);
			}

			setIsUploading(true);

			try {
				const response = await fetch(`/api/admin/reports/${reportId}/images`, {
					method: "POST",
					body: formData,
				});
				const payload = (await response
					.json()
					.catch(() => null)) as UploadResponse | null;

				if (!response.ok) {
					if (response.status === 401) {
						router.push("/admin/login");
					}
					throw new Error(
						payload?.error || "画像のアップロードに失敗しました。",
					);
				}

				const uploadedCount = payload?.uploadedCount ?? files.length;
				const totalImageCount =
					payload?.totalImageCount ?? existingImageCount + uploadedCount;

				toast.success(
					`${uploadedCount}枚の画像を追加しました。現在の登録画像は${totalImageCount}枚です。`,
				);
				resetSelection();
				setCurrentImages([]);
				setHasLoadedImages(false);
				setOpen(false);
				startTransition(() => {
					router.refresh();
				});
			} catch (error) {
				console.error(error);
				toast.error(
					error instanceof Error
						? error.message
						: "画像のアップロードに失敗しました。",
				);
			} finally {
				setIsUploading(false);
			}
		},
		[existingImageCount, files, reportId, resetSelection, router, setOpen],
	);

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
			setCurrentImages((current) =>
				current.filter((image) => !deletedIds.has(image.id)),
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
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{hideTrigger ? null : (
				<DialogTrigger asChild>
					<Button type="button" size="sm" variant="outline">
						<ImagePlus className="mr-2 h-4 w-4" />
						画像を追加
					</Button>
				</DialogTrigger>
			)}
			<DialogContent>
				<DialogHeader>
					<DialogTitle>通報画像を追加</DialogTitle>
					<DialogDescription>
						対象の通報にスクリーンショットなどの画像を追加します。
					</DialogDescription>
				</DialogHeader>

				<div className="relative space-y-4">
					{isMutating ? (
						<div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
							<div className="inline-flex items-center rounded-full border bg-background px-4 py-2 text-sm font-medium shadow-sm">
								<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
								{isUploading
									? "画像を追加しています..."
									: "画像を削除しています..."}
							</div>
						</div>
					) : null}

					<div className="rounded-lg border bg-muted/30 p-4 text-sm">
						<p className="font-medium">{displayTitle}</p>
						<p className="mt-1 break-all text-xs text-muted-foreground">
							{reportUrl}
						</p>
						<p className="mt-3 text-xs text-muted-foreground">
							現在の登録画像: {existingImageCount}枚
						</p>
					</div>

					<div className="space-y-3">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div className="space-y-1">
								<p className="text-sm font-medium">現在の証拠画像</p>
								<p className="text-xs text-muted-foreground">
									削除したい画像を選択して、まとめて削除できます。
								</p>
							</div>
							{currentImages.length > 0 ? (
								<div className="flex flex-wrap items-center gap-2">
									<label className="inline-flex items-center gap-2 rounded-full bg-muted/20 px-3 py-2 text-xs font-medium">
										<input
											ref={selectAllRef}
											type="checkbox"
											checked={allCurrentSelected}
											onChange={(event) =>
												toggleAllImages(event.target.checked)
											}
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
													枚の画像を削除します。削除した画像は公開側の通報詳細からも非表示になり、この操作は元に戻せません。
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
							<div className="flex items-center justify-center rounded-lg border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
								<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
								画像を読み込んでいます...
							</div>
						) : currentImages.length > 0 ? (
							<div className="grid gap-3 sm:grid-cols-2">
								{currentImages.map((image, index) => {
									const isSelected = selectedImageIds.includes(image.id);

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
							<div className="rounded-lg border border-dashed bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
								証拠画像が追加されたらここに表示されます。下のフォームからスクリーンショットなどを追加すると、この欄で確認と削除ができます。
							</div>
						)}
					</div>

					<form className="space-y-4" onSubmit={handleSubmit}>
						<div className="space-y-2">
							<Label htmlFor={inputId}>アップロードする画像</Label>
							<Input
								id={inputId}
								type="file"
								multiple
								accept={REPORT_IMAGE_INPUT_ACCEPT}
								onChange={handleFileChange}
								disabled={isPending}
							/>
							<p className="text-xs text-muted-foreground">
								{ALLOWED_REPORT_IMAGE_FORMATS_LABEL}{" "}
								を利用できます。1回の送信は最大
								{MAX_REPORT_IMAGE_FILE_COUNT}枚、各ファイルは
								{Math.floor(MAX_REPORT_IMAGE_FILE_SIZE_BYTES / 1024 / 1024)}
								MB以下です。追加した画像は公開側の通報詳細にも表示されます。
							</p>
						</div>

						{files.length > 0 ? (
							<div className="rounded-lg border p-3">
								<p className="text-sm font-medium">
									選択中の画像 {files.length}枚
								</p>
								<div className="mt-2 space-y-2">
									{files.map((file) => (
										<div
											key={`${file.name}-${file.lastModified}`}
											className="flex items-center justify-between gap-3 text-sm"
										>
											<span className="truncate">{file.name}</span>
											<span className="shrink-0 text-xs text-muted-foreground">
												{formatReportImageFileSize(file.size)}
											</span>
										</div>
									))}
								</div>
							</div>
						) : null}

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
								disabled={isPending}
							>
								キャンセル
							</Button>
							<Button type="submit" disabled={isPending || files.length === 0}>
								{isUploading ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
										アップロード中...
									</>
								) : (
									"画像を追加"
								)}
							</Button>
						</DialogFooter>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
