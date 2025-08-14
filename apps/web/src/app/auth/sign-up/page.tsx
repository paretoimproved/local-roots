"use client"

import { SignUp } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export default function SignUpPage() {
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
          <h2 className="text-2xl font-bold text-gray-900">Join LocalRoots</h2>
          <p className="mt-2 text-sm text-gray-600">
            Create an account to connect with local farms
          </p>
          {isDev && (
            <div className="mt-2 p-2 bg-yellow-50 rounded-md border border-yellow-200">
              <p className="text-xs text-yellow-700">
                <strong>Test Mode:</strong> Use email <code>test+clerk_test@example.com</code> and verification code <code>424242</code>
              </p>
            </div>
          )}
        </div>
        
        {/* Auth Component */}
        <div className="bg-white rounded-lg border border-gray-200 shadow overflow-hidden">
          <SignUp 
            path="/auth/sign-up"
            routing="path" 
            signInUrl="/auth"
            redirectUrl="/select-user-type"
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
              }
            }}
            {...(isDev ? { 
              initialValues: {
                emailAddress: 'test+clerk_test@example.com',
              }
            } : {})}
          />
        </div>
        
        <p className="text-xs text-center text-gray-500">
          By continuing, you agree to LocalRoots's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
} 