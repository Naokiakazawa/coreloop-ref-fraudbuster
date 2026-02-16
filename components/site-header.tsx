"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { usePathname } from "next/navigation";

import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
	{ href: "/", label: "ホーム" },
	{ href: "/statistics", label: "統計" },
	{ href: "/announcements", label: "お知らせ" },
];

export function SiteHeader() {
	const pathname = usePathname();

	const isActive = (href: string) => {
		if (href === "/") return pathname === "/";
		return pathname.startsWith(href);
	};

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
			<div className="container flex h-16 items-center justify-between">
				<div className="flex items-center gap-2">
					<Link href="/" className="flex items-center space-x-2">
						<ShieldAlert className="h-6 w-6 text-primary" />
						<span className="inline-block font-bold text-xl tracking-tight">
							AntiFraud
						</span>
					</Link>
					<nav className="ml-6 hidden items-center gap-6 text-sm font-medium md:flex">
						{NAV_ITEMS.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"transition-colors hover:text-foreground/80",
									isActive(item.href)
										? "font-bold text-foreground"
										: "text-foreground/60",
								)}
							>
								{item.label}
							</Link>
						))}
					</nav>
				</div>
				<div className="flex items-center gap-4">
					<div className="hidden sm:block">
						<Link href="/report/new">
							<Button variant="default" className="rounded-full px-6">
								通報する
							</Button>
						</Link>
					</div>
					<ModeToggle />
				</div>
			</div>
		</header>
	);
}
