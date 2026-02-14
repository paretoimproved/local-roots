"use client";

import Image from "next/image";
import { useState } from "react";

// This maps specific farm names to specific images to guarantee uniqueness
const FARM_NAME_MAPPINGS: Record<string, string> = {
  // Hard-coded mappings for the featured farms to ensure they always get unique images
  "Green Valley Farm": "https://images.unsplash.com/photo-1563911892437-1feda0179e1b?auto=format&fit=crop&w=800&q=80",
  "Sunshine Orchard": "https://images.unsplash.com/photo-1471194402529-8e0f5a675de6?auto=format&fit=crop&w=800&q=80",
  "Heritage Ranch": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=800&q=80",
  "Meadow Dairy": "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=800&q=80",
};

// Define farm categories type for type safety
type FarmCategory = 'vegetable' | 'fruit' | 'meat' | 'dairy' | 'general';

// Collection of reliable static Unsplash farm images by category
const FARM_IMAGES: Record<FarmCategory, string[]> = {
  // Vegetable farms
  vegetable: [
    "https://images.unsplash.com/photo-1595856619767-ab951ca3aeb7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1470058869958-2a77ade41c02?auto=format&fit=crop&w=800&q=80",
  ],
  // Fruit/orchard farms
  fruit: [
    "https://images.unsplash.com/photo-1543528176-61b239494933?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1471327149954-cf3f78f2a019?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1445686218575-d349f6bd1b33?auto=format&fit=crop&w=800&q=80",
  ],
  // Meat/ranch farms
  meat: [
    "https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?auto=format&fit=crop&w=800&q=80", 
    "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1596733430284-f7437764b1cb?auto=format&fit=crop&w=800&q=80",
  ],
  // Dairy farms
  dairy: [
    "https://images.unsplash.com/photo-1604167504016-6d7bbd7958bf?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1568778273622-a69c2f04fc59?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80",
  ],
  // General farms
  general: [
    "https://images.unsplash.com/photo-1495107334309-fcf20f6a8343?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1518282419909-99c9134a3f6d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1516620742687-d12ce43cc3ab?auto=format&fit=crop&w=800&q=80",
  ]
};

// Maintain a registry of which images have been assigned to which farms
// This state persists between component renders
const assignedImageRegistry = new Map<string, string>();
const usedImageUrls = new Set<string>();

// Default fallback image
const DEFAULT_FARM_IMAGE = "https://images.unsplash.com/photo-1535649168324-6ba8ce5c2c8b?auto=format&fit=crop&w=800&q=80";

// This component handles farm images with appropriate placeholders
export function FarmImage({ 
  src, 
  alt, 
  className = "", 
  fill = false,
  width = 600,
  height = 400,
  sizes,
  priority = false
}: {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
}) {
  // Determine farm type from name or description
  const getFarmType = (): FarmCategory => {
    const name = alt.toLowerCase();
    if (name.includes('vegetable') || name.includes('garden') || name.includes('green') || name.includes('valley')) {
      return 'vegetable';
    } else if (name.includes('fruit') || name.includes('orchard') || name.includes('sunshine')) {
      return 'fruit';
    } else if (name.includes('meat') || name.includes('ranch') || name.includes('heritage')) {
      return 'meat';
    } else if (name.includes('dairy') || name.includes('milk') || name.includes('cheese') || name.includes('meadow')) {
      return 'dairy';
    }
    return 'general';
  };
  
  // Get a guaranteed unique image for this farm
  const getUniqueImageForFarm = () => {
    // If external source is provided, use it
    if (src && src !== "" && !src.includes("placeholder")) {
      return src;
    }
    
    try {
      // Check if we already assigned an image to this farm
      if (assignedImageRegistry.has(alt)) {
        return assignedImageRegistry.get(alt)!;
      }
      
      // Check if this is one of our known farms with pre-assigned images
      if (FARM_NAME_MAPPINGS[alt]) {
        const mappedUrl = FARM_NAME_MAPPINGS[alt];
        assignedImageRegistry.set(alt, mappedUrl);
        usedImageUrls.add(mappedUrl);
        return mappedUrl;
      }
      
      // Get category-specific images
      const farmType = getFarmType();
      const categoryImages = FARM_IMAGES[farmType];
      
      // Find an unused image from this category
      for (const imageUrl of categoryImages) {
        if (!usedImageUrls.has(imageUrl)) {
          assignedImageRegistry.set(alt, imageUrl);
          usedImageUrls.add(imageUrl);
          return imageUrl;
        }
      }
      
      // If all category images are used, check all categories
      const farmCategories: FarmCategory[] = ['vegetable', 'fruit', 'meat', 'dairy', 'general'];
      for (const category of farmCategories) {
        if (category === farmType) continue; // Skip the category we already checked
        
        for (const imageUrl of FARM_IMAGES[category]) {
          if (!usedImageUrls.has(imageUrl)) {
            assignedImageRegistry.set(alt, imageUrl);
            usedImageUrls.add(imageUrl);
            return imageUrl;
          }
        }
      }
      
      // If all images are taken, use a hash of the name to select a fallback
      // but mark it as a duplicate in the registry
      let hash = 0;
      for (let i = 0; i < alt.length; i++) {
        hash = ((hash << 5) - hash) + alt.charCodeAt(i);
      }
      hash = Math.abs(hash);
      
      // Flatten all images into one array for selection
      const allImages = Object.values(FARM_IMAGES).flat();
      const fallbackUrl = allImages[hash % allImages.length];
      
      assignedImageRegistry.set(alt, fallbackUrl);
      return fallbackUrl;
    } catch (e) {
      // If anything fails, use default
      return DEFAULT_FARM_IMAGE;
    }
  };
      
  const [imageSrc, setImageSrc] = useState(getUniqueImageForFarm());
  
  // Handle any loading errors
  const handleError = () => {
    // If error occurs, use default farm image
    setImageSrc(DEFAULT_FARM_IMAGE);
    // Update registry with the fallback
    assignedImageRegistry.set(alt, DEFAULT_FARM_IMAGE);
  };
  
  return (
    <Image
      src={imageSrc}
      alt={alt}
      className={className}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      sizes={sizes || "100vw"}
      priority={priority}
      onError={handleError}
    />
  );
} 