import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 justify-center w-full mb-6">
            <Image
              src="/images/local-roots-logo.png"
              width={50}
              height={50}
              alt="LocalRoots Logo"
              className="h-10 w-auto rounded-full"
            />
          </Link>
          
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 rounded-full p-6">
              <User size={36} className="text-gray-500" />
            </div>
          </div>
          
          <h2 className="text-2xl font-semibold tracking-tight">
            Log in or sign up
          </h2>
        </div>
        
        <div className="bg-white p-6 rounded-xl border">
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary: 
                  "bg-farm-green hover:bg-farm-green-dark text-white rounded-lg py-3",
                card: "bg-transparent shadow-none",
                footer: "hidden",
                formFieldInput: "rounded-lg border-gray-300 py-3",
                formFieldLabel: "font-medium text-gray-700",
                identityPreviewText: "text-gray-700",
                identityPreviewEditButton: "text-farm-green hover:text-farm-green-dark",
                headerSubtitle: "text-gray-500",
                socialButtonsBlockButton: "border border-gray-300 rounded-lg py-3",
                socialButtonsBlockButtonText: "font-medium text-gray-600",
                formFieldAction: "text-farm-green hover:text-farm-green-dark",
                headerTitle: "hidden",
                dividerText: "bg-white text-gray-500 px-3"
              }
            }}
            redirectUrl="/select-user-type"
          />
        </div>
        
        <p className="text-xs text-center text-gray-500 px-8">
          By continuing, you agree to LocalRoots's Terms of Service, Privacy Policy, etc.
        </p>
      </div>
    </div>
  );
} 