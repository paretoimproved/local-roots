"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { sellerApi, type BoxPreview } from "@/lib/seller-api";
import { session } from "@/lib/session";
import { useToast } from "@/components/toast";
import { friendlyErrorMessage } from "@/lib/ui";
import { ImageUpload } from "@/components/seller/image-upload";

export default function BoxPreviewPage() {
  const params = useParams<{ storeId: string; planId: string }>();
  const storeId = params.storeId;
  const planId = params.planId;
  const router = useRouter();
  const { showToast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [previews, setPreviews] = useState<BoxPreview[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [cycleDate, setCycleDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [body, setBody] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = session.getToken();
    if (!t) {
      router.replace("/seller/login");
      return;
    }
    setToken(t);
  }, [router]);

  const loadPreviews = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await sellerApi.listBoxPreviews(token, storeId, planId);
      setPreviews(data);
    } catch (e) {
      showToast({ kind: "error", message: friendlyErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, [token, storeId, planId, showToast]);

  useEffect(() => {
    loadPreviews();
  }, [loadPreviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !cycleDate.trim()) return;
    setSaving(true);
    try {
      await sellerApi.createBoxPreview(token, storeId, planId, {
        cycle_date: cycleDate,
        body,
        photo_url: photoUrl,
      });
      showToast({ kind: "success", message: "Preview saved" });
      setBody("");
      setPhotoUrl(null);
      await loadPreviews();
    } catch (e) {
      showToast({ kind: "error", message: friendlyErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (previewId: string) => {
    if (!token) return;
    try {
      await sellerApi.deleteBoxPreview(token, storeId, planId, previewId);
      showToast({ kind: "success", message: "Preview deleted" });
      setPreviews((prev) => prev.filter((p) => p.id !== previewId));
    } catch (e) {
      showToast({ kind: "error", message: friendlyErrorMessage(e) });
    }
  };

  return (
    <div className="grid gap-6">
      <nav className="text-sm text-[color:var(--lr-muted)]">
        <button
          type="button"
          onClick={() => router.back()}
          className="hover:text-[color:var(--lr-ink)] hover:underline"
        >
          &larr; Back
        </button>
      </nav>

      <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
        What&apos;s in the Box
      </h1>
      <p className="text-sm text-[color:var(--lr-muted)]">
        Let subscribers know what to expect in their next pickup.
      </p>

      {/* New preview form */}
      <form onSubmit={handleSubmit} className="lr-card p-5 grid gap-4">
        <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
          Post a preview
        </h2>

        <label className="lr-field grid gap-1">
          <span className="text-sm font-medium text-[color:var(--lr-ink)]">
            Cycle date
          </span>
          <input
            type="date"
            value={cycleDate}
            onChange={(e) => setCycleDate(e.target.value)}
            className="rounded-lg border border-[color:var(--lr-border)] bg-white px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="lr-field grid gap-1">
          <span className="text-sm font-medium text-[color:var(--lr-ink)]">
            What&apos;s included
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="This week: spring greens, radishes, fresh eggs..."
            rows={3}
            className="rounded-lg border border-[color:var(--lr-border)] bg-white px-3 py-2 text-sm"
          />
        </label>

        <div className="grid gap-1">
          <span className="text-sm font-medium text-[color:var(--lr-ink)]">
            Photo (optional)
          </span>
          <ImageUpload
            currentUrl={photoUrl}
            storagePath={`previews/${planId}/${cycleDate}`}
            onUploaded={(url) => setPhotoUrl(url)}
            onRemoved={() => setPhotoUrl(null)}
            placeholderText="Add a photo"
            aspectRatio="16/9"
            maxHeight={200}
          />
        </div>

        <button
          type="submit"
          disabled={saving || !cycleDate.trim()}
          className="lr-btn lr-btn-primary"
        >
          {saving ? "Saving..." : "Save preview"}
        </button>
      </form>

      {/* Existing previews */}
      <section className="grid gap-3">
        <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
          Past previews
        </h2>
        {loading ? (
          <p className="text-sm text-[color:var(--lr-muted)]">Loading...</p>
        ) : previews.length === 0 ? (
          <p className="text-sm text-[color:var(--lr-muted)]">
            No previews yet. Post one above to let subscribers know what&apos;s coming.
          </p>
        ) : (
          previews.map((p) => (
            <div key={p.id} className="lr-card p-4 grid gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[color:var(--lr-ink)]">
                  {p.cycle_date}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="text-xs text-[color:var(--lr-muted)] hover:text-rose-600"
                >
                  Delete
                </button>
              </div>
              {p.body ? (
                <p className="text-sm text-[color:var(--lr-muted)] whitespace-pre-line">
                  {p.body}
                </p>
              ) : null}
              {p.photo_url ? (
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg">
                  <Image
                    src={p.photo_url}
                    alt="Box preview"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                </div>
              ) : null}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
