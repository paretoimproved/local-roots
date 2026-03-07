import Link from "next/link";
import Image from "next/image";
import type { Store } from "@/lib/api";

function formatDistance(km: number): string {
  const miles = km * 0.621371;
  return miles < 10
    ? `${miles.toFixed(1)} mi away`
    : `${Math.round(miles)} mi away`;
}

interface StoreCardProps {
  store: Store;
  /** Compact variant uses smaller text — used on homepage featured grid */
  compact?: boolean;
  /** Show "New" badge — caller should compute this outside render */
  isNew?: boolean;
}

export function StoreCard({ store: s, compact = false, isNew = false }: StoreCardProps) {

  return (
    <Link
      href={`/stores/${s.id}`}
      className="lr-card lr-card-strong block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]"
    >
      {s.image_url ? (
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={s.image_url}
            alt={s.name}
            fill
            className="object-cover"
            sizes={
              compact
                ? "(max-width: 768px) 100vw, 320px"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            }
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-[color:var(--lr-leaf)]/5">
          <svg
            className="h-10 w-10 text-[color:var(--lr-leaf)]/20"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21c-4-4-8-7.5-8-11a8 8 0 0 1 16 0c0 3.5-4 7-8 11Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
            />
          </svg>
        </div>
      )}
      <div
        className={
          compact
            ? "p-5"
            : "flex items-start justify-between gap-6 p-6"
        }
      >
        <div>
          {compact ? (
            <h3 className="text-base font-semibold text-[color:var(--lr-ink)]">
              {s.name}
            </h3>
          ) : (
            <h2 className="text-lg font-semibold text-[color:var(--lr-ink)]">
              {s.name}
            </h2>
          )}
          {(s.city || s.region) && (
            <p
              className={`mt-1 ${compact ? "text-xs" : "text-sm"} text-[color:var(--lr-muted)]`}
            >
              {[s.city, s.region].filter(Boolean).join(", ")}
            </p>
          )}
          {s.description && (
            <p
              className={`mt-2 line-clamp-2 text-sm ${compact ? "leading-relaxed" : ""} text-[color:var(--lr-muted)]`}
            >
              {s.description}
            </p>
          )}
        </div>
        {!compact && (
          <div className="flex flex-col items-end gap-2">
            {s.distance_km != null && (
              <span className="lr-chip rounded-full px-3 py-1 text-xs font-medium">
                {formatDistance(s.distance_km)}
              </span>
            )}
            {isNew && (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                New
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
