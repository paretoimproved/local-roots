"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sellerApi } from "@/lib/seller-api";
import { session } from "@/lib/session";
import { ErrorAlert } from "@/components/error-alert";

export default function SetupRouter() {
  const router = useRouter();
  const params = useParams<{ storeId: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = session.getToken();
    if (!token) {
      router.replace("/seller/login");
      return;
    }

    const storeId = params.storeId;
    let cancelled = false;

    async function resolve() {
      try {
        const [locations, plans] = await Promise.all([
          sellerApi.listPickupLocations(token!, storeId),
          sellerApi.listSubscriptionPlans(token!, storeId),
        ]);

        if (cancelled) return;

        if (locations.length === 0) {
          router.replace(`/seller/stores/${storeId}/setup/location`);
          return;
        }

        if (plans.length === 0) {
          router.replace(`/seller/stores/${storeId}/setup/box`);
          return;
        }

        const hasLive = plans.some((p) => p.is_live);
        if (hasLive) {
          router.replace(`/seller/stores/${storeId}`);
          return;
        }

        // Check Stripe Connect status
        const cs = await sellerApi
          .connectStatus(token!, storeId)
          .catch(() => ({ status: "none" }));

        if (cancelled) return;

        if (cs.status !== "active") {
          router.replace(`/seller/stores/${storeId}/setup/payouts`);
          return;
        }

        router.replace(`/seller/stores/${storeId}/setup/review`);
      } catch {
        if (!cancelled) setError("Something went wrong. Please try again.");
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [params.storeId, router]);

  if (error) {
    return <ErrorAlert error={error} />;
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div
        className="h-6 w-6 rounded-full border-2 border-[color:var(--lr-leaf)] border-t-transparent animate-spin"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
