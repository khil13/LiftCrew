"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;

/** Uploads to avatars/<userId>/ and submits the public URL as `avatar_url`. */
export default function AvatarUpload({ userId, defaultUrl }: { userId: string; defaultUrl: string | null }) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Use a JPG, PNG, or WebP.");
    if (file.size > MAX_BYTES) return setError("Photo must be under 5 MB.");
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const ext = file.type.split("/")[1];
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    setBusy(false);
    if (error) return setError("Upload failed. Please try again.");
    setUrl(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt="Your photo" className="h-full w-full object-cover" />}
      </div>
      <div className="text-sm">
        <label className="cursor-pointer font-semibold text-brand-600">
          {busy ? "Uploading…" : url ? "Change photo" : "Add a photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onChange} />
        </label>
        <p className="text-slate-500">A clear photo of your face helps you get hired.</p>
        {error && <p className="text-red-600">{error}</p>}
      </div>
      <input type="hidden" name="avatar_url" value={url} />
    </div>
  );
}
