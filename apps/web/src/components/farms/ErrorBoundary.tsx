'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  error: any;
  reset: () => void;
}

export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const getErrorMessage = () => {
    if (error?.status === 404) {
      return "We couldn't find any farms at the moment.";
    }
    if (error?.status >= 500) {
      return "Our servers are having trouble. Please try again in a moment.";
    }
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      return "Please check your internet connection and try again.";
    }
    return "Something went wrong while loading farms.";
  };

  const getErrorTitle = () => {
    if (error?.status >= 500) {
      return "Server Error";
    }
    if (error?.message?.includes('network')) {
      return "Connection Error";
    }
    return "Something went wrong";
  };

  return (
    <div className="text-center py-12">
      <AlertTriangle className="h-16 w-16 mx-auto text-destructive mb-4" />
      <h2 className="text-2xl font-semibold mb-2">{getErrorTitle()}</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {getErrorMessage()}
      </p>
      
      <div className="space-x-3">
        <Button onClick={reset} className="space-x-2">
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => window.location.href = '/'}
        >
          Go Home
        </Button>
      </div>
      
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-8 text-left max-w-2xl mx-auto">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Debug Information
          </summary>
          <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}