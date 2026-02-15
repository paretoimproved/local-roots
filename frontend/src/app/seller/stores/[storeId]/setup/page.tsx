"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sellerApi } from "@/lib/seller-api";
import { session } from "@/lib/session";

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
        if (!hasLive) {
          router.replace(`/seller/stores/${storeId}/setup/review`);
          return;
        }

        router.replace(`/seller/stores/${storeId}`);
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
    return (
      <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
        {error}
      </div>
    );
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
