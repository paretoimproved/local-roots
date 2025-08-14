"use client"

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const { isLoaded, signIn } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded || !email) return;

    try {
      setIsSubmitting(true);
      setError("");

      // Start the password reset flow
      await signIn?.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });

      setSuccess(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || "Failed to initiate password reset. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Link href="/">
            <Image
              src="/images/local-roots-logo.png"
              width={70}
              height={70}
              alt="LocalRoots Logo"
              className="rounded-full"
            />
          </Link>
        </div>
        
        {/* Heading */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Reset your password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>
        
        {/* Forgot Password Form */}
        <div className="bg-white rounded-lg border border-gray-200 shadow overflow-hidden">
          {success ? (
            <div className="p-6 text-center">
              <div className="mb-4 flex items-center justify-center text-farm-green">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-12 w-12" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Check your email</h3>
              <p className="mt-2 text-sm text-gray-600">
                We've sent a password reset link to {email}. Please check your inbox 
                and follow the instructions to reset your password.
              </p>
              <div className="mt-4">
                <Link href="/auth" className="text-sm text-farm-green hover:text-farm-green-dark">
                  Return to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-farm-green focus:border-farm-green"
                  placeholder="Enter your email address"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-farm-green hover:bg-farm-green-dark text-white rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-farm-green disabled:opacity-50"
              >
                {isSubmitting ? "Sending..." : "Send reset instructions"}
              </button>
              
              <div className="text-center mt-4">
                <Link href="/auth" className="text-sm text-farm-green hover:text-farm-green-dark">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
        
        <p className="text-xs text-center text-gray-500">
          By continuing, you agree to LocalRoots's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
} 