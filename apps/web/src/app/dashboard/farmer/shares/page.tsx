"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getMyShares, deleteShare, setShareAvailability } from "@/api/shares.api";
import { getMyFarms } from "@/api/farms.api";
import Link from "next/link";

export default function FarmerShares() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  // Fetch the farmer's shares
  const { data: shares = [], isLoading: isLoadingShares, refetch: refetchShares } = useQuery({
    queryKey: ["shares", "me"],
    queryFn: getMyShares,
  });

  // Fetch the farmer's farms
  const { data: farms = [], isLoading: isLoadingFarms } = useQuery({
    queryKey: ["farms", "me"],
    queryFn: getMyFarms,
  });

  // Handle deleting a share
  const handleDeleteShare = async (shareId: string) => {
    if (confirm("Are you sure you want to delete this CSA share?")) {
      setIsDeleting(shareId);
      try {
        await deleteShare(shareId);
        await refetchShares();
      } catch (error) {
        console.error("Failed to delete share:", error);
        alert("Failed to delete the share. Please try again.");
      } finally {
        setIsDeleting(null);
      }
    }
  };

  // Handle toggling share availability
  const handleToggleAvailability = async (shareId: string, currentAvailability: boolean) => {
    setIsToggling(shareId);
    try {
      await setShareAvailability(shareId, !currentAvailability);
      await refetchShares();
    } catch (error) {
      console.error("Failed to update share availability:", error);
      alert("Failed to update share availability. Please try again.");
    } finally {
      setIsToggling(null);
    }
  };

  const isLoading = isLoadingShares || isLoadingFarms;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">CSA Shares</h1>
        <Link
          href="/dashboard/farmer/shares/new"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2"
        >
          Add New Share
        </Link>
      </div>

      {farms.length === 0 && !isLoading ? (
        <div className="rounded-lg border p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">You need to create a farm first</h2>
          <p className="text-muted-foreground mb-4">
            Before you can create CSA shares, you need to set up your farm profile.
          </p>
          <Link
            href="/dashboard/farmer/farms/new"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2"
          >
            Create Farm
          </Link>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
      ) : shares.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No CSA shares yet</h2>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first CSA share offering.
          </p>
          <Link
            href="/dashboard/farmer/shares/new"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2"
          >
            Create Share
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {shares.map((share) => {
            const farm = farms.find((f) => f.id === share.farmId);
            return (
              <div key={share.id} className="border rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold">{share.name}</h2>
                    <p className="text-sm text-muted-foreground">Farm: {farm?.name || "Unknown Farm"}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleAvailability(share.id, share.available)}
                      disabled={isToggling === share.id}
                      className={`rounded-full px-3 py-1 text-xs font-medium
                      ${share.available
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {isToggling === share.id ? (
                        <span className="flex items-center gap-1">
                          <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
                          Updating...
                        </span>
                      ) : (
                        <>{share.available ? "Available" : "Not Available"}</>
                      )}
                    </button>
                    <span className="text-sm font-medium">
                      ${(share.price / 100).toFixed(2)} / {share.frequency}
                    </span>
                  </div>
                </div>
                
                <p className="mt-2">
                  {share.description || "No description provided."}
                </p>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {share.startDate && share.endDate ? (
                      <span>
                        {new Date(share.startDate).toLocaleDateString()} to{" "}
                        {new Date(share.endDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span>No date range specified</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/dashboard/farmer/shares/${share.id}/edit`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteShare(share.id)}
                      className="text-sm font-medium text-destructive hover:underline"
                      disabled={isDeleting === share.id}
                    >
                      {isDeleting === share.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 