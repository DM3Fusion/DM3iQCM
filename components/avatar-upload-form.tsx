"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadOwnAvatarAction } from "@/lib/data/profile-actions";
import {
  AVATAR_OUTPUT_SIZE,
  AVATAR_WEBP_QUALITY,
  MAX_AVATAR_SOURCE_BYTES,
} from "@/lib/profile/avatar";

const ACCEPTED_SOURCE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

class AvatarDecodeError extends Error {}
class AvatarWebpEncodeError extends Error {}

async function loadImage(
  file: File,
): Promise<{ image: HTMLImageElement; objectUrl: string }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new AvatarDecodeError());
      image.src = objectUrl;
    });

    if (typeof image.decode === "function") {
      try {
        await image.decode();
      } catch {
        // Some Safari versions reject decode() after onload even when the
        // image has usable dimensions. Keep the already-loaded image in that case.
        if (!image.naturalWidth || !image.naturalHeight) {
          throw new AvatarDecodeError();
        }
      }
    }

    return { image, objectUrl };
  } catch (cause) {
    URL.revokeObjectURL(objectUrl);
    throw cause instanceof AvatarDecodeError ? cause : new AvatarDecodeError();
  }
}

async function optimizeAvatar(file: File): Promise<File> {
  const { image, objectUrl } = await loadImage(file);

  try {
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new AvatarDecodeError();
    }

    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = Math.floor((image.naturalWidth - sourceSize) / 2);
    const sourceY = Math.floor((image.naturalHeight - sourceSize) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_OUTPUT_SIZE;
    canvas.height = AVATAR_OUTPUT_SIZE;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new AvatarDecodeError();
    }

    try {
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        AVATAR_OUTPUT_SIZE,
        AVATAR_OUTPUT_SIZE,
      );
    } catch {
      throw new AvatarDecodeError();
    }

    let blob: Blob | null;
    try {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/webp", AVATAR_WEBP_QUALITY);
      });
    } catch {
      throw new AvatarWebpEncodeError();
    }

    if (!blob || blob.type !== "image/webp") {
      throw new AvatarWebpEncodeError();
    }

    return new File([blob], "avatar.webp", {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    // The image may still need the source URL while drawImage/toBlob finish.
    URL.revokeObjectURL(objectUrl);
  }
}

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

    if (!source) {
      setError("Choose a JPEG, PNG, or WEBP image.");
      return;
    }

    if (!ACCEPTED_SOURCE_TYPES.has(source.type)) {
      setError("Avatar must be a JPEG, PNG, or WEBP image.");
      return;
    }

    if (source.size > MAX_AVATAR_SOURCE_BYTES) {
      setError("The selected image must be 5 MB or smaller.");
      return;
    }

    setProcessing(true);

    try {
      const optimized = await optimizeAvatar(source);
      const formData = new FormData();
      formData.set("avatar", optimized);

      const result = await uploadOwnAvatarAction(formData);

      if (!result.ok) {
        setError(result.error);
        setProcessing(false);
        return;
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      router.replace("/account/profile");
      router.refresh();
      setProcessing(false);
    } catch (cause) {
      setError(
        cause instanceof AvatarWebpEncodeError
          ? "This browser cannot prepare WebP avatars. Please try another current browser."
          : cause instanceof AvatarDecodeError
            ? "This image could not be decoded or rendered. Please choose another image."
            : "The avatar could not be processed.",
      );
      setProcessing(false);
    }
  }

  return (
    <form
      className="avatar-upload-form"
      onSubmit={handleSubmit}
      encType="multipart/form-data"
    >
      <input
        ref={inputRef}
        type="file"
        name="avatarSource"
        accept="image/jpeg,image/png,image/webp"
        required
        disabled={processing}
      />

      {error ? <div className="form-alert">{error}</div> : null}

      <button className="primary-button" type="submit" disabled={processing}>
        {processing ? "Optimizing…" : "Upload / Change"}
      </button>
    </form>
  );
}
