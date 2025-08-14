"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getShareById, updateShare, type CSAShare } from "@/api/shares.api";
import { getMyFarms } from "@/api/farms.api";
import Link from "next/link";

export default function EditShare({ params }: { params: { id: string } }) {
  const shareId = params.id;
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<CSAShare>>({
    name: "",
    description: "",
    price: 0,
    frequency: "weekly",
    available: true,
    startDate: "",
    endDate: "",
    maxSubscribers: 10,
    farmId: "",
  });

  // Fetch the share to edit
  const { data: share, isLoading: isLoadingShare } = useQuery({
    queryKey: ["shares", shareId],
    queryFn: () => getShareById(shareId),
    enabled: !!shareId,
  });

  // Fetch farmer's farms
  const { data: farms = [], isLoading: isLoadingFarms } = useQuery({
    queryKey: ["farms", "me"],
    queryFn: getMyFarms,
  });

  // Set form data when share data is loaded
  useEffect(() => {
    if (share) {
      setFormData({
        name: share.name,
        description: share.description || "",
        price: share.price,
        frequency: share.frequency,
        available: share.available,
        startDate: share.startDate ? new Date(share.startDate).toISOString().split('T')[0] : "",
        endDate: share.endDate ? new Date(share.endDate).toISOString().split('T')[0] : "",
        maxSubscribers: share.maxSubscribers,
        farmId: share.farmId,
      });
    }
  }, [share]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === "price") {
      // Store price in cents
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) * 100 }));
    } else if (name === "maxSubscribers") {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateShare(shareId, formData);
      router.push("/dashboard/farmer/shares");
    } catch (error) {
      console.error("Failed to update share:", error);
      alert("Failed to update the share. Please try again.");
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingShare || isLoadingFarms;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!share) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Edit CSA Share</h1>
        </div>
        <div className="rounded-lg border p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Share not found</h2>
          <p className="text-muted-foreground mb-4">
            The share you are trying to edit could not be found.
          </p>
          <Link
            href="/dashboard/farmer/shares"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2"
          >
            Back to Shares
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Edit CSA Share</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="farmId" className="text-sm font-medium">Farm</label>
            <select 
              id="farmId" 
              name="farmId" 
              value={formData.farmId}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded-md"
            >
              <option value="">Select a farm</option>
              {farms.map(farm => (
                <option key={farm.id} value={farm.id}>{farm.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Share Name</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded-md"
              placeholder="Summer Veggie Box"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <textarea 
              id="description" 
              name="description" 
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full p-2 border rounded-md"
              placeholder="Describe what's included in this CSA share..."
            ></textarea>
          </div>

          <div className="space-y-2">
            <label htmlFor="price" className="text-sm font-medium">Price ($)</label>
            <input 
              type="number" 
              id="price" 
              name="price" 
              value={(formData.price || 0) / 100}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="frequency" className="text-sm font-medium">Frequency</label>
            <select 
              id="frequency" 
              name="frequency" 
              value={formData.frequency}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded-md"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="seasonal">Seasonal</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="startDate" className="text-sm font-medium">Start Date</label>
            <input 
              type="date" 
              id="startDate" 
              name="startDate" 
              value={formData.startDate}
              onChange={handleChange}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="endDate" className="text-sm font-medium">End Date</label>
            <input 
              type="date" 
              id="endDate" 
              name="endDate" 
              value={formData.endDate}
              onChange={handleChange}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="maxSubscribers" className="text-sm font-medium">Maximum Subscribers</label>
            <input 
              type="number" 
              id="maxSubscribers" 
              name="maxSubscribers" 
              value={formData.maxSubscribers}
              onChange={handleChange}
              required
              min="1"
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="available" 
              name="available" 
              checked={formData.available}
              onChange={handleChange}
              className="h-4 w-4"
            />
            <label htmlFor="available" className="text-sm font-medium">Make this share available</label>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Link
            href="/dashboard/farmer/shares"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border h-10 px-4 py-2"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
} 