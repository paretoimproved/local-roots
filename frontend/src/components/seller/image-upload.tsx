"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";

interface ImageUploadProps {
  currentUrl: string | null;
  storagePath: string;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
  placeholderText: string;
  aspectRatio?: string;
  maxHeight?: number;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function extFromType(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function ImageUpload({
  currentUrl,
  storagePath,
  onUploaded,
  onRemoved,
  placeholderText,
  aspectRatio = "3/1",
  maxHeight = 200,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullPath = `images/${storagePath}`;

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Only JPEG, PNG, and WebP images are allowed.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("Image must be under 5 MB.");
        return;
      }

      setUploading(true);
      try {
        const supabase = getSupabase();
        const ext = extFromType(file.type);
        const path = `${fullPath}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(path, file, { upsert: true });

        if (uploadError) {
          console.error("Supabase upload error:", uploadError);
          setError("Upload failed. Please try again.");
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("images").getPublicUrl(path);

        onUploaded(publicUrl);
      } catch (err) {
        console.error("Upload error:", err);
        setError(
          err instanceof Error && err.message.includes("not configured")
            ? err.message
            : "Upload failed. Please try again.",
        );
      } finally {
        setUploading(false);
      }
    },
    [fullPath, onUploaded],
  );

  const handleRemove = useCallback(async () => {
    setError(null);
    setUploading(true);
    try {
      const supabase = getSupabase();
      // Try removing all possible extensions
      const paths = ["jpg", "png", "webp"].map((ext) => `${fullPath}.${ext}`);
      await supabase.storage.from("images").remove(paths);
      onRemoved();
    } catch (err) {
      console.error("Remove error:", err);
      setError(
        err instanceof Error && err.message.includes("not configured")
          ? err.message
          : "Failed to remove image.",
      );
    } finally {
      setUploading(false);
    }
  }, [fullPath, onRemoved]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="grid gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />

      {currentUrl ? (
        /* ---- Image preview ---- */
        <div
          className="relative overflow-hidden rounded-lg"
          style={{ aspectRatio, maxHeight }}
        >
          <Image
            src={currentUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 600px"
          />

          {/* Spinner overlay */}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}

          {/* Remove button */}
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute right-2 top-2 rounded-md bg-black/50 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            >
              Remove
            </button>
          )}
        </div>
      ) : (
        /* ---- Dropzone ---- */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          disabled={uploading}
          className="flex items-center justify-center rounded-lg border-2 border-dashed border-[color:var(--lr-border)] text-[color:var(--lr-muted)] transition-colors hover:border-[color:var(--lr-accent)] hover:text-[color:var(--lr-accent)] disabled:opacity-50"
          style={{ aspectRatio, maxHeight }}
        >
          {uploading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              {/* Camera SVG icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              <span className="text-sm">{placeholderText}</span>
            </div>
          )}
        </button>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
