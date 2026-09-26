"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/helpers", label: "Helpers" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/flags", label: "Flags" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 text-sm">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full px-3 py-1.5 font-medium ${
                  active ? "bg-brand-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
