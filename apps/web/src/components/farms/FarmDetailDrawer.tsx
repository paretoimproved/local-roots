'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { X, MapPin, Mail, Phone, Globe, Calendar, Users } from 'lucide-react';
import Image from 'next/image';
import { getFarm } from '@/api/farms.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

export function FarmDetailDrawer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const farmId = searchParams.get('farm');
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Fetch farm details when drawer opens
  const { data: farm, isLoading, error } = useQuery({
    queryKey: ['farm', farmId],
    queryFn: () => getFarm(farmId!),
    enabled: !!farmId,
  });

  // Handle drawer open/close based on URL
  useEffect(() => {
    if (farmId && !isClosing) {
      setIsOpen(true);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    } else {
      setIsOpen(false);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [farmId, isClosing]);

  // Handle keyboard events
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Listen for custom farm detail event
  useEffect(() => {
    const handleOpenFarmDetail = (e: CustomEvent) => {
      const { farmId } = e.detail;
      if (farmId) {
        const url = new URL(window.location.href);
        url.searchParams.set('farm', farmId);
        router.push(url.pathname + url.search, { scroll: false });
      }
    };

    window.addEventListener('openFarmDetail', handleOpenFarmDetail as EventListener);
    return () => {
      window.removeEventListener('openFarmDetail', handleOpenFarmDetail as EventListener);
    };
  }, [router]);

  const handleClose = () => {
    setIsClosing(true);
    
    // Start close animation
    setIsOpen(false);
    
    // Update URL after animation
    setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete('farm');
      router.push(url.pathname + url.search, { scroll: false });
      setIsClosing(false);
    }, 300); // Match animation duration
  };

  // Don't render if no farmId
  if (!farmId) return null;

  const location = farm ? [farm.city, farm.state].filter(Boolean).join(', ') : '';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-[500px] lg:w-[600px] bg-background shadow-xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="farm-detail-title"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 id="farm-detail-title" className="text-lg font-semibold">
              Farm Details
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="rounded-full h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Spinner className="h-8 w-8" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <p className="text-muted-foreground mb-4">
                  Failed to load farm details
                </p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : farm ? (
              <div className="space-y-6">
                {/* Image Gallery */}
                {farm.imageUrls && farm.imageUrls.length > 0 ? (
                  <div className="relative aspect-[16/9] bg-muted">
                    <Image
                      src={farm.imageUrls[0]}
                      alt={`${farm.name} farm`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 600px"
                      priority
                    />
                    {farm.imageUrls.length > 1 && (
                      <div className="absolute bottom-2 right-2">
                        <Badge variant="secondary" className="bg-black/50 text-white">
                          +{farm.imageUrls.length - 1} more photos
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-muted flex items-center justify-center">
                    <Users className="h-16 w-16 text-muted-foreground/50" />
                  </div>
                )}

                {/* Farm Information */}
                <div className="px-6 space-y-6">
                  {/* Title and Location */}
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{farm.name}</h3>
                    {location && (
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{location}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {farm.description && (
                    <div>
                      <h4 className="font-semibold mb-2">About</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {farm.description}
                      </p>
                    </div>
                  )}

                  {/* Contact Information */}
                  <div>
                    <h4 className="font-semibold mb-3">Contact Information</h4>
                    <div className="space-y-2">
                      {farm.address && (
                        <div className="flex items-start text-sm">
                          <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                          <div>
                            <p>{farm.address}</p>
                            {location && <p>{location} {farm.zipCode}</p>}
                          </div>
                        </div>
                      )}
                      
                      {/* Placeholder contact info - would come from real data */}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 mr-2" />
                        <span>Contact through platform</span>
                      </div>
                    </div>
                  </div>

                  {/* Farm Stats */}
                  <div>
                    <h4 className="font-semibold mb-3">Farm Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Established</p>
                        <p className="font-medium">
                          {farm.createdAt ? new Date(farm.createdAt).getFullYear() : 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant="secondary" className="mt-1">
                          Active
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* CSA Shares Section (placeholder) */}
                  <div className="border-t pt-6">
                    <h4 className="font-semibold mb-3">Available CSA Shares</h4>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="font-medium">Weekly Vegetable Box</h5>
                            <p className="text-sm text-muted-foreground">
                              Fresh seasonal produce delivered weekly
                            </p>
                          </div>
                          <Badge>Available</Badge>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-lg font-semibold">$35/week</span>
                          <Button size="sm">Subscribe</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="border-t p-4">
            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => {
                // Navigate to subscribe flow (future implementation)
                alert('Subscribe functionality coming soon!');
              }}>
                View CSA Shares
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}