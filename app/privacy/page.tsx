import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
	title: "プライバシーポリシー | AntiFraud",
	description:
		"AntiFraud（ネット詐欺通報・検索プラットフォーム）のプライバシーポリシーです。",
};

const PRIVACY_SECTIONS = [
	{
		title: "1. 取得する情報",
		items: [
			"お問い合わせ時に入力された氏名、メールアドレス、本文などの情報",
			"通報投稿時に入力された詐欺関連情報",
			"アクセスログ、利用端末情報、Cookie等の技術情報",
		],
	},
	{
		title: "2. 利用目的",
		items: [
			"本サービスの提供、運営、品質改善のため",
			"不正利用の防止および調査のため",
			"お問い合わせへの対応および重要なお知らせの通知のため",
		],
	},
	{
		title: "3. 第三者提供",
		items: [
			"法令に基づく場合を除き、本人の同意なく個人情報を第三者に提供しません。",
			"業務委託先に必要な範囲で情報を提供する場合があります。その際は適切な監督を行います。",
		],
	},
	{
		title: "4. 安全管理措置",
		items: [
			"個人情報への不正アクセス、漏えい、改ざん、滅失を防止するために必要かつ適切な安全管理措置を講じます。",
		],
	},
	{
		title: "5. 保有期間",
		items: [
			"取得した情報は、利用目的の達成に必要な期間または法令で定められた期間保管します。",
		],
	},
	{
		title: "6. 開示・訂正・削除等の請求",
		items: [
			"本人から自己情報の開示、訂正、削除、利用停止等の請求があった場合、法令に従い適切に対応します。",
		],
	},
	{
		title: "7. お問い合わせ窓口",
		items: [
			"本ポリシーに関するお問い合わせは、/contact ページよりご連絡ください。",
		],
	},
	{
		title: "8. 改定",
		items: [
			"本ポリシーの内容は、必要に応じて変更することがあります。重要な変更は本サービス上で告知します。",
		],
	},
];

export default function PrivacyPage() {
	return (
		<div className="container py-12 space-y-8">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold tracking-tight">
					プライバシーポリシー
				</h1>
				<p className="text-sm text-muted-foreground">
					最終更新日: 2026年2月19日
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>個人情報保護方針</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6 text-sm leading-7 text-muted-foreground">
					{PRIVACY_SECTIONS.map((section) => (
						<section key={section.title} className="space-y-2">
							<h2 className="text-base font-semibold text-foreground">
								{section.title}
							</h2>
							<ul className="list-disc pl-5 space-y-1">
								{section.items.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						</section>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
