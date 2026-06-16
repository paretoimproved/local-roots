import type { SellerSubscriptionPlan, SellerSubscription } from "@/lib/seller-api";

export interface ActivationStep {
  id: string;
  label: string;
  done: boolean;
}

export function getActivationSteps(
  plans: SellerSubscriptionPlan[] | null,
  subscriptions: SellerSubscription[] | null,
): ActivationStep[] {
  const p = plans ?? [];
  const s = subscriptions ?? [];
  return [
    { id: "live", label: "Publish your first plan", done: p.some((plan) => plan.is_live) },
    { id: "subscriber", label: "Get your first subscriber", done: s.length > 0 },
  ];
}

export function activationDismissalKey(storeId: string): string {
  return `localroots_activation_dismissed_${storeId}`;
}

export function readActivationDismissed(storeId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(activationDismissalKey(storeId)) === "1";
}

export function writeActivationDismissed(storeId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(activationDismissalKey(storeId), "1");
}
