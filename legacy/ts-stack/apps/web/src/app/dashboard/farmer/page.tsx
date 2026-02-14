import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs";

export default async function FarmerDashboard() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Farmer Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.firstName || "Farmer"}!
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Your Farms</h2>
          <p className="text-muted-foreground mb-4">
            Manage your farm profiles and information.
          </p>
          <div className="mt-2">
            <a
              href="/dashboard/farmer/farms"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2"
            >
              View Farms
            </a>
          </div>
        </div>
        
        <div className="border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">CSA Shares</h2>
          <p className="text-muted-foreground mb-4">
            Manage your CSA share offerings and availability.
          </p>
          <div className="mt-2">
            <a
              href="/dashboard/farmer/shares"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2"
            >
              View Shares
            </a>
          </div>
        </div>
        
        <div className="border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Subscribers</h2>
          <p className="text-muted-foreground mb-4">
            View and manage your CSA subscribers.
          </p>
          <div className="mt-2">
            <a
              href="/dashboard/farmer/subscribers"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2"
            >
              View Subscribers
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 