import sharp from "sharp";
import {
  AVATAR_OUTPUT_SIZE,
  AVATAR_WEBP_QUALITY,
  MAX_AVATAR_BYTES,
  MAX_AVATAR_SOURCE_BYTES,
} from "./avatar.ts";

const MAX_AVATAR_PIXELS = 40_000_000;
const MIN_WEBP_QUALITY = 60;
const QUALITY_STEP = 8;

export class AvatarNormalizationError extends Error {
  readonly reason: "invalid" | "unsafe" | "oversized";

  constructor(reason: "invalid" | "unsafe" | "oversized") {
    super(reason);
    this.reason = reason;
  }
}

const formatForExtension: Record<string, "jpeg" | "png" | "webp"> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "webp",
};

export async function normalizeAvatarSource(
  source: Buffer,
  declaredExtension: string,
) {
  if (source.length === 0 || source.length > MAX_AVATAR_SOURCE_BYTES) {
    throw new AvatarNormalizationError("oversized");
  }

  const expectedFormat = formatForExtension[declaredExtension.toLowerCase()];
  if (!expectedFormat) throw new AvatarNormalizationError("invalid");

  const image = sharp(source, {
    failOn: "error",
    limitInputPixels: MAX_AVATAR_PIXELS,
  });
  const metadata = await image.metadata().catch(() => {
    throw new AvatarNormalizationError("invalid");
  });

  if (metadata.width && metadata.height && metadata.width * metadata.height > MAX_AVATAR_PIXELS) {
    throw new AvatarNormalizationError("unsafe");
  }
  if (metadata.format !== expectedFormat || !metadata.width || !metadata.height) {
    throw new AvatarNormalizationError("invalid");
  }

  for (
    let quality = AVATAR_WEBP_QUALITY * 100;
    quality >= MIN_WEBP_QUALITY;
    quality -= QUALITY_STEP
  ) {
    const output = await sharp(source, {
      failOn: "error",
      limitInputPixels: MAX_AVATAR_PIXELS,
    })
      .rotate()
      .resize(AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality })
      .toBuffer();

    if (output.length <= MAX_AVATAR_BYTES) return output;
  }

  throw new AvatarNormalizationError("oversized");
}
