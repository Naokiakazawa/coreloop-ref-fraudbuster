"use client";

import {
	Check,
	ChevronsUpDown,
	ImagePlus,
	MoreHorizontal,
	Trash2,
} from "lucide-react";
import { useId, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportImageUploadDialog } from "./report-image-upload-dialog";

type ReportStatusOption = {
	id: number;
	label: string;
};

type ReportActionsMenuProps = {
	reportId: string;
	reportTitle: string | null;
	reportUrl: string;
	existingImageCount: number;
	currentImages: Array<{
		id: string;
		previewUrl: string | null;
		displayOrder: number | null;
	}>;
	reportStatuses: ReportStatusOption[];
	selectedStatusId: number | string;
};

export function ReportActionsMenu({
	reportId,
	reportTitle,
	reportUrl,
	existingImageCount,
	currentImages,
	reportStatuses,
	selectedStatusId,
}: ReportActionsMenuProps) {
	const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const deleteFormId = useId();
	const selectedStatusValue = String(selectedStatusId);
	const displayTitle = reportTitle || reportUrl;

	return (
		<>
			<DropdownMenu modal={false}>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						className="ml-auto"
						aria-label="操作メニューを開く"
					>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-56">
					<DropdownMenuSub>
						<DropdownMenuSubTrigger disabled={reportStatuses.length === 0}>
							<ChevronsUpDown className="h-4 w-4" />
							ステータス変更
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="w-56">
							{reportStatuses.map((status) => {
								const formId = `report-status-${reportId}-${status.id}`;
								const isCurrent = String(status.id) === selectedStatusValue;

								return (
									<form
										key={status.id}
										id={formId}
										action={`/api/admin/reports/${reportId}/status`}
										method="post"
									>
										<input type="hidden" name="statusId" value={status.id} />
										<DropdownMenuItem
											disabled={isCurrent}
											onSelect={(event) => {
												event.preventDefault();
												if (isCurrent) {
													return;
												}
												const form = document.getElementById(formId);
												if (form instanceof HTMLFormElement) {
													form.requestSubmit();
												}
											}}
										>
											<Check
												className={isCurrent ? "opacity-100" : "opacity-0"}
											/>
											{status.label}
										</DropdownMenuItem>
									</form>
								);
							})}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
					<DropdownMenuItem
						onSelect={(event) => {
							event.preventDefault();
							setIsImageDialogOpen(true);
						}}
					>
						<ImagePlus className="h-4 w-4" />
						画像を追加
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						onSelect={(event) => {
							event.preventDefault();
							setIsDeleteDialogOpen(true);
						}}
					>
						<Trash2 className="h-4 w-4" />
						通報を削除
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<ReportImageUploadDialog
				reportId={reportId}
				reportTitle={reportTitle}
				reportUrl={reportUrl}
				existingImageCount={existingImageCount}
				currentImages={currentImages}
				open={isImageDialogOpen}
				onOpenChange={setIsImageDialogOpen}
				hideTrigger
			/>

			<AlertDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
			>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>この通報を削除しますか？</AlertDialogTitle>
						<AlertDialogDescription>
							{displayTitle}{" "}
							を削除します。関連する画像とタイムラインも削除され、この操作は元に戻せません。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<form
						id={deleteFormId}
						action={`/api/admin/reports/${reportId}`}
						method="post"
					/>
					<AlertDialogFooter>
						<AlertDialogCancel>キャンセル</AlertDialogCancel>
						<AlertDialogAction
							form={deleteFormId}
							type="submit"
							variant="destructive"
						>
							削除する
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
