"use client";

import { FormEvent, useRef, useState } from "react";
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

async function loadImage(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Image could not be decoded."));
      image.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function optimizeAvatar(file: File): Promise<File> {
  const image = await loadImage(file);

  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error("The selected image has invalid dimensions.");
  }

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = Math.floor((image.naturalWidth - sourceSize) / 2);
  const sourceY = Math.floor((image.naturalHeight - sourceSize) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image processing is unavailable in this browser.");
  }

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

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", AVATAR_WEBP_QUALITY);
  });

  if (!blob || blob.type !== "image/webp") {
    throw new Error("This browser could not create the optimized avatar.");
  }

  return new File([blob], "avatar.webp", {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

export function AvatarUploadForm() {
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

      await uploadOwnAvatarAction(formData);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
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

      <button
        className="primary-button"
        type="submit"
        disabled={processing}
      >
        {processing ? "Optimizing…" : "Upload / Change"}
      </button>
    </form>
  );
}
