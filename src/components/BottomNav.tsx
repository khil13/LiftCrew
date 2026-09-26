"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/types";

const ICONS: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  jobs: "M4 7h16v12H4zM9 7V4h6v3",
  messages: "M4 5h16v11H8l-4 4z",
  notifications: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20h4",
  settings: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 12h2M18 12h2M12 4v2M12 18v2",
  admin: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z",
};

export default function BottomNav({ role, unread = 0 }: { role: UserRole; unread?: number }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/home", label: "Home", icon: "home" },
    role === "admin"
      ? { href: "/admin", label: "Admin", icon: "admin" }
      : { href: "/jobs", label: role === "helper" ? "Find jobs" : "My jobs", icon: "jobs" },
    { href: "/messages", label: "Messages", icon: "messages" },
    { href: "/notifications", label: "Alerts", icon: "notifications" },
    { href: "/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  active ? "text-brand-600" : "text-slate-500"
                }`}
              >
                <span className="relative">
                  {t.icon === "notifications" && unread > 0 && (
                    <span className="absolute -right-1.5 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-4 text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d={ICONS[t.icon]} strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
