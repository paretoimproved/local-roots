/**
 * This component provides a solution for when Unsplash images are unavailable
 * It ensures farm images always display something attractive even without the backend running
 */
import Image from "next/image";
import { useState, useEffect } from "react";

export function FarmImageWrapper({ 
  src, 
  alt, 
  className = "", 
  fill = false,
  width,
  height,
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
  const [imageSrc, setImageSrc] = useState(src);
  
  useEffect(() => {
    // Use different placeholder if it's an Unsplash image URL
    if (src.includes('unsplash.com')) {
      // Generate a color based on the text
      const stringToColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const color = Math.abs(hash).toString(16).substring(0, 6).padStart(6, '0');
        return color;
      };
      
      const nameText = alt.trim() || 'Local Farm';
      const color = stringToColor(nameText);
      const fallbackSrc = `https://placehold.co/800x600/${color}/ffffff?text=${encodeURIComponent(nameText)}`;
      setImageSrc(fallbackSrc);
    }
  }, [src, alt]);
  
  const handleError = () => {
    // If any image fails to load, use a fallback
    if (imageSrc !== src) return; // Don't replace an already replaced image
    
    const nameText = alt.trim() || 'Local Farm';
    // Generate a random color for visual variety
    const colors = ['22c55e', 'f97316', '8b5cf6', '06b6d4', 'ec4899'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setImageSrc(`https://placehold.co/800x600/${randomColor}/ffffff?text=${encodeURIComponent(nameText)}`);
  };
  
  return (
    <Image
      src={imageSrc}
      alt={alt}
      className={className}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      sizes={sizes}
      priority={priority}
      onError={handleError}
    />
  );
} 