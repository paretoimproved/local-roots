"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { session, subscribe } from "@/lib/session";

function getSnapshot() {
  return session.getToken() !== null;
}

function getServerSnapshot() {
  return false;
}

export function BuyerNavLink() {
  const loggedIn = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (loggedIn) {
    return (
      <Link className="lr-btn px-4 py-2 text-[color:var(--lr-ink)]" href="/buyer">
        My pickups
      </Link>
    );
  }

  return (
    <Link className="lr-btn px-4 py-2 text-[color:var(--lr-ink)]" href="/buyer/login">
      Sign in
    </Link>
  );
}
