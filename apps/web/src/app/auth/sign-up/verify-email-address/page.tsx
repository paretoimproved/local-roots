"use client";

import { useSignUp } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function VerifyEmailPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/select-user-type";
  
  // Attempt to prepare verification if needed
  useEffect(() => {
    if (isLoaded && signUp.status === "missing_requirements") {
      const prepareVerification = async () => {
        try {
          // This ensures the verification code is sent if it wasn't already
          await signUp.prepareEmailAddressVerification();
        } catch (err) {
          console.error("Failed to prepare verification", err);
          setError("Failed to send verification code. Please try resending.");
        }
      };
      
      prepareVerification();
    }
  }, [isLoaded, signUp]);
  
  // Handle verification
  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!isLoaded) return;
    
    try {
      setIsSubmitting(true);
      setError("");
      
      // Attempt to verify the email address with the code
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      
      if (completeSignUp.status !== "complete") {
        // Handle non-complete status
        console.log(JSON.stringify(completeSignUp, null, 2));
        setError("Verification failed. Please try again.");
      }
      
      if (completeSignUp.status === "complete") {
        // Set the session as active and redirect
        await setActive({ session: completeSignUp.createdSessionId });
        router.push(redirectUrl);
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || "Verification failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle resending verification code
  const handleResend = async () => {
    if (!isLoaded) return;
    
    try {
      setIsResending(true);
      setError("");
      
      // Resend the verification code
      await signUp.prepareEmailAddressVerification();
      setResendSuccess(true);
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setResendSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || "Failed to resend verification code.");
    } finally {
      setIsResending(false);
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
          <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
          <p className="mt-2 text-sm text-gray-600">
            Please enter the verification code sent to your email
          </p>
          <div className="mt-2 p-2 bg-yellow-50 rounded-md border border-yellow-200">
            <p className="text-xs text-yellow-700">
              <strong>Test Mode:</strong> Use verification code <code>424242</code>
            </p>
          </div>
        </div>
        
        {/* Verification Form */}
        <div className="bg-white rounded-lg border border-gray-200 shadow overflow-hidden">
          <form onSubmit={handleVerify} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}
            
            {resendSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md text-sm">
                Verification code sent successfully!
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="424242"
                required
                className="block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-farm-green focus:border-farm-green"
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-farm-green hover:bg-farm-green-dark text-white rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-farm-green disabled:opacity-50"
            >
              {isSubmitting ? "Verifying..." : "Verify Email"}
            </button>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-farm-green hover:text-farm-green-dark text-sm font-medium"
              >
                {isResending ? "Sending..." : "Resend verification code"}
              </button>
            </div>
          </form>
        </div>
        
        <p className="text-xs text-center text-gray-500">
          By continuing, you agree to LocalRoots's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
} 