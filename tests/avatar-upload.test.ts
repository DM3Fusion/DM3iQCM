import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import test from "node:test";
import {
  AvatarNormalizationError,
  normalizeAvatarSource,
} from "../lib/profile/avatar-normalization.ts";
import { MAX_AVATAR_SOURCE_BYTES } from "../lib/profile/avatar.ts";

const clientSource = readFileSync("components/avatar-upload-form.tsx", "utf8");
const actionSource = readFileSync("lib/data/profile-actions.ts", "utf8");
const normalizerSource = readFileSync("lib/profile/avatar-normalization.ts", "utf8");
const migrationSource = readFileSync("supabase/migrations/20260904050000_dm3iqcm_avatar_source_storage.sql", "utf8");

async function fixture(format: "jpeg" | "png" | "webp") {
  return sharp({
    create: {
      width: 640,
      height: 320,
      channels: format === "png" ? 4 : 3,
      background: { r: 30, g: 120, b: 200, alpha: format === "png" ? 0.5 : 1 },
    },
  })[format]().toBuffer();
}

test("JPEG, transparent PNG, and WebP sources normalize to 512x512 WebP", async () => {
  for (const format of ["jpeg", "png", "webp"] as const) {
    const output = await normalizeAvatarSource(await fixture(format), format);
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 512);
    assert.equal(metadata.height, 512);
    assert.ok(output.length <= 1024 * 1024);
  }
});

test("declared MIME/extension spoofing and malformed sources are rejected after decode", async () => {
  await assert.rejects(
    normalizeAvatarSource(await fixture("png"), "jpg"),
    (error: unknown) => error instanceof AvatarNormalizationError && error.reason === "invalid",
  );
  await assert.rejects(normalizeAvatarSource(Buffer.from("not an image"), "png"));
});

test("source size is bounded before image processing", async () => {
  await assert.rejects(
    normalizeAvatarSource(Buffer.alloc(MAX_AVATAR_SOURCE_BYTES + 1), "jpg"),
    (error: unknown) => error instanceof AvatarNormalizationError && error.reason === "oversized",
  );
});

test("Safari no longer requires browser canvas WebP encoding", () => {
  assert.doesNotMatch(clientSource, /canvas\.toBlob/);
  assert.doesNotMatch(clientSource, /AvatarWebpEncodeError/);
  assert.match(clientSource, /AVATAR_SOURCE_BUCKET/);
  assert.match(actionSource, /normalizeAvatarSource/);
  assert.match(normalizerSource, /limitInputPixels/);
  assert.match(actionSource, /set_own_avatar_path/);
});

test("temporary source storage is private and user-folder scoped", () => {
  assert.match(migrationSource, /'user-avatar-sources'/g);
  assert.match(migrationSource, /5242880/);
  assert.match(migrationSource, /public, file_size_limit[\s\S]*false/);
  assert.match(migrationSource, /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
  assert.match(actionSource, /\.from\(AVATAR_SOURCE_BUCKET\)[\s\S]*\.remove\(\[sourcePath\]\)/);
});
