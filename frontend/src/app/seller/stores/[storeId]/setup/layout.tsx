"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { session } from "@/lib/session";

const STEPS = [
  { label: "Pickup spot", path: "location" },
  { label: "Your box", path: "box" },
  { label: "Start selling", path: "review" },
] as const;

function stepIndex(pathname: string): number {
  if (pathname.endsWith("/location")) return 0;
  if (pathname.endsWith("/box")) return 1;
  if (pathname.endsWith("/review")) return 2;
  return -1;
}

export default function SetupLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const authed = typeof window !== "undefined" && !!session.getToken();
  if (typeof window !== "undefined" && !authed) {
    router.replace("/seller/login");
  }

  const current = stepIndex(pathname);

  if (!authed) return null;

  return (
    <div className="mx-auto max-w-xl lr-animate">
      <Link
        href="/seller"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--lr-muted)] hover:text-[color:var(--lr-ink)] transition-colors"
      >
        <span aria-hidden="true">&larr;</span> Back to seller home
      </Link>

      <p className="mt-6 text-center text-sm font-medium text-[color:var(--lr-muted)]">
        3 quick steps to start selling
      </p>

      {/* ── Progress stepper ── */}
      <nav aria-label="Setup progress" className="mt-4 mb-8">
        <ol className="flex items-center justify-center gap-0">
          {STEPS.map((step, i) => {
            const done = current > i;
            const active = current === i;
            return (
              <li key={step.path} className="flex items-center">
                {/* Connecting line before circle (skip first) */}
                {i > 0 && (
                  <div
                    className="h-0.5 w-12 sm:w-16 transition-colors"
                    style={{
                      backgroundColor: done || active
                        ? "var(--lr-leaf)"
                        : "var(--lr-border)",
                    }}
                  />
                )}
                <div className="flex flex-col items-center gap-1.5">
                  {/* Circle / check */}
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors"
                    style={
                      done
                        ? {
                            backgroundColor: "var(--lr-leaf)",
                            color: "#fff",
                          }
                        : active
                          ? {
                              backgroundColor: "var(--lr-leaf)",
                              color: "#fff",
                            }
                          : {
                              backgroundColor: "transparent",
                              border: "2px solid var(--lr-border)",
                              color: "var(--lr-muted)",
                            }
                    }
                  >
                    {done ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 8.5L6.5 12L13 4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <span
                        className="block h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: active
                            ? "#fff"
                            : "var(--lr-muted)",
                        }}
                      />
                    )}
                  </div>
                  {/* Label */}
                  <span
                    className="text-xs font-medium whitespace-nowrap"
                    style={{
                      color:
                        done || active ? "var(--lr-leaf)" : "var(--lr-muted)",
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {children}
    </div>
  );
}
