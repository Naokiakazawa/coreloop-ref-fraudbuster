import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
	title: "利用規約 | AntiFraud",
	description:
		"AntiFraud（ネット詐欺通報・検索プラットフォーム）の利用規約です。",
};

const TERMS_SECTIONS = [
	{
		title: "第1条（適用）",
		paragraphs: [
			"本規約は、AntiFraud（以下「本サービス」）の提供条件および利用者と運営者との間の権利義務関係を定めるものです。",
			"利用者は、本規約に同意したうえで本サービスを利用するものとします。",
		],
	},
	{
		title: "第2条（禁止事項）",
		paragraphs: [
			"利用者は、本サービスの利用にあたり、法令または公序良俗に違反する行為、虚偽情報の投稿、第三者の権利侵害行為を行ってはなりません。",
			"運営者は、禁止事項に該当すると判断した場合、事前通知なく投稿の削除や利用制限を行うことがあります。",
		],
	},
	{
		title: "第3条（投稿情報の取り扱い）",
		paragraphs: [
			"利用者が投稿した情報は、本サービス上で公開される場合があります。",
			"投稿内容は、正確性・適法性を保証するものではなく、利用者自身の責任で投稿するものとします。",
		],
	},
	{
		title: "第4条（免責事項）",
		paragraphs: [
			"運営者は、本サービスに掲載される情報の正確性、完全性、有用性を保証しません。",
			"本サービスの利用により利用者または第三者に生じた損害について、運営者は故意または重過失がある場合を除き責任を負いません。",
		],
	},
	{
		title: "第5条（サービス内容の変更・停止）",
		paragraphs: [
			"運営者は、保守、障害対応、その他運営上の必要がある場合、事前通知なく本サービスの全部または一部を変更・停止できるものとします。",
		],
	},
	{
		title: "第6条（規約の変更）",
		paragraphs: [
			"運営者は、必要と判断した場合、本規約を変更できます。変更後の規約は、本サービス上に掲示した時点で効力を生じます。",
		],
	},
	{
		title: "第7条（準拠法・管轄）",
		paragraphs: [
			"本規約は日本法に準拠し、本サービスに関して紛争が生じた場合には、運営者所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。",
		],
	},
];

export default function TermsPage() {
	return (
		<div className="container py-12 space-y-8">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold tracking-tight">利用規約</h1>
				<p className="text-sm text-muted-foreground">
					最終更新日: 2026年2月19日
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>AntiFraud 利用規約</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6 text-sm leading-7 text-muted-foreground">
					{TERMS_SECTIONS.map((section) => (
						<section key={section.title} className="space-y-2">
							<h2 className="text-base font-semibold text-foreground">
								{section.title}
							</h2>
							{section.paragraphs.map((paragraph) => (
								<p key={paragraph}>{paragraph}</p>
							))}
						</section>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
