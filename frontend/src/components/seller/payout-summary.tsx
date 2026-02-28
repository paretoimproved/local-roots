import { type SellerPayoutSummary } from "@/lib/seller-api";
import { formatMoney } from "@/lib/ui";

interface PayoutSummaryCardProps {
  summary: SellerPayoutSummary;
}

export function PayoutSummaryCard({ summary }: PayoutSummaryCardProps) {
  return (
    <div className="rounded-2xl bg-white/60 p-4 text-sm ring-1 ring-[color:var(--lr-border)]">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div className="font-semibold text-[color:var(--lr-ink)]">
          Payout summary (est.)
        </div>
        <div className="text-base font-semibold text-[color:var(--lr-ink)]">
          {formatMoney(summary.seller_payout_cents)}
        </div>
      </div>
      <div className="mt-2 grid gap-1 text-xs text-[color:var(--lr-muted)]">
        <div>
          Picked up: {summary.picked_up_count} &middot;{" "}
          {formatMoney(summary.payout_picked_up_cents)}
        </div>
        <div>
          No-show fees: {summary.no_show_count} &middot;{" "}
          {formatMoney(summary.payout_no_show_cents)}
        </div>
        <div>
          Platform fee collected:{" "}
          {formatMoney(summary.platform_fee_cents)}
        </div>
      </div>
    </div>
  );
}
