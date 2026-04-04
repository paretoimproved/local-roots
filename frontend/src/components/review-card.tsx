import type { PublicReview } from "@/lib/api";

export function StarRating({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          aria-hidden="true"
          className={`h-4 w-4 ${i <= rating ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 1) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  if (diffMonths < 12) return `${diffMonths} months ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

export function ReviewSummary({
  avgRating,
  reviewCount,
  className,
}: {
  avgRating: number;
  reviewCount: number;
  className?: string;
}) {
  if (reviewCount === 0) return null;
  return (
    <div className={className ?? "inline-flex items-center gap-2 text-sm text-[color:var(--lr-muted)]"}>
      <StarRating rating={Math.round(avgRating)} />
      <span>
        {avgRating.toFixed(1)} from {reviewCount}{" "}
        {reviewCount === 1 ? "review" : "reviews"}
      </span>
    </div>
  );
}

export function ReviewCard({ review }: { review: PublicReview }) {
  return (
    <div className="lr-card lr-card-strong p-4">
      <div className="flex items-center justify-between gap-2">
        <StarRating rating={review.rating} />
        <span className="text-xs text-[color:var(--lr-muted)]">
          {timeAgo(review.created_at)}
        </span>
      </div>
      {review.body ? (
        <p className="mt-2 text-sm text-[color:var(--lr-ink)]">
          {review.body}
        </p>
      ) : null}
    </div>
  );
}
