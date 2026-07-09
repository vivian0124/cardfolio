"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "總覽", icon: "📊" },
  { href: "/purchases/new", label: "記一筆", icon: "➕" },
  { href: "/items", label: "庫存", icon: "🗂️" },
  { href: "/collection", label: "圖鑑", icon: "📚" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-black/80">
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
                active
                  ? "font-semibold text-foreground"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
