"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ListOrdered, BarChart3, Settings } from "lucide-react";
import LogoutButton from "./LogoutButton";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/trades", label: "Trades", icon: ListOrdered },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

// Renders both: a floating capsule sidebar (sm and up) and a bottom
// tab bar (below sm). Sharing one component keeps the active-route
// logic in one place instead of two components drifting apart.
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop / tablet — floating capsule, left side */}
      <aside className="my-4 ml-4 hidden h-[calc(100vh-2rem)] w-16 flex-col items-center justify-between rounded-3xl border border-border bg-bg-surface py-4 shadow-sm sm:flex">
        <div className="flex flex-col items-center gap-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  isActive
                    ? "bg-accent-dark text-white"
                    : "text-text-muted hover:bg-profit-muted hover:text-accent"
                }`}
              >
                <Icon size={20} />
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-2">
          <Link
            href="/settings"
            title="Settings"
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              pathname === "/settings"
                ? "bg-accent-dark text-white"
                : "text-text-muted hover:bg-profit-muted hover:text-accent"
            }`}
          >
            <Settings size={20} />
          </Link>
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile — fixed bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-border bg-bg-surface py-2 shadow-[0_-1px_8px_rgba(0,0,0,0.04)] sm:hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                isActive
                  ? "bg-accent-dark text-white"
                  : "text-text-muted"
              }`}
            >
              <Icon size={20} />
            </Link>
          );
        })}
        <Link
          href="/settings"
          title="Settings"
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
            pathname === "/settings" ? "bg-accent-dark text-white" : "text-text-muted"
          }`}
        >
          <Settings size={20} />
        </Link>
        <LogoutButton />
      </nav>
    </>
  );
}