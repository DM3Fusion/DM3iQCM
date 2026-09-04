import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("components/avatar-upload-form.tsx", "utf8");

test("avatar processing decodes before rendering and revokes after conversion", () => {
  assert.match(source, /typeof image\.decode === "function"/);
  assert.match(source, /await image\.decode\(\)/);
  assert.match(
    source,
    /const \{ image, objectUrl \} = await loadImage\(file\)/,
  );
  assert.ok(
    source.indexOf("canvas.toBlob") <
      source.lastIndexOf("URL.revokeObjectURL(objectUrl)"),
  );
});

test("avatar processing preserves the WebP-only contract and distinguishes failures", () => {
  assert.match(
    source,
    /canvas\.toBlob\(resolve, "image\/webp", AVATAR_WEBP_QUALITY\)/,
  );
  assert.match(source, /class AvatarWebpEncodeError extends Error/);
  assert.match(source, /class AvatarDecodeError extends Error/);
  assert.match(source, /This browser cannot prepare WebP avatars/);
  assert.match(source, /This image could not be decoded or rendered/);
  assert.doesNotMatch(source, /image\/png.*upload|image\/jpeg.*upload/);
});

test("all image-processing failures clean up the object URL", () => {
  assert.match(
    source,
    /catch \(cause\) \{[\s\S]*URL\.revokeObjectURL\(objectUrl\)/,
  );
  assert.match(source, /finally \{[\s\S]*URL\.revokeObjectURL\(objectUrl\)/);
});
