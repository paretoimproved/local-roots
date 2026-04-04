"use client";

import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import { useState } from "react";
import { sellerApi } from "@/lib/seller-api";
import { session } from "@/lib/session";

type Props = {
  storeId: string;
  onExit: () => void;
};

export function StripeConnectOnboarding({ storeId, onExit }: Props) {
  const [stripeConnectInstance] = useState(() => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      throw new Error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
    }
    return loadConnectAndInitialize({
      publishableKey,
      fetchClientSecret: async () => {
        const token = session.getToken();
        if (!token) throw new Error("Not authenticated");
        const res = await sellerApi.connectAccountSession(token, storeId);
        return res.client_secret;
      },
      appearance: {
        variables: {
          colorPrimary: "#2d6a4f",
        },
      },
    });
  });

  return (
    <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
      <ConnectAccountOnboarding onExit={onExit} />
    </ConnectComponentsProvider>
  );
}
