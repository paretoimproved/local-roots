"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { buyerSession } from "@/lib/session";

const emptySubscribe = () => () => {};

function getSnapshot() {
  return buyerSession.getToken() !== null;
}

function getServerSnapshot() {
  return false;
}

export function BuyerNavLink() {
  const loggedIn = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);

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
