'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users } from 'lucide-react';
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
}

export function FarmCard({ farm, priority = false, onClick }: FarmCardProps) {
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

  // Get primary image or fallback
  const primaryImage = farm.imageUrls?.[0];
  const location = [farm.city, farm.state].filter(Boolean).join(', ');

  return (
    <Card 
      className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
      onClick={handleClick}
    >
      {/* Farm Image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-muted">
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={`${farm.name} farm`}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-muted">
            <div className="text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No image available</p>
            </div>
          </div>
        )}
        
        {/* Farm status badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-white/90 text-black">
            Active
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {farm.name}
          </h3>
          
          {location && (
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="line-clamp-1">{location}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {farm.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {farm.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-primary">
            View Details
          </span>
          <div className="text-xs text-muted-foreground">
            {farm.createdAt && (
              <span>
                Since {new Date(farm.createdAt).getFullYear()}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}