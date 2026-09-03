"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthenticatedInternalUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import {
  AVATAR_BUCKET,
  MAX_AVATAR_BYTES,
  isOwnedAvatarPath,
} from "@/lib/profile/avatar";

const profilePath = "/account/profile";
const go = (key: "error" | "message", message: string): never =>
  redirect(`${profilePath}?${key}=${encodeURIComponent(message)}`);

export async function updateOwnProfileAction(form: FormData) {
  const access = await requireAuthenticatedInternalUser();
  const displayName = String(form.get("displayName") ?? "").trim();
  if (!displayName || displayName.length > 160)
    go("error", "Enter a display name of 160 characters or fewer.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", access.user.id);
  if (error) go("error", "Your profile could not be updated.");
  revalidatePath("/");
  go("message", "Profile updated.");
}

export async function uploadOwnAvatarAction(form: FormData) {
  const access = await requireAuthenticatedInternalUser();
  const entry = form.get("avatar");

  if (!(entry instanceof File) || entry.size === 0)
    return go("error", "Choose a JPEG, PNG, or WEBP image.");

  const file = entry;

  if (file.type !== "image/webp")
    go("error", "Avatar must be submitted as an optimized WEBP image.");
  if (file.size > MAX_AVATAR_BYTES)
    go("error", "Optimized avatar must be 1 MB or smaller.");

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", access.user.id)
    .single();
  if (readError) go("error", "Your profile could not be loaded.");
  const path = `${access.user.id}/avatar-${randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) go("error", "The avatar upload failed.");

  const { error: profileError } = await supabase.rpc("set_own_avatar_path", {
    target_avatar_path: path,
  });
  if (profileError) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    go("error", "The avatar could not be attached to your profile.");
  }
  if (
    current?.avatar_path &&
    isOwnedAvatarPath(current.avatar_path, access.user.id)
  )
    await supabase.storage.from(AVATAR_BUCKET).remove([current.avatar_path]);
  revalidatePath("/", "layout");
  go("message", "Avatar updated.");
}

export async function removeOwnAvatarAction() {
  const access = await requireAuthenticatedInternalUser();
  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", access.user.id)
    .single();
  if (readError) go("error", "Your profile could not be loaded.");
  const { error } = await supabase.rpc("set_own_avatar_path", {
    target_avatar_path: null,
  });
  if (error) go("error", "Your avatar could not be removed.");
  if (
    current?.avatar_path &&
    isOwnedAvatarPath(current.avatar_path, access.user.id)
  )
    await supabase.storage.from(AVATAR_BUCKET).remove([current.avatar_path]);
  revalidatePath("/", "layout");
  go("message", "Avatar removed.");
}
