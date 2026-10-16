"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Garden", icon: "🌱" },
  { href: "/tasks", label: "Tasks", icon: "✅" },
  { href: "/shop", label: "Shop", icon: "🛒" },
  { href: "/impact", label: "Impact", icon: "🌍" },
  { href: "/data", label: "Data", icon: "📊" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-leaf-soft bg-card/95 backdrop-blur">
      <ul className="mx-auto flex max-w-[480px] justify-around py-2">
        {LINKS.map((l) => {
          const active = path === l.href;
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`flex flex-col items-center px-2 py-1 text-xs ${active ? "font-semibold text-leaf" : "text-muted"}`}
              >
                <span className="text-xl" aria-hidden>
                  {l.icon}
                </span>
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
