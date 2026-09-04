"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeOwnAvatarAction } from "@/lib/data/profile-actions";
import { createClient } from "@/lib/supabase/client";
import { AVATAR_SOURCE_BUCKET, MAX_AVATAR_SOURCE_BYTES } from "@/lib/profile/avatar";

const ACCEPTED_SOURCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionForType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function AvatarUploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (processing) return;
    setError(null);
    const source = inputRef.current?.files?.[0];
    if (!source) { setError("Choose a JPEG, PNG, or WEBP image."); return; }
    if (!ACCEPTED_SOURCE_TYPES.has(source.type)) { setError("Avatar must be a JPEG, PNG, or WEBP image."); return; }
    if (source.size > MAX_AVATAR_SOURCE_BYTES) { setError("The selected image must be 5 MB or smaller."); return; }

    setProcessing(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("AUTHENTICATION");
      const path = `${user.id}/source-${crypto.randomUUID()}.${extensionForType[source.type]}`;
      const { error: uploadError } = await supabase.storage.from(AVATAR_SOURCE_BUCKET).upload(path, source, {
        cacheControl: "300", contentType: source.type, upsert: false,
      });
      if (uploadError) throw new Error("SOURCE_UPLOAD");
      const data = new FormData();
      data.set("sourcePath", path);
      const result = await normalizeOwnAvatarAction(data);
      if (!result.ok) { setError(result.error); return; }
      if (inputRef.current) inputRef.current.value = "";
      router.replace("/account/profile");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error && cause.message === "SOURCE_UPLOAD" ? "The selected image could not be uploaded." : "Avatar processing failed.");
    } finally { setProcessing(false); }
  }

  return <form className="avatar-upload-form" onSubmit={handleSubmit}>
    <input ref={inputRef} type="file" name="avatarSource" accept="image/jpeg,image/png,image/webp" required disabled={processing} />
    {error ? <div className="form-alert">{error}</div> : null}
    <button className="primary-button" type="submit" disabled={processing}>{processing ? "Optimizing…" : "Upload / Change"}</button>
  </form>;
}
