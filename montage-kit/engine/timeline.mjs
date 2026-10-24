// 《一口》v3: the relay of styles. 100 bpm, one beat = 0.6 s, 30 fps.
// Every step changes the style inside the hole; the ring around it takes over the style the
// hole just left, one step later. Repeating a style lets the ring catch up.
export const FPS = 30;
export const BEAT = 0.6;
export const INTRO = 6;          // beats of donut before the relay starts
export const OUTRO_AT = 35;      // beat where the ring is donut again and the camera starts to pull back
export const BITE_BEAT = 39;
export const DURATION = 43 * BEAT;
// Radius of the hole at full zoom: the ring covers almost the whole frame around it.
export const HOLE_R = 1080 * 0.36;

const A = ['sketch', 'ink', 'woodcut', 'popart', 'oil', 'pixel', 'stained', 'cave', 'blueprint', 'ukiyo', 'embroidery', 'watercolor'];
const B = ['xray', 'papercut', 'scope', 'mosaic', 'thermal', 'crayon', 'porcelain', 'rubberhose', 'pointillism', 'clay', 'sketch', 'ink'];
const C = ['woodcut', 'stained', 'oil', 'ukiyo', 'pixel', 'watercolor', 'popart', 'embroidery'];

// [beat, style] for the hole.
export const STEPS = [
  [0, 'donut'],
  ...A.map((s, i) => [INTRO + i, s]),
  ...B.map((s, i) => [18 + i * 0.5, s]),
  [24, 'muybridge'], [25, 'muybridge'],          // the brake: hold on the first film ever, ring catches up
  ...C.map((s, i) => [26 + i, s]),
  [34, 'donut'], [OUTRO_AT, 'donut'],
];

export const STYLES = [...new Set(STEPS.map(([, s]) => s))];

// Which style is in the hole and which in the ring at time t, and how far into the step we are.
export function stepAt(t) {
  const beat = t / BEAT;
  let k = 0;
  while (k + 1 < STEPS.length && STEPS[k + 1][0] <= beat) k++;
  const [b0, inner] = STEPS[k];
  const b1 = STEPS[k + 1]?.[0] ?? DURATION / BEAT;
  return {
    k,
    inner,
    outer: STEPS[Math.max(0, k - 1)][1],
    p: (beat - b0) / (b1 - b0),
    since: (beat - b0) * BEAT,
    changedOuter: k > 0 && STEPS[k - 1][1] !== STEPS[k][1] || false,
  };
}
