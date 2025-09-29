'use client';

import Image from 'next/image';
import { Heart } from 'lucide-react';

// Using the API response type instead of the database type
interface Farm {
  id: string;
  userId: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: string;
  longitude?: string;
  imageUrls?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface FarmCardProps {
  farm: Farm;
  priority?: boolean;
  onClick?: () => void;
  isFavorite?: boolean;
  rating?: number;
  priceRange?: string;
}

export function FarmCard({ 
  farm, 
  priority = false, 
  onClick,
  isFavorite = false,
  rating = 4.8,
  priceRange = "$25-35/week"
}: FarmCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default behavior: open farm detail
      const url = new URL(window.location.href);
      url.searchParams.set('farm', farm.id);
      window.history.pushState({}, '', url.toString());
      
      // Dispatch custom event for farm detail modal
      window.dispatchEvent(new CustomEvent('openFarmDetail', { 
        detail: { farmId: farm.id } 
      }));
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement favorite functionality
  };

  // Get primary image or fallback
  const primaryImage = farm.imageUrls?.[0];
  const location = [farm.city, farm.state].filter(Boolean).join(', ');

  return (
    <div className="farm-item group cursor-pointer" onClick={handleClick}>
      <div className="relative aspect-square rounded-xl overflow-hidden mb-2 bg-gray-100 shadow-sm">
        {/* Customer Favorite Badge */}
        {isFavorite && (
          <div className="absolute top-3 left-3 z-10 bg-white py-1 px-2 rounded-full text-xs font-semibold shadow-md flex items-center">
            <span className="text-farm-green mr-1">🌟</span>
            Customer Favorite
          </div>
        )}
        
        {/* Favorite Heart Button */}
        <div className="absolute top-3 right-3 z-10">
          <button 
            className="bg-white p-2 rounded-full shadow-md hover:scale-105 transition-transform"
            onClick={handleFavoriteClick}
          >
            <Heart 
              size={16} 
              className={isFavorite ? "fill-farm-green text-farm-green" : "text-gray-600"} 
            />
          </button>
        </div>
        
        {/* Farm Image */}
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={farm.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">🚜</div>
              <p className="text-sm">Farm Photo</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Farm Information */}
      <div>
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-medium text-gray-900 line-clamp-1 pr-2">
            {farm.name}
          </h3>
          <div className="flex items-center flex-shrink-0">
            <span className="text-farm-green text-xs">★</span>
            <span className="text-sm ml-1">{rating}</span>
          </div>
        </div>
        
        {location && (
          <p className="text-gray-600 text-sm mb-1 line-clamp-1">
            {location}
          </p>
        )}
        
        {farm.description && (
          <p className="text-gray-600 text-sm mb-1 line-clamp-1">
            {farm.description}
          </p>
        )}
        
        <p className="font-semibold text-farm-green">
          {priceRange}
        </p>
      </div>
    </div>
  );
}