"use client"

import { useEffect } from "react";
import { useSignIn } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Get the token and email from the URL
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  
  // Handle password reset
  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded || !code) return;
    
    if (password !== passwordConfirm) {
      setError("Passwords do not match");
      return;
    }
    
    try {
      setIsResetting(true);
      setError("");
      
      // Reset the password using the correct Clerk method
      await signIn?.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });
      
      setIsSuccess(true);
      
      // Redirect to sign-in page after a short delay
      setTimeout(() => {
        router.push('/auth');
      }, 3000);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || "Failed to reset password. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };
  
  useEffect(() => {
    // If email is in the URL, initialize the reset password flow
    if (isLoaded && email && signIn) {
      signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      })
      .catch((err) => {
        console.error(JSON.stringify(err, null, 2));
        setError(err.errors?.[0]?.message || "Failed to start password reset. Please try again.");
      });
    }
  }, [isLoaded, email, signIn]);
  
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
            Please enter your new password
          </p>
        </div>
        
        {/* Reset Password Form */}
        <div className="bg-white rounded-lg border border-gray-200 shadow overflow-hidden">
          {isSuccess ? (
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
              <h3 className="text-lg font-medium text-gray-900">Password reset successful!</h3>
              <p className="mt-2 text-sm text-gray-600">
                Redirecting you to the login page...
              </p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
                  {error}
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
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-farm-green focus:border-farm-green"
                  placeholder="Enter the code sent to your email"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-farm-green focus:border-farm-green"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  className="block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-farm-green focus:border-farm-green"
                />
              </div>
              
              <button
                type="submit"
                disabled={isResetting}
                className="w-full bg-farm-green hover:bg-farm-green-dark text-white rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-farm-green disabled:opacity-50"
              >
                {isResetting ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
        </div>
        
        <div className="text-center">
          <Link href="/auth" className="text-sm text-farm-green hover:text-farm-green-dark">
            Return to sign in
          </Link>
        </div>
        
        <p className="text-xs text-center text-gray-500">
          By continuing, you agree to LocalRoots's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
} 