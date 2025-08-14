"use client"

import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export default function SignInPage() {
  // In development, use local redirect and disable verification
  const isDev = process.env.NODE_ENV === 'development';

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
          <h2 className="text-2xl font-bold text-gray-900">Welcome to LocalRoots</h2>
          <p className="mt-2 text-sm text-gray-600">
            The easiest way to connect with local farms
          </p>
        </div>
        
        {/* Auth Component */}
        <div className="bg-white rounded-lg border border-gray-200 shadow overflow-hidden">
          <SignIn 
            path="/sign-in"
            routing="path" 
            redirectUrl="/select-user-type"
            signUpUrl="/auth/sign-up"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none p-6",
                formButtonPrimary: 
                  "bg-farm-green hover:bg-farm-green-dark text-white rounded-md",
                formFieldInput: 
                  "block w-full border-gray-300 rounded-md",
                formFieldLabel: 
                  "block text-sm font-medium text-gray-700 mb-1",
                footerActionText: "block text-sm text-center",
                footerActionLink: "text-farm-green hover:text-farm-green-dark font-medium",
                dividerText: "text-gray-500 text-sm",
                dividerLine: "bg-gray-200",
                headerTitle: "text-center text-xl font-bold text-gray-900",
                headerSubtitle: "text-center text-gray-600",
                alternativeMethodsBlockButton: "hidden",
              }
            }}
            {...(isDev ? { 
              unsafeMetadata: { skipEmailVerification: true }
            } : {})}
          />
        </div>
        
        {/* Forgot Password Link */}
        <div className="text-center">
          <Link href="/forgot-password" className="text-sm text-farm-green hover:text-farm-green-dark">
            Forgot your password?
          </Link>
        </div>
        
        <p className="text-xs text-center text-gray-500">
          By continuing, you agree to LocalRoots's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
} 