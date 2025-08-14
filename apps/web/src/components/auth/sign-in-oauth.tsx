"use client"

import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { Spinner } from "@/components/ui/spinner";

export function SignInOAuth({ redirectUrl = "/select-user-type" }: { redirectUrl?: string }) {
  const { signIn, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
  const [isLoading, setIsLoading] = useState(false);
  
  const isLoaded = isSignInLoaded && isSignUpLoaded;
  
  const signInWithGoogle = async () => {
    if (!isLoaded) return;
    
    try {
      setIsLoading(true);
      
      const result = await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl,
        redirectUrlComplete: redirectUrl,
      });
    } catch (error) {
      console.error("Error signing in with Google", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="w-full">
      <Button 
        onClick={signInWithGoogle}
        disabled={!isLoaded || isLoading}
        variant="outline" 
        className="w-full flex items-center justify-center gap-2 py-6 hover:bg-gray-50"
      >
        {isLoading ? (
          <Spinner className="h-5 w-5" />
        ) : (
          <>
            <FcGoogle className="h-5 w-5" />
            <span>Continue with Google</span>
          </>
        )}
      </Button>
    </div>
  );
} 