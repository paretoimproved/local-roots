import type { FullConfig } from "@playwright/test";

export default async function globalSetup(config: FullConfig) {
  const apiUrl = config.metadata.apiUrl as string;

  // Health-check the backend before running any tests
  const maxAttempts = 10;
  const delayMs = 1_000;

  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const res = await fetch(`${apiUrl}/health`);
      if (res.ok) {
        console.log(`Backend healthy at ${apiUrl}`);
        return;
      }
      console.warn(`Backend returned ${res.status} (attempt ${i}/${maxAttempts})`);
    } catch {
      console.warn(`Backend unreachable at ${apiUrl} (attempt ${i}/${maxAttempts})`);
    }
    if (i < maxAttempts) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw new Error(
    `Backend at ${apiUrl} did not become healthy after ${maxAttempts} attempts. ` +
      `Make sure the API is running (pnpm dev:backend).`
  );
}
