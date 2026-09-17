import assert from "node:assert/strict";
import sharp from "sharp";

for (const [file, width, height] of [
  ["apps/mobile/assets/icon.png", 1024, 1024],
  ["store-assets/google-play/icon-512.png", 512, 512],
  ["store-assets/google-play/feature-graphic-1024x500.png", 1024, 500],
]) {
  const metadata = await sharp(file).metadata();
  assert.equal(metadata.width, width, `${file}: width`);
  assert.equal(metadata.height, height, `${file}: height`);
  assert.equal(metadata.hasAlpha, false, `${file}: store assets must not have transparency`);
}
console.log("Store asset dimensions and transparency passed.");
