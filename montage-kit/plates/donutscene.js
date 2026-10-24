// The bakery counter seen from above, with one sugar-glazed ring donut whose hole is the film's ring.
// Shared by the opening (donut.js) and the ending (donutend.js, which also takes the bite).
import { createCanvas } from '@napi-rs/canvas';
import { hash, rng, clamp01, lerp, grain } from './lib.js';

// Donut geometry in units of the hole radius.
const RI = 1, RO = 2.65, RM = (RI + RO) / 2, A = (RO - RI) / 2;
// Texture pixels per unit; the texture is reused at every zoom, so it is made large once.
const TS = 380;
const SIZE = Math.ceil(2 * (RO + 0.05) * TS);

function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const n = (i, j) => hash((xi + i) * 57.3 + (yi + j) * 113.1 + seed * 7.7);
  return lerp(lerp(n(0, 0), n(1, 0), u), lerp(n(0, 1), n(1, 1), u), v);
}
const fbm = (x, y, seed) => vnoise(x, y, seed) * 0.55 + vnoise(x * 2.1, y * 2.1, seed + 3) * 0.3 + vnoise(x * 4.3, y * 4.3, seed + 9) * 0.15;

// Teeth marks: a scalloped bite out of the upper right of the ring.
const BITE = [[1.05, 0.7], [0.75, 0.68], [0.45, 0.66], [0.15, 0.62]].map(([a, r], i) => {
  const ang = -0.95 + (a - 0.6) * 1.05;
  const d = RO + 0.05 - r * 0.85 + (i % 2) * 0.07;
  return { x: Math.cos(ang) * d, y: Math.sin(ang) * d, r };
});
function biteDist(x, y) {
  let m = 9;
  for (const b of BITE) m = Math.min(m, Math.hypot(x - b.x, y - b.y) - b.r);
  return m; // < 0 inside the bite
}

function buildDonut(bitten) {
  const c = createCanvas(SIZE, SIZE);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(SIZE, SIZE);
  const px = img.data;
  const L = [-0.48, -0.58, 0.66]; // light from the window, upper left
  const Ln = Math.hypot(...L);
  L[0] /= Ln; L[1] /= Ln; L[2] /= Ln;
  const H = [L[0], L[1], L[2] + 1];
  const Hn = Math.hypot(...H);
  const half = SIZE / 2;
  const height = (u) => Math.pow(Math.max(0, 1 - u * u), 0.5) * 0.8;
  for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE; i++) {
      const x = (i - half) / TS, y = (j - half) / TS;
      const d = Math.hypot(x, y);
      if (d < RI - 0.01 || d > RO + 0.01) continue;
      const theta = Math.atan2(y, x);
      const u = (d - RM) / A;
      // Lumpy, slightly uneven ring: real donuts are not lathe-turned.
      const lump = (fbm(Math.cos(theta) * 2 + 5, Math.sin(theta) * 2 + 5, 1) - 0.5) * 0.08;
      const uu = u * (1 - lump);
      if (Math.abs(uu) > 1) continue;
      const bd = bitten ? biteDist(x, y) : 9;
      if (bd < 0) continue;
      const z = height(uu);
      const dz = (height(uu + 0.01) - height(uu - 0.01)) / 0.02 / A;
      let nx = -dz * Math.cos(theta), ny = -dz * Math.sin(theta), nz = 1;
      // Pores and bumps in the fried surface.
      const bump = fbm(x * 9, y * 9, 4) - 0.5;
      nx += bump * 0.35; ny += (fbm(x * 9 + 3, y * 9, 5) - 0.5) * 0.35;
      const nn = Math.hypot(nx, ny, nz);
      nx /= nn; ny /= nn; nz /= nn;
      const lam = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);

      // Fried dough: golden on top, deeper brown on the shoulders, a pale band where it floated.
      const shoulder = clamp01((Math.abs(uu) - 0.45) / 0.45);
      const pale = Math.exp(-Math.pow((Math.abs(uu) - 0.93) / 0.05, 2));
      let r = lerp(188, 128, shoulder), g = lerp(112, 66, shoulder), b = lerp(48, 26, shoulder);
      r = lerp(r, 226, pale * 0.6); g = lerp(g, 186, pale * 0.6); b = lerp(b, 120, pale * 0.6);
      const mottle = fbm(x * 3, y * 3, 2) - 0.5;
      r += mottle * 40; g += mottle * 28; b += mottle * 14;

      // Sugar glaze over the top, with drips running down the sides.
      const dripN = fbm(theta * 3.2 + (u > 0 ? 0 : 40), 0.5, 8);
      const drip = Math.pow(dripN, 3) * 0.55;
      const edge = 0.58 + drip;
      let glaze = clamp01((edge - Math.abs(uu)) / 0.05);
      const crackle = Math.abs(fbm(x * 22, y * 22, 11) - 0.5) < 0.018 ? 1 : 0;
      let spec = 0, gk = 0;
      if (glaze > 0) {
        const gTh = clamp01((edge - Math.abs(uu)) / 0.3);
        const gr = 252, gg = 238, gb = 214;
        // Thin and translucent: the fried crust shows through, thicker where it pooled.
        const k = glaze * (0.3 + 0.38 * gTh) * (0.8 + 0.4 * fbm(x * 5, y * 5, 21));
        gk = k;
        r = lerp(r, gr, k); g = lerp(g, gg, k); b = lerp(b, gb, k);
        r -= crackle * glaze * 26; g -= crackle * glaze * 30; b -= crackle * glaze * 34;
        // Glaze is smooth: use the un-bumped normal for its highlight.
        const sx = -dz * Math.cos(theta), sy = -dz * Math.sin(theta);
        const sn = Math.hypot(sx, sy, 1);
        const hdot = Math.max(0, (sx * H[0] + sy * H[1] + H[2]) / sn / Hn);
        spec = Math.pow(hdot, 90) * 1.1 * glaze + Math.pow(hdot, 14) * 0.2 * glaze;
      }

      // Exposed crumb along the bite: pale, open, full of holes.
      if (bitten && bd < 0.34) {
        const k = clamp01(1 - bd / 0.34) ** 0.6;
        const hole = fbm(x * 30, y * 30, 13) < 0.38 ? 0.55 : 1;
        // The cut face is lit from the bite side and falls into shadow toward the crust.
        const lit = 0.75 + 0.35 * k;
        r = lerp(r, 238 * hole * lit, k); g = lerp(g, 208 * hole * lit, k); b = lerp(b, 150 * hole * lit, k);
        spec *= 1 - k;
        glaze = 0;
      }

      // Glaze scatters light inside itself, so it never goes as dark or as grey as bare crust.
      const shade = lerp(0.22 + 0.98 * lam, 0.55 + 0.6 * lam, gk);
      const occl = 0.7 + 0.3 * z / 0.8;
      const o = (j * SIZE + i) * 4;
      px[o] = Math.min(255, r * shade * occl + spec * 255);
      px[o + 1] = Math.min(255, g * shade * occl + spec * 245);
      px[o + 2] = Math.min(255, b * shade * occl + spec * 225);
      // Soft silhouette.
      const sil = Math.min(clamp01((1 - Math.abs(uu)) * 40), bitten ? clamp01(bd * 300) : 1);
      px[o + 3] = 255 * sil;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Sugar crystals catching the light on the glaze.
  const s = rng(bitten ? 77 : 76);
  for (let n = 0; n < 900; n++) {
    const ang = s() * Math.PI * 2, d = RM + (s() - 0.5) * A * 1.1;
    const x = half + Math.cos(ang) * d * TS, y = half + Math.sin(ang) * d * TS;
    if (bitten && biteDist(Math.cos(ang) * d, Math.sin(ang) * d) < 0.05) continue;
    ctx.fillStyle = `rgba(255,255,250,${0.35 + s() * 0.6})`;
    ctx.fillRect(x, y, 1.5 + s() * 2.5, 1.5 + s() * 2.5);
  }
  return c;
}

function buildShadow(tex) {
  const pad = 200;
  const m = createCanvas(SIZE + pad * 2, SIZE + pad * 2);
  const mctx = m.getContext('2d');
  mctx.drawImage(tex, pad, pad);
  mctx.globalCompositeOperation = 'source-in';
  mctx.fillStyle = 'rgba(40,20,5,1)';
  mctx.fillRect(0, 0, m.width, m.height);
  const out = createCanvas(m.width, m.height);
  const octx = out.getContext('2d');
  octx.filter = 'blur(38px)';
  octx.drawImage(m, 0, 0);
  return out;
}

const cache = {};
function donut(bitten) {
  const key = bitten ? 'b' : 'w';
  if (!cache[key]) {
    const tex = buildDonut(bitten);
    cache[key] = { tex, shadow: buildShadow(tex) };
  }
  return cache[key];
}

// The counter is drawn once into a big texture centred on the donut, in units of the hole radius.
const BG_UNITS = 22, BG_TS = 120;
let counter;
function buildCounter() {
  const S = BG_UNITS * BG_TS;
  const c = createCanvas(S, S);
  const ctx = c.getContext('2d');
  const half = S / 2;
  ctx.translate(half, half);
  ctx.rotate(-0.12);
  // Oak planks.
  const r = rng(91);
  const PW = 2.2 * BG_TS;
  for (let x = -S; x < S; x += PW) {
    const tone = 0.86 + r() * 0.22;
    ctx.fillStyle = `rgb(${Math.round(176 * tone)},${Math.round(128 * tone)},${Math.round(82 * tone)})`;
    ctx.fillRect(x, -S, PW, 2 * S);
    for (let g = 0; g < 26; g++) {
      const off = r() * PW, ph = r() * 6, amp = 2 + r() * 7;
      ctx.strokeStyle = `rgba(92,52,22,${0.08 + r() * 0.2})`;
      ctx.lineWidth = 0.8 + r() * 2.2;
      ctx.beginPath();
      for (let y = -S; y <= S; y += 40) {
        const xx = x + off + Math.sin(y * 0.004 + ph) * amp + Math.sin(y * 0.013 + ph * 2) * amp * 0.4;
        y === -S ? ctx.moveTo(xx, y) : ctx.lineTo(xx, y);
      }
      ctx.stroke();
    }
    // A knot now and then.
    if (r() < 0.6) {
      const ky = (r() - 0.5) * S, kx = x + PW * (0.2 + r() * 0.6);
      for (let k = 8; k > 0; k--) {
        ctx.strokeStyle = `rgba(90,48,20,${0.12 + k * 0.02})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(kx, ky, k * 5, k * 14, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(50,25,8,0.55)';
    ctx.fillRect(x - 2, -S, 4, 2 * S);
  }
  // Wear: pale scuffs and an old cup ring.
  for (let i = 0; i < 260; i++) {
    const x = (r() - 0.5) * S, y = (r() - 0.5) * S;
    ctx.strokeStyle = `rgba(255,236,200,${0.03 + r() * 0.06})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 160, y + (r() - 0.5) * 20); ctx.stroke();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(half, half);
  const U = BG_TS;
  // Parchment square under the donut, crinkled, with grease spots.
  ctx.save();
  ctx.rotate(0.09);
  ctx.shadowColor = 'rgba(60,30,10,0.35)';
  ctx.shadowBlur = 30; ctx.shadowOffsetX = 14; ctx.shadowOffsetY = 20;
  ctx.fillStyle = '#efe2c8';
  const P = 3.9 * U;
  ctx.beginPath();
  ctx.moveTo(-P, -P + 10); ctx.lineTo(P - 6, -P); ctx.lineTo(P, P - 12); ctx.lineTo(-P + 8, P); ctx.closePath();
  ctx.fill();
  ctx.shadowColor = 'transparent';
  const pr = rng(33);
  for (let i = 0; i < 40; i++) {
    const x1 = (pr() - 0.5) * 2 * P, y1 = (pr() - 0.5) * 2 * P;
    const g = ctx.createLinearGradient(x1, y1, x1 + 80, y1 + 40);
    g.addColorStop(0, 'rgba(255,250,235,0)');
    g.addColorStop(0.5, `rgba(${pr() < 0.5 ? '255,250,235' : '150,120,80'},${0.08 + pr() * 0.12})`);
    g.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x1 + (pr() - 0.5) * 600, y1 + (pr() - 0.5) * 600); ctx.lineTo(x1 + (pr() - 0.5) * 200, y1 + (pr() - 0.5) * 200);
    ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < 7; i++) {
    const a = pr() * 6.28, d = 2.9 * U + pr() * 0.6 * U;
    const gr = ctx.createRadialGradient(Math.cos(a) * d, Math.sin(a) * d, 0, Math.cos(a) * d, Math.sin(a) * d, 30 + pr() * 60);
    gr.addColorStop(0, 'rgba(190,140,60,0.28)');
    gr.addColorStop(1, 'rgba(190,140,60,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(-P, -P, 2 * P, 2 * P);
  }
  ctx.restore();
  // Spilt sugar around the donut.
  const sr = rng(55);
  for (let i = 0; i < 1600; i++) {
    const a = sr() * 6.28, d = (2.4 + Math.pow(sr(), 2) * 3.5) * U;
    ctx.fillStyle = `rgba(255,252,240,${0.4 + sr() * 0.5})`;
    const s = 1.5 + sr() * 3;
    ctx.fillRect(Math.cos(a) * d, Math.sin(a) * d, s, s);
  }
  // Coffee cup on its saucer, lower left.
  const cx = -6.2 * U, cy = 4.6 * U;
  ctx.save();
  ctx.shadowColor = 'rgba(50,25,8,0.45)'; ctx.shadowBlur = 50; ctx.shadowOffsetX = 30; ctx.shadowOffsetY = 40;
  ctx.fillStyle = '#ece6dc';
  ctx.beginPath(); ctx.arc(cx, cy, 2.5 * U, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  const sau = ctx.createRadialGradient(cx - 60, cy - 80, 20, cx, cy, 2.5 * U);
  sau.addColorStop(0, '#fbf8f2'); sau.addColorStop(0.75, '#e6ded1'); sau.addColorStop(0.9, '#f4efe6'); sau.addColorStop(1, '#cfc5b5');
  ctx.fillStyle = sau;
  ctx.beginPath(); ctx.arc(cx, cy, 2.5 * U, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(80,50,20,0.25)';
  ctx.beginPath(); ctx.arc(cx + 18, cy + 24, 1.6 * U, 0, Math.PI * 2); ctx.fill();
  const cup = ctx.createRadialGradient(cx - 50, cy - 60, 10, cx, cy, 1.55 * U);
  cup.addColorStop(0, '#ffffff'); cup.addColorStop(0.85, '#ece5da'); cup.addColorStop(1, '#bfb4a3');
  ctx.fillStyle = cup;
  ctx.beginPath(); ctx.arc(cx, cy, 1.55 * U, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e9e2d6';
  ctx.beginPath(); ctx.ellipse(cx + 1.75 * U, cy - 0.5 * U, 0.55 * U, 0.22 * U, -0.3, 0, Math.PI * 2); ctx.fill();
  const cof = ctx.createRadialGradient(cx - 30, cy - 30, 5, cx, cy, 1.3 * U);
  cof.addColorStop(0, '#6b3d1c'); cof.addColorStop(0.7, '#3d200d'); cof.addColorStop(0.92, '#a8774a'); cof.addColorStop(1, '#5a3315');
  ctx.fillStyle = cof;
  ctx.beginPath(); ctx.arc(cx, cy, 1.3 * U, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(210,170,120,0.35)'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(cx, cy, 0.9 * U, 0.4, 2.6); ctx.stroke();
  // Folded linen napkin, upper right.
  ctx.save();
  ctx.translate(6.4 * U, -4.4 * U);
  ctx.rotate(0.35);
  ctx.shadowColor = 'rgba(50,25,8,0.3)'; ctx.shadowBlur = 30; ctx.shadowOffsetX = 18; ctx.shadowOffsetY = 26;
  ctx.fillStyle = '#d9d4c6';
  ctx.fillRect(-2.6 * U, -1.6 * U, 5.2 * U, 3.2 * U);
  ctx.shadowColor = 'transparent';
  const lr = rng(5);
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(${lr() < 0.5 ? '255,255,250' : '120,110,90'},0.08)`;
    ctx.fillRect(-2.6 * U, -1.6 * U + lr() * 3.2 * U, 5.2 * U, 1.5);
  }
  ctx.strokeStyle = 'rgba(140,60,45,0.55)'; ctx.lineWidth = 7;
  ctx.strokeRect(-2.3 * U, -1.3 * U, 4.6 * U, 2.6 * U);
  ctx.fillStyle = 'rgba(90,70,50,0.18)';
  ctx.fillRect(-0.05 * U, -1.6 * U, 0.12 * U, 3.2 * U);
  ctx.restore();
  return c;
}

// Crumbs that fall around the bite.
function crumbs(ctx, U) {
  const r = rng(404);
  for (let i = 0; i < 46; i++) {
    const a = -0.95 + (r() - 0.5) * 1.6, d = (RO + 0.2 + r() * 1.6) * U;
    const x = Math.cos(a) * d, y = Math.sin(a) * d, s = (0.02 + r() * 0.07) * U;
    ctx.fillStyle = 'rgba(60,30,8,0.3)';
    ctx.beginPath(); ctx.ellipse(x + s * 0.4, y + s * 0.5, s, s * 0.8, r() * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = r() < 0.5 ? '#e6c890' : '#b27a3e';
    ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.75, r() * 3, 0, Math.PI * 2); ctx.fill();
  }
}

// zoom = 1 puts the hole exactly on the ring. fade darkens toward black.
export function drawDonutScene(ctx, w, h, t, ring, { zoom = 1, spin = 0, bitten = false, fade = 0 }) {
  counter ||= buildCounter();
  const U = ring.r;
  const d = donut(bitten);
  ctx.fillStyle = '#2a1a0e';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(ring.cx, ring.cy);
  ctx.scale(zoom, zoom);
  ctx.rotate(spin);
  const bs = (BG_UNITS * U) ;
  ctx.drawImage(counter, -bs / 2, -bs / 2, bs, bs);
  if (bitten) crumbs(ctx, U);
  const k = U / TS;
  const sw = d.shadow.width * k;
  ctx.globalAlpha = 0.55;
  ctx.drawImage(d.shadow, -sw / 2 + 0.16 * U, -sw / 2 + 0.24 * U, sw, sw);
  ctx.globalAlpha = 1;
  // Contact shadow right under the ring.
  ctx.strokeStyle = 'rgba(40,18,4,0.35)';
  ctx.lineWidth = 0.18 * U;
  ctx.beginPath(); ctx.arc(0.03 * U, 0.05 * U, (RI + 0.04) * U, 0, Math.PI * 2); ctx.stroke();
  const tw = SIZE * k;
  ctx.drawImage(d.tex, -tw / 2, -tw / 2, tw, tw);
  ctx.restore();

  // Morning light through the window: warm bands with mullion shadows, falling across everything.
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.translate(ring.cx, ring.cy);
  ctx.scale(zoom, zoom);
  ctx.rotate(-0.62 + spin);
  const band = (x0, x1, a) => {
    const g = ctx.createLinearGradient(x0 * U, 0, x1 * U, 0);
    g.addColorStop(0, 'rgba(255,214,150,0)');
    g.addColorStop(0.15, `rgba(255,214,150,${a})`);
    g.addColorStop(0.85, `rgba(255,214,150,${a})`);
    g.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x0 * U, -30 * U, (x1 - x0) * U, 60 * U);
  };
  band(-9, -2.6, 0.75); band(-2.2, 3.4, 0.85); band(3.8, 9, 0.6);
  ctx.restore();
  // Warmth and falloff toward the corners.
  const vg = ctx.createRadialGradient(w * 0.42, h * 0.4, h * 0.2, w / 2, h / 2, h * 1.05);
  vg.addColorStop(0, 'rgba(255,200,130,0.06)');
  vg.addColorStop(1, 'rgba(30,12,2,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h, Math.floor(t * 30), 0.06);
  if (fade > 0) {
    ctx.fillStyle = `rgba(8,5,3,${fade})`;
    ctx.fillRect(0, 0, w, h);
  }
}

export const DONUT = { RI, RO };
