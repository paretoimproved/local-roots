import { requestJSON } from "@/lib/http";
import type { AuthResponse } from "@/lib/seller-api";

export const oauthApi = {
  googleLogin: (idToken: string, role: "buyer" | "seller") =>
    requestJSON<AuthResponse>("/v1/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken, role }),
    }),
};
