"use client";

import { useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              type?: string;
              theme?: string;
              size?: string;
              text?: string;
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

type GoogleSignInButtonProps = {
  onCredential: (idToken: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
  disabled?: boolean;
};

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;

export function GoogleSignInButton({
  onCredential,
  text = "signin_with",
  disabled,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  const renderButton = useCallback(() => {
    if (!window.google || !containerRef.current) return;
    // Clear any previous button.
    containerRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID!,
      callback: (response) => {
        callbackRef.current(response.credential);
      },
    });
    window.google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text,
      width: 400,
    });
  }, [text]);

  useEffect(() => {
    if (!CLIENT_ID) return;

    // If GIS is already loaded, render immediately.
    if (window.google?.accounts?.id) {
      renderButton();
      return;
    }

    // Load the GIS script.
    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      // Script tag exists but hasn't loaded yet — wait for it.
      existing.addEventListener("load", renderButton);
      return () => existing.removeEventListener("load", renderButton);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.head.appendChild(script);
  }, [renderButton]);

  if (!CLIENT_ID) return null;

  return (
    <div
      ref={containerRef}
      className={disabled ? "pointer-events-none opacity-50" : undefined}
    />
  );
}
