"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      title="Log out"
      className="flex h-10 w-10 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-loss-muted hover:text-loss"
    >
      <LogOut size={20} />
    </button>
  );
}