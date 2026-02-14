import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs";

export default async function ConsumerDashboard() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Consumer Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.firstName || "Friend"}!
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Find Local Farms</h2>
          <p className="text-muted-foreground mb-4">
            Discover CSA shares from local farms in your area.
          </p>
          <div className="mt-2">
            <a
              href="/dashboard/consumer/farms"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2"
            >
              Browse Farms
            </a>
          </div>
        </div>
        
        <div className="border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Your Subscriptions</h2>
          <p className="text-muted-foreground mb-4">
            Manage your active CSA subscriptions.
          </p>
          <div className="mt-2">
            <a
              href="/dashboard/consumer/subscriptions"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2"
            >
              View Subscriptions
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 