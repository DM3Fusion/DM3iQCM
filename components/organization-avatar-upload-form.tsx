"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MAX_AVATAR_SOURCE_BYTES, ORGANIZATION_AVATAR_SOURCE_BUCKET } from "@/lib/profile/avatar";
import { normalizeOrganizationAvatarAction, removeOrganizationAvatarAction } from "@/lib/data/organization-avatar-actions";

export function OrganizationAvatarUploadForm({ organizationId, hasAvatar, showUpload = true, showRemove = true }: { organizationId: string; hasAvatar: boolean; showUpload?: boolean; showRemove?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function upload(file: File) {
    setBusy(true); setError(null);
    try {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type) || file.size > MAX_AVATAR_SOURCE_BYTES) { setError("Choose a JPEG, PNG, or WebP image up to 5 MB."); return; }
      const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const sourcePath = `${organizationId}/source-${crypto.randomUUID()}.${extension}`;
      const supabase = createClient();
      const result = await supabase.storage.from(ORGANIZATION_AVATAR_SOURCE_BUCKET).upload(sourcePath, file, { contentType: file.type, cacheControl: "300", upsert: false });
      if (result.error) { setError("The organization avatar could not be uploaded."); return; }
      const form = new FormData(); form.set("organizationId", organizationId); form.set("sourcePath", sourcePath);
      const normalized = await normalizeOrganizationAvatarAction(form);
      if (!normalized.ok) setError(normalized.error ?? "The organization avatar could not be processed."); else router.refresh();
    } finally { setBusy(false); }
  }
  return <div className="organization-avatar-upload">
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} />
    {showUpload ? <button type="button" className="primary-button" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? "Processing…" : "Upload / Change"}</button> : null}
    {showRemove && hasAvatar ? <form action={async (form) => { setBusy(true); setError(null); const result = await removeOrganizationAvatarAction(form); if (!result.ok) setError(result.error ?? "The organization avatar could not be removed."); else router.refresh(); setBusy(false); }}><input type="hidden" name="organizationId" value={organizationId} /><button type="submit" className="text-button" disabled={busy}>Remove</button></form> : null}
    {error ? <p className="form-alert">{error}</p> : null}
  </div>;
}
