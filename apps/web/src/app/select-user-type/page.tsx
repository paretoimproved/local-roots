"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import Image from "next/image";

export default function SelectUserTypePage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Use useEffect for any browser-only code like redirects
  useEffect(() => {
    // Redirect if not signed in
    if (isLoaded && !isSignedIn) {
      router.push("/auth");
    }
  }, [isLoaded, isSignedIn, router]);
  
  // If still loading or not signed in, show a simple loading state
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }
  
  const setUserType = async (type: "farmer" | "consumer") => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Update the user's metadata with their chosen type
      await user.update({
        unsafeMetadata: {
          userType: type,
        },
      });
      
      // Redirect to the appropriate dashboard
      router.push(type === "farmer" ? "/dashboard/farmer" : "/dashboard/consumer");
    } catch (error) {
      console.error("Error setting user type:", error);
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container max-w-4xl mx-auto py-16 px-4 bg-[#fafafa] min-h-screen">
      <div className="flex justify-center mb-8">
        <Link href="/">
          <Image
            src="/images/local-roots-logo.png"
            width={80}
            height={80}
            alt="LocalRoots Logo"
            className="rounded-full"
          />
        </Link>
      </div>
      
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold">How will you use Local Roots?</h1>
        <p className="text-gray-500 mt-2 max-w-lg mx-auto">
          Choose how you'd like to participate in our local food community
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        <div className="border rounded-2xl p-8 hover:shadow-lg transition-all bg-white group">
          <div className="mb-6">
            <div className="h-16 w-16 bg-[#FFF3F3] rounded-full flex items-center justify-center mb-4 group-hover:bg-[#FFEBEB] transition-colors">
              <span className="text-3xl">👨‍🌾</span>
            </div>
            <h2 className="text-2xl font-bold mb-2 group-hover:text-farm-green transition-colors">I'm a Farmer</h2>
            <p className="text-gray-500">
              I want to create a farm profile and offer CSA shares to customers.
            </p>
          </div>
          
          <button
            onClick={() => setUserType("farmer")}
            className="w-full py-2 px-4 rounded-md bg-farm-green hover:bg-farm-green-dark text-white font-medium transition-colors"
            disabled={isLoading}
          >
            {isLoading ? "Setting up..." : "Continue as Farmer"}
          </button>
        </div>
        
        <div className="border rounded-2xl p-8 hover:shadow-lg transition-all bg-white group">
          <div className="mb-6">
            <div className="h-16 w-16 bg-[#F3F8FF] rounded-full flex items-center justify-center mb-4 group-hover:bg-[#EBF3FF] transition-colors">
              <span className="text-3xl">🧺</span>
            </div>
            <h2 className="text-2xl font-bold mb-2 group-hover:text-farm-green transition-colors">I'm a Consumer</h2>
            <p className="text-gray-500">
              I want to find and subscribe to local CSA shares from farms.
            </p>
          </div>
          
          <button
            onClick={() => setUserType("consumer")}
            className="w-full py-2 px-4 rounded-md bg-farm-green hover:bg-farm-green-dark text-white font-medium transition-colors"
            disabled={isLoading}
          >
            {isLoading ? "Setting up..." : "Continue as Consumer"}
          </button>
        </div>
      </div>
      
      <div className="flex justify-center mt-8">
        <button 
          className="text-gray-500 hover:text-gray-700 font-medium"
          onClick={() => signOut(() => router.push("/"))}
          disabled={isLoading}
        >
          Sign out and start over
        </button>
      </div>
    </div>
  );
} 