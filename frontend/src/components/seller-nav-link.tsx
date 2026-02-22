"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { session } from "@/lib/session";

const emptySubscribe = () => () => {};

function getSnapshot() {
  return session.getToken() !== null;
}

function getServerSnapshot() {
  return false;
}

export function SellerNavLink() {
  const loggedIn = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
  const router = useRouter();

  if (loggedIn) {
    return (
      <>
        <Link className="lr-btn px-4 py-2 text-[color:var(--lr-ink)]" href="/seller">
          Dashboard
        </Link>
        <button
          className="lr-btn px-4 py-2 text-[color:var(--lr-ink)]"
          onClick={() => {
            session.clearToken();
            router.refresh();
          }}
        >
          Log out
        </button>
      </>
    );
  }

  return (
    <Link className="lr-btn px-4 py-2 text-[color:var(--lr-ink)]" href="/seller/login">
      Sell
    </Link>
  );
}
