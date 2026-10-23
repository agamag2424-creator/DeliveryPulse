"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

function getInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

export function AuthNav() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return <div className="h-8 w-20 animate-pulse rounded-[3px] bg-faint" />;
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="rounded-[3px] border border-ink bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-black"
      >
        Sign In
      </Link>
    );
  }

  const initials = getInitials(session.user.name, session.user.email);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-line bg-paper text-xs font-semibold text-ink hover:border-cyan"
      >
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[160px] rounded-[3px] border border-line bg-paper py-1 shadow-sm"
        >
          <Link
            role="menuitem"
            href="/dashboard"
            className="block px-4 py-2 text-sm text-ink hover:bg-faint"
            onClick={() => setOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            role="menuitem"
            href="/settings"
            className="block px-4 py-2 text-sm text-ink hover:bg-faint"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <button
            role="menuitem"
            type="button"
            className="block w-full px-4 py-2 text-left text-sm text-ink hover:bg-faint"
            onClick={() => {
              setOpen(false);
              void signOut({ redirect: false }).then(() => router.push("/"));
            }}
          >
            Sign Out
          </button>
        </div>
      ) : null}
    </div>
  );
}
