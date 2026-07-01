import sharp from "sharp";

const WIDTH = 320;
const HEIGHT = 240;

export async function normalizedDiff(a, b) {
  if (!a || !b) return 1;

  const [left, right] = await Promise.all([toComparable(a), toComparable(b)]);
  const max = Math.min(left.length, right.length);
  if (max === 0) return 1;

  let total = 0;
  for (let i = 0; i < max; i += 1) total += Math.abs(left[i] - right[i]);
  return total / (max * 255);
}

export async function looksDifferent(a, b, threshold = 0.012) {
  return (await normalizedDiff(a, b)) >= threshold;
}

async function toComparable(buffer) {
  return sharp(buffer)
    .resize(WIDTH, HEIGHT, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();
}
