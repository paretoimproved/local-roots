'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { X, MapPin, Mail, Calendar, Users, Star, ArrowLeft, ArrowRight, Package } from 'lucide-react';
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
  const [isDesktop, setIsDesktop] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [activeImage, setActiveImage] = useState(0);

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

  // reset carousel whenever farm changes
  useEffect(() => {
    setActiveImage(0);
  }, [farmId]);

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

  // Track viewport size to toggle drawer vs modal behaviour
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

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

  // Swipe gesture handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    const touch = e.targetTouches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;

    // On mobile drawer use vertical swipe to close
    if (!isDesktop && distanceY < -minSwipeDistance) {
      handleClose();
      return;
    }

    // On desktop allow horizontal gesture to close as fallback
    if (isDesktop && distanceX < -minSwipeDistance) {
      handleClose();
    }
  };

  // Don't render if no farmId
  if (!farmId) return null;

  const location = farm ? [farm.city, farm.state].filter(Boolean).join(', ') : '';
  const galleryImages = useMemo(() => farm?.imageUrls ?? [], [farm?.imageUrls]);
  const currentImage = galleryImages[activeImage] ?? null;
  const remainingPhotos = Math.max(galleryImages.length - 1, 0);

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

      {/* Drawer / Modal Container */}
      <div
        className={`fixed inset-0 z-50 flex ${
          isDesktop ? 'items-center justify-center' : 'items-end justify-center'
        } pointer-events-none`}
      >
        <div
          className={`${
            isDesktop
              ? `pointer-events-auto w-full max-w-3xl rounded-2xl bg-background shadow-2xl transition-all duration-300 ease-out ${
                  isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`
              : `pointer-events-auto h-[92%] w-full rounded-t-3xl bg-background shadow-2xl transition-transform duration-300 ease-out ${
                  isOpen ? 'translate-y-0' : 'translate-y-full'
                }`
          } overflow-hidden`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="farm-detail-title"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
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
                {currentImage ? (
                  <div className="relative aspect-[16/9] bg-muted">
                    <Image
                      src={currentImage}
                      alt={`${farm.name} farm image ${activeImage + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 600px"
                      priority
                    />
                    {galleryImages.length > 1 && (
                      <>
                        <button
                          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white transition hover:bg-black/80"
                          onClick={() =>
                            setActiveImage((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))
                          }
                          aria-label="Previous image"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <button
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white transition hover:bg-black/80"
                          onClick={() =>
                            setActiveImage((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))
                          }
                          aria-label="Next image"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                        {remainingPhotos > 0 && (
                          <div className="absolute bottom-2 right-2">
                            <Badge variant="secondary" className="bg-black/50 text-white">
                              {activeImage + 1} / {galleryImages.length}
                            </Badge>
                          </div>
                        )}
                      </>
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
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                      <h3 className="text-2xl font-bold">{farm.name}</h3>
                      {typeof farm.rating === 'number' && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="h-4 w-4 text-amber-500" />
                          <span className="font-semibold text-foreground">{farm.rating.toFixed(1)}</span>
                          <span className="text-xs">Farmer rating</span>
                        </div>
                      )}
                    </div>
                    {location && (
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{location}</span>
                      </div>
                    )}
                  </div>

                  {farm.categories && farm.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {farm.categories.map((category) => (
                        <Badge key={category} variant="outline" className="uppercase tracking-wide text-xs">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {(farm.pricePerWeek || farm.deliveryOptions || farm.distanceMiles) && (
                    <div className="rounded-lg border p-4 bg-muted/40 space-y-2">
                      {farm.pricePerWeek && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">CSA share from</span>
                          <span className="font-semibold text-foreground">${farm.pricePerWeek}/week</span>
                        </div>
                      )}
                      {farm.deliveryOptions && farm.deliveryOptions.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Options</span>
                          <span className="font-medium text-foreground">{farm.deliveryOptions.join(' • ')}</span>
                        </div>
                      )}
                      {typeof farm.distanceMiles === 'number' && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Distance</span>
                          <span className="font-medium text-foreground">{farm.distanceMiles.toFixed(1)} miles</span>
                        </div>
                      )}
                    </div>
                  )}

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
                      <div className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <h5 className="font-medium">Weekly Harvest Share</h5>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Seasonal assortment of produce and pantry favorites tailored to member preferences.
                            </p>
                          </div>
                          <Badge variant="default">Popular</Badge>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="text-muted-foreground">Includes 8–10 items</span>
                          <span className="font-semibold">${farm.pricePerWeek ? farm.pricePerWeek + 5 : 35}/week</span>
                        </div>
                        <Button size="sm" className="w-full" variant="outline">
                          View share details
                        </Button>
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
              <Button className="flex-1" onClick={() => alert('Subscribe functionality coming soon!')}>
                View CSA Shares
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
