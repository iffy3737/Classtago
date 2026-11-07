import React from "react";
import { QRCodeSVG } from "qrcode.react";

export type IdCardTheme = "candy" | "sunshine" | "violet";
export const ID_CARD_THEMES: { key: IdCardTheme; label: string }[] = [
  { key: "candy", label: "Candy" },
  { key: "sunshine", label: "Sunshine" },
  { key: "violet", label: "Violet" }
];
export type IdCardStudent = { id: string; grNumber: string; fullName: string; className: string; division: string; dob: string; mobile: string; address: string };
export type IdCardOptions = { theme: IdCardTheme; student: IdCardStudent; schoolName: string; photo?: string | null; logo?: string | null; sign?: string | null; dpi?: number };
export const ID_CARD_W_IN = 2.125;
export const ID_CARD_H_IN = (2.125 * 38.2) / 24;

type G = CanvasRenderingContext2D;
type Align = "left" | "center" | "right";
type Src = { s: CanvasImageSource; w: number; h: number };
type Info = { name: string; ini: string; cls: string; gr: string; dob: string; mobile: string; address: string; qr: string; school: string; place: string };
type Assets = { photo: HTMLImageElement | null; logo: Src | null; sign: Src | null; qr: HTMLImageElement };
type Tone = { lc: string; tc: string; qb: string; sc: string };

const FONT = '"Trebuchet MS", Roboto, "Segoe UI", Arial, sans-serif';
const BOOK = "M12 5.5C9.8 4.2 7 3.8 4 3.8v13.4c3 0 5.8.5 8 1.9 2.2-1.4 5-1.9 8-1.9V3.8c-3 0-5.8.4-8 1.7z";
const SCALLOP = (() => {
  let d = "";
  for (let k = 0; k < 240; k++) {
    const t = (k / 240) * Math.PI * 2;
    const r = 44 + 3.4 * Math.sin(16 * t);
    d += (k ? "L" : "M") + (50 + r * Math.cos(t)).toFixed(2) + " " + (50 + r * Math.sin(t)).toFixed(2);
  }
  return d + "Z";
})();

const clean = (s: any): string => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
const isLatin = (s: string) => !/[^\u0000-\u024F]/.test(s);
const fixWord = (w: string): string => {
  if (!isLatin(w) || /\d/.test(w)) return w;
  const lower = w === w.toLowerCase();
  const shout = w === w.toUpperCase() && w.replace(/[^A-Za-z]/g, "").length >= 3;
  if (!lower && !shout) return w;
  return w.toLowerCase().replace(/(^|[-'.\u2019])([a-z])/g, (_m: string, a: string, b: string) => a + b.toUpperCase());
};
const title = (s: string): string => s.replace(/\S+/g, fixWord);
const split2 = (t: string): string[] => {
  const w = t.split(" ").filter(Boolean);
  if (w.length < 2) return [t];
  let k = 1;
  let m = 1e9;
  for (let n = 1; n < w.length; n++) {
    const d = Math.abs(w.slice(0, n).join(" ").length - w.slice(n).join(" ").length);
    if (d < m) { m = d; k = n; }
  }
  return [w.slice(0, k).join(" "), w.slice(k).join(" ")];
};

function prepare(o: IdCardOptions): Info {
  const s = o.student;
  const sv = clean(o.schoolName);
  const ci = sv.indexOf(",");
  const main = ci > 0 ? sv.slice(0, ci).trim() : sv;
  const place = ci > 0 ? sv.slice(ci + 1).trim() : "";
  const cls0 = clean(s.className).replace(/^class\b\s*[-:]?\s*/i, "");
  const dv = clean(s.division);
  const div = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(dv) ? "" : dv;
  const clsLabel = /^[0-9ivx]+(st|nd|rd|th)?$/i.test(cls0) ? "Class " + cls0 : cls0;
  const dm = clean(s.dob).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const addr = clean(s.address).split(",").map((x) => title(x.trim())).filter(Boolean).join(", ");
  const words = clean(s.fullName).split(" ").filter(Boolean);
  return {
    name: title(clean(s.fullName)) || "-",
    ini: ((words[0] || "").charAt(0) + (words.length > 1 ? words[words.length - 1].charAt(0) : "")).toUpperCase() || "?",
    cls: [clsLabel, div].filter(Boolean).join(" - ") || "-",
    gr: clean(s.grNumber) || "-",
    dob: dm ? dm[3] + "/" + dm[2] + "/" + dm[1] : clean(s.dob) || "-",
    mobile: clean(s.mobile) || "-",
    address: addr || "-",
    qr: "CLASSTAGO:ST:" + s.id,
    school: main.toUpperCase(),
    place: place.toUpperCase()
  };
}

const loadImg = (src?: string | null): Promise<HTMLImageElement | null> =>
  new Promise((res) => {
    if (!src) { res(null); return; }
    const im = new Image();
    if (src.indexOf("data:") !== 0) im.crossOrigin = "anonymous";
    im.onload = () => res(im.naturalWidth > 0 && im.naturalHeight > 0 ? im : null);
    im.onerror = () => res(null);
    im.src = src;
  });

function halve(img: HTMLImageElement, tw0: number, th0: number): Src {
  let s: CanvasImageSource = img;
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  while (w / 2 >= tw0 && h / 2 >= th0) {
    const nw = Math.floor(w / 2);
    const nh = Math.floor(h / 2);
    const c = document.createElement("canvas");
    c.width = nw;
    c.height = nh;
    const cg = c.getContext("2d")!;
    cg.imageSmoothingEnabled = true;
    cg.imageSmoothingQuality = "high";
    cg.drawImage(s, 0, 0, w, h, 0, 0, nw, nh);
    s = c; w = nw; h = nh;
  }
  return { s, w, h };
}

function squareFrom(img: HTMLImageElement, out: number): HTMLCanvasElement {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const side = Math.min(iw, ih);
  let sx = (iw - side) / 2;
  let sy = ih > iw ? (ih - side) * 0.25 : 0;
  let src: CanvasImageSource = img;
  let w = side;
  while (w / 2 >= out) {
    const nw = Math.floor(w / 2);
    const c = document.createElement("canvas");
    c.width = nw;
    c.height = nw;
    const cg = c.getContext("2d")!;
    cg.imageSmoothingEnabled = true;
    cg.imageSmoothingQuality = "high";
    cg.drawImage(src, sx, sy, w, w, 0, 0, nw, nw);
    src = c; w = nw; sx = 0; sy = 0;
  }
  const o = document.createElement("canvas");
  o.width = out;
  o.height = out;
  const og = o.getContext("2d")!;
  og.imageSmoothingEnabled = true;
  og.imageSmoothingQuality = "high";
  og.drawImage(src, sx, sy, w, w, 0, 0, out, out);
  return o;
}

function contain(g: G, a: Src, x: number, y: number, w: number, h: number) {
  const k = Math.min(w / a.w, h / a.h);
  const dw = a.w * k;
  const dh = a.h * k;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(a.s, 0, 0, a.w, a.h, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + k, y);
  g.arcTo(x + w, y, x + w, y + h, k);
  g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k);
  g.arcTo(x, y, x + w, y, k);
  g.closePath();
}

function blob(g: G, x: number, y: number, w: number, h: number, rh: number[], rv: number[]) {
  const a = rh.map((p) => (p / 100) * w);
  const b = rv.map((p) => (p / 100) * h);
  g.beginPath();
  g.moveTo(x + a[0], y);
  g.lineTo(x + w - a[1], y);
  g.ellipse(x + w - a[1], y + b[1], a[1], b[1], 0, -Math.PI / 2, 0);
  g.lineTo(x + w, y + h - b[2]);
  g.ellipse(x + w - a[2], y + h - b[2], a[2], b[2], 0, 0, Math.PI / 2);
  g.lineTo(x + a[3], y + h);
  g.ellipse(x + a[3], y + h - b[3], a[3], b[3], 0, Math.PI / 2, Math.PI);
  g.lineTo(x, y + b[0]);
  g.ellipse(x + a[0], y + b[0], a[0], b[0], 0, Math.PI, Math.PI * 1.5);
  g.closePath();
}

const rot = (g: G, cx: number, cy: number, deg: number, fn: () => void) => {
  g.save();
  g.translate(cx, cy);
  g.rotate((deg * Math.PI) / 180);
  fn();
  g.restore();
};

const circle = (g: G, x: number, y: number, r: number, color: string) => {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
};

function sf(g: G, px: number) {
  g.font = "700 " + px.toFixed(2) + "px " + FONT;
}

function tw(g: G, s: string, px: number, ls = 0): number {
  sf(g, px);
  return g.measureText(s).width + ls * Math.max(0, s.length - 1);
}

function put(g: G, s: string, x: number, cy: number, px: number, color: string, align: Align, ls = 0) {
  sf(g, px);
  const m = g.measureText("H");
  const cap = m.actualBoundingBoxAscent > 0 ? m.actualBoundingBoxAscent : px * 0.72;
  const w = tw(g, s, px, ls);
  const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  g.fillStyle = color;
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  const y = cy + cap / 2;
  if (ls > 0.01) {
    let cx = x0;
    const chars = Array.from(s);
    for (let k = 0; k < chars.length; k++) {
      g.fillText(chars[k], cx, y);
      cx += g.measureText(chars[k]).width + ls;
    }
  } else {
    g.fillText(s, x0, y);
  }
}

function wrap(g: G, s: string, px: number, maxW: number, ls: number): string[] {
  const words = s.split(" ").filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (let k = 0; k < words.length; k++) {
    const t = cur ? cur + " " + words[k] : words[k];
    if (cur && tw(g, t, px, ls) > maxW) { out.push(cur); cur = words[k]; } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}

function clipLine(g: G, line: string, px: number, maxW: number, ls: number): string {
  if (tw(g, line, px, ls) <= maxW) return line;
  let s = line;
  while (s.length > 1 && tw(g, s + "\u2026", px, ls) > maxW) s = s.slice(0, -1);
  return s.trim() + "\u2026";
}

function fit(g: G, s: string, maxW: number, maxH: number, maxLines: number, base: number, min: number, ls = 0, lh = 1.12): { px: number; lines: string[] } {
  let px = base;
  while (px >= min) {
    const got = wrap(g, s, px, maxW, ls);
    if (got.length <= maxLines && got.length * px * lh <= maxH && got.every((l) => tw(g, l, px, ls) <= maxW)) {
      return { px, lines: got.length ? got : [""] };
    }
    px *= 0.96;
  }
  const all = wrap(g, s, min, maxW, ls);
  const out = all.slice(0, maxLines).map((l) => clipLine(g, l, min, maxW, ls));
  if (all.length > maxLines && out.length) {
    const last = out[out.length - 1].replace(/\u2026$/, "");
    out[out.length - 1] = clipLine(g, last + "\u2026", min, maxW, ls);
  }
  return { px: min, lines: out.length ? out : [""] };
}

function lines(g: G, arr: string[], x: number, cy: number, px: number, color: string, align: Align, ls = 0, lh = 1.12) {
  const pitch = px * lh;
  arr.forEach((l, k) => put(g, l, x, cy + (k - (arr.length - 1) / 2) * pitch, px, color, align, ls));
}

function photoIn(g: G, img: HTMLImageElement | null, cx: number, cy: number, size: number, bg: string, fg: string, ini: string, u: number) {
  g.fillStyle = bg;
  g.fillRect(cx - size / 2, cy - size / 2, size, size);
  if (img) {
    const sq = squareFrom(img, Math.ceil(size));
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(sq, cx - size / 2, cy - size / 2, size, size);
  } else {
    put(g, ini, cx, cy, 3.2 * u, fg, "center");
  }
}

function drawLogo(g: G, u: number, A: Assets, cy: number, bg: string, fg: string, ring: string) {
  const ph = 2.8 * u;
  const ar = A.logo ? A.logo.w / A.logo.h : 1;
  const pw = A.logo && ar > 1.25 ? Math.min(7.6 * u, Math.max(ph, (ph - 0.6 * u) * ar + 0.8 * u)) : ph;
  const x = 12 * u - pw / 2;
  const y = cy - ph / 2;
  g.fillStyle = ring;
  rr(g, x, y, pw, ph, ph / 2);
  g.fill();
  g.fillStyle = bg;
  rr(g, x + 0.2 * u, y + 0.2 * u, pw - 0.4 * u, ph - 0.4 * u, (ph - 0.4 * u) / 2);
  g.fill();
  if (A.logo) {
    g.save();
    rr(g, x + 0.2 * u, y + 0.2 * u, pw - 0.4 * u, ph - 0.4 * u, (ph - 0.4 * u) / 2);
    g.clip();
    contain(g, A.logo, x + 0.35 * u, y + 0.35 * u, pw - 0.7 * u, ph - 0.7 * u);
    g.restore();
  } else {
    const s = 1.74 * u;
    g.save();
    g.translate(12 * u - s / 2, cy - s / 2);
    g.scale(s / 24, s / 24);
    g.fillStyle = fg;
    g.fill(new Path2D(BOOK));
    g.strokeStyle = "#ffffff";
    g.lineWidth = 1.1;
    g.stroke(new Path2D("M12 5.5v13.6"));
    g.restore();
  }
}

function drawSchool(g: G, u: number, i: Info, top: number, h: number, color: string, pcolor: string, base: number, ls: number) {
  const place = i.place.length > 26 ? i.place.slice(0, 24).trim() + "\u2026" : i.place;
  const pp = 0.95 * u;
  const ph = place ? pp * 1.15 + 0.3 * u : 0;
  const f = fit(g, i.school, 21.6 * u, h - ph, 2, base * u, base * 0.55 * u, ls * u, 1.08);
  const nh = f.lines.length * f.px * 1.08;
  const y0 = top + (h - nh - ph) / 2;
  lines(g, f.lines, 12 * u, y0 + nh / 2, f.px, color, "center", ls * u, 1.08);
  if (place) put(g, place, 12 * u, y0 + nh + 0.3 * u + (pp * 1.15) / 2, pp, pcolor, "center", place.length > 12 ? 0.12 * u : 0.3 * u);
}

function bottom(g: G, u: number, i: Info, A: Assets, c: Tone) {
  const W = 24 * u;
  const H = 38.2 * u;
  const box = 8.2 * u;
  const regionH = box + 0.45 * u + 1.7 * u + 0.25 * u + 0.92 * u * 1.15;
  const top = H - 1.0 * u - regionH;
  const qx = W - 1.2 * u - box;
  g.fillStyle = c.qb;
  rr(g, qx, top, box, box, 0.5 * u);
  g.fill();
  g.fillStyle = "#ffffff";
  rr(g, qx + 0.12 * u, top + 0.12 * u, box - 0.24 * u, box - 0.24 * u, 0.4 * u);
  g.fill();
  const qs = Math.round(7.2 * u);
  g.imageSmoothingEnabled = false;
  g.drawImage(A.qr, Math.round(qx + (box - qs) / 2), Math.round(top + (box - qs) / 2), qs, qs);
  g.imageSmoothingEnabled = true;
  const sy = top + box + 0.45 * u;
  const sh = 1.7 * u;
  g.fillStyle = "#ffffff";
  rr(g, qx, sy, box, sh, 0.3 * u);
  g.fill();
  if (A.sign) {
    contain(g, A.sign, qx + 0.2 * u, sy + 0.08 * u, box - 0.4 * u, sh - 0.16 * u);
  } else {
    g.fillStyle = "#9ca3af";
    g.fillRect(qx + 0.6 * u, sy + sh - 0.4 * u, box - 1.2 * u, Math.max(1, 0.08 * u));
  }
  put(g, "Headmaster", qx + box / 2, sy + sh + 0.25 * u + 0.53 * u, 0.92 * u, c.sc, "center");
  const x0 = 1.2 * u;
  const cw = qx - 0.8 * u - x0;
  const lp = 0.92 * u;
  const vp = 1.12 * u;
  const lh = 1.15;
  const rows = [
    { l: "DATE OF BIRTH", f: fit(g, i.dob, cw, vp * lh, 1, vp, 0.7 * u, 0, lh) },
    { l: "MOBILE", f: fit(g, i.mobile, cw, vp * lh, 1, vp, 0.7 * u, 0, lh) },
    { l: "ADDRESS", f: fit(g, i.address, cw, 3 * vp * lh, 3, i.address.length > 44 ? 0.98 * u : vp, 0.75 * u, 0, lh) }
  ];
  const hs = rows.map((r) => lp * lh + 0.12 * u + r.f.lines.length * r.f.px * lh);
  const total = hs.reduce((a, b) => a + b, 0) + 0.5 * u * (rows.length - 1);
  let y = top + Math.max(0, (regionH - total) / 2);
  rows.forEach((r, k) => {
    put(g, r.l, x0, y + (lp * lh) / 2, lp, c.lc, "left", 0.12 * u);
    r.f.lines.forEach((ln, j) => put(g, ln, x0, y + lp * lh + 0.12 * u + (j + 0.5) * r.f.px * lh, r.f.px, c.tc, "left", 0));
    y += hs[k] + 0.5 * u;
  });
}

function candy(g: G, u: number, i: Info, A: Assets) {
  const W = 24 * u;
  const H = 38.2 * u;
  g.fillStyle = "#FFF3E4";
  g.fillRect(0, 0, W, H);
  rot(g, 1.8 * u, 3.3 * u, -36, () => { g.fillStyle = "#FFD95E"; rr(g, -5 * u, -1.1 * u, 10 * u, 2.2 * u, 1.1 * u); g.fill(); });
  rot(g, 20.8 * u, 0.8 * u, 16, () => { g.fillStyle = "#E87BC3"; rr(g, -1 * u, -3.8 * u, 2 * u, 7.6 * u, 1 * u); g.fill(); });
  rot(g, 23.2 * u, 0.8 * u, 16, () => { g.fillStyle = "#6CCBF3"; rr(g, -1 * u, -3.8 * u, 2 * u, 7.6 * u, 1 * u); g.fill(); });
  g.fillStyle = "#FFE9A3";
  g.beginPath();
  g.ellipse(12 * u, 37.95 * u, 16 * u, 13.25 * u, 0, 0, Math.PI * 2);
  g.fill();
  drawLogo(g, u, A, 2.6 * u, "#ffffff", "#E26BB8", "#FFD0EC");
  drawSchool(g, u, i, 4.4 * u, 4.0 * u, "#E0509F", "#7C4DC4", 1.35, 0);
  const cx = 12 * u;
  const cy = 12.7 * u;
  const ps = 7.6 * u;
  rot(g, cx, cy, 10, () => { g.fillStyle = "#FFD95E"; blob(g, -4.3 * u, -4.3 * u, 8.6 * u, 8.6 * u, [46, 54, 50, 50], [55, 45, 55, 45]); g.fill(); });
  g.save();
  blob(g, cx - ps / 2, cy - ps / 2, ps, ps, [56, 44, 52, 48], [48, 54, 46, 52]);
  g.clip();
  photoIn(g, A.photo, cx, cy, ps, "#36B8F2", "#ffffff", i.ini, u);
  g.restore();
  g.fillStyle = "#FFD95E";
  g.fillRect(2.0 * u, 17.95 * u, 21.2 * u, 3.8 * u);
  rot(g, 12 * u, 19.4 * u, -1.2, () => {
    g.fillStyle = "#E57DC1";
    g.fillRect(-10.8 * u, -1.9 * u, 21.6 * u, 3.8 * u);
    const f = fit(g, i.name, 20.4 * u, 3.4 * u, 2, 2.0 * u, 0.95 * u, 0, 1.08);
    lines(g, f.lines, 0, 0, f.px, "#ffffff", "center", 0, 1.08);
  });
  let pp = 1.05 * u;
  const t1 = "GR " + i.gr;
  const t2 = i.cls;
  const pad = 0.9 * u;
  const gap = 0.6 * u;
  let w1 = tw(g, t1, pp) + 2 * pad + 0.32 * u;
  let w2 = tw(g, t2, pp) + 2 * pad;
  while (w1 + gap + w2 > 21.6 * u && pp > 0.6 * u) {
    pp *= 0.95;
    w1 = tw(g, t1, pp) + 2 * pad + 0.32 * u;
    w2 = tw(g, t2, pp) + 2 * pad;
  }
  const ph = 2.4 * u;
  const py = 22.2 * u;
  let px = 12 * u - (w1 + gap + w2) / 2;
  g.fillStyle = "#E57DC1";
  rr(g, px, py, w1, ph, ph / 2);
  g.fill();
  g.fillStyle = "#ffffff";
  rr(g, px + 0.16 * u, py + 0.16 * u, w1 - 0.32 * u, ph - 0.32 * u, (ph - 0.32 * u) / 2);
  g.fill();
  put(g, t1, px + w1 / 2, py + ph / 2, pp, "#C23C8E", "center");
  px += w1 + gap;
  g.fillStyle = "#36B8F2";
  rr(g, px, py, w2, ph, ph / 2);
  g.fill();
  put(g, t2, px + w2 / 2, py + ph / 2, pp, "#ffffff", "center");
  bottom(g, u, i, A, { lc: "#C23C8E", tc: "#3A2347", qb: "#E57DC1", sc: "#3A2347" });
}

function sunshine(g: G, u: number, i: Info, A: Assets) {
  const W = 24 * u;
  const H = 38.2 * u;
  g.fillStyle = "#FFD64A";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#FFC41C";
  g.fillRect(0, 13.5 * u, W, H - 13.5 * u);
  g.save();
  g.translate(-2.6 * u, -2.6 * u);
  g.scale(0.09 * u, 0.09 * u);
  g.fillStyle = "#E8591A";
  g.beginPath();
  for (let k = 0; k < 28; k++) {
    const r = k % 2 ? 41 : 50;
    const t = (Math.PI * k) / 14;
    const x = 50 + r * Math.cos(t);
    const y = 50 + r * Math.sin(t);
    if (k) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.closePath();
  g.fill();
  g.restore();
  g.save();
  g.translate(16 * u, 0);
  g.scale(0.1 * u, 0.1 * u);
  g.strokeStyle = "#111111";
  g.lineWidth = 1.1;
  g.stroke(new Path2D("M52 0V44M64 0V28M76 0V60M24 14H80M36 30H80M44 46H80"));
  g.restore();
  g.save();
  g.translate(0, 15 * u);
  g.scale(0.1 * u, 0.1 * u);
  g.strokeStyle = "#111111";
  g.lineWidth = 1.1;
  g.stroke(new Path2D("M0 18H32M18 0V52M0 44H26"));
  g.restore();
  drawLogo(g, u, A, 2.6 * u, "#ffffff", "#111111", "#111111");
  drawSchool(g, u, i, 4.4 * u, 3.6 * u, "#111111", "#8F3208", 1.15, 0.06);
  const cy = 12.7 * u;
  circle(g, 12 * u, cy, 4.65 * u, "#ffffff");
  circle(g, 12 * u, cy, 4.2 * u, "#E8591A");
  g.save();
  g.beginPath();
  g.arc(12 * u, cy, 3.7 * u, 0, Math.PI * 2);
  g.clip();
  photoIn(g, A.photo, 12 * u, cy, 7.4 * u, "#FFE8A8", "#E8591A", i.ini, u);
  g.restore();
  const nm = split2(i.name.toUpperCase());
  let px = 2.2 * u;
  while (px > 1.0 * u && nm.some((l) => tw(g, l, px) > 21.6 * u)) px *= 0.96;
  const hh = px * 2.16 + 0.3 * u;
  const top = 17.8 * u;
  lines(g, nm, 12 * u, top + hh / 2, px, "#111111", "center", 0, 1.08);
  const cl = i.cls.toUpperCase() + "  |  GR " + i.gr;
  const cls = 0.03 * u;
  let cp = 1.2 * u;
  while (cp > 0.7 * u && tw(g, cl, cp, cls) > 21.6 * u) cp *= 0.96;
  put(g, cl, 12 * u, top + hh + 0.3 * u + (cp * 1.15) / 2, cp, "#111111", "center", cls);
  bottom(g, u, i, A, { lc: "#8F3208", tc: "#111111", qb: "#111111", sc: "#111111" });
}

function violet(g: G, u: number, i: Info, A: Assets) {
  const W = 24 * u;
  const H = 38.2 * u;
  g.fillStyle = "#6A52E3";
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "#8872F0";
  g.lineWidth = 0.12 * u;
  g.beginPath();
  for (let k = 1; k <= 5; k++) { g.moveTo(4.4 * k * u, 0); g.lineTo(4.4 * k * u, H); }
  for (let k = 1; k <= 8; k++) { g.moveTo(0, 4.4 * k * u); g.lineTo(W, 4.4 * k * u); }
  g.stroke();
  rot(g, 13 * u, 8.5 * u, -26, () => { g.fillStyle = "#7561E8"; g.fillRect(-21 * u, -1.5 * u, 42 * u, 3 * u); });
  rot(g, 13 * u, 22.1 * u, -26, () => { g.fillStyle = "#5B44D4"; g.fillRect(-21 * u, -1.1 * u, 42 * u, 2.2 * u); });
  drawLogo(g, u, A, 2.6 * u, "#FFC93C", "#4631C0", "#FFC93C");
  drawSchool(g, u, i, 4.4 * u, 4.0 * u, "#FFC93C", "#ffffff", 1.35, 0);
  const cx = 12 * u;
  const cy = 12.9 * u;
  const fs = 8.2 * u;
  g.save();
  g.translate(cx - fs / 2, cy - fs / 2);
  g.scale(fs / 100, fs / 100);
  g.fillStyle = "#FFC93C";
  g.fill(new Path2D(SCALLOP));
  g.restore();
  g.save();
  g.beginPath();
  g.arc(cx, cy, 3.2 * u, 0, Math.PI * 2);
  g.clip();
  photoIn(g, A.photo, cx, cy, 6.4 * u, "#9C8CF5", "#ffffff", i.ini, u);
  g.restore();
  rot(g, 12 * u, 19.7 * u, -1, () => {
    g.fillStyle = "#FFC93C";
    rr(g, -10.8 * u, -1.8 * u, 21.6 * u, 3.6 * u, 0.9 * u);
    g.fill();
    const f = fit(g, i.name, 20 * u, 3.2 * u, 2, 1.9 * u, 0.9 * u, 0, 1.08);
    lines(g, f.lines, 0, 0, f.px, "#4631C0", "center", 0, 1.08);
  });
  const cl = (i.cls.indexOf("Class ") === 0 ? "Class : " + i.cls.slice(6) : i.cls) + "  |  GR : " + i.gr;
  rot(g, 12 * u, 23.35 * u, 0.8, () => {
    g.fillStyle = "#FFD86B";
    rr(g, -10.8 * u, -1.35 * u, 21.6 * u, 2.7 * u, 0.9 * u);
    g.fill();
    let px = 1.25 * u;
    while (px > 0.7 * u && tw(g, cl, px) > 20 * u) px *= 0.96;
    put(g, cl, 0, 0, px, "#4631C0", "center");
  });
  bottom(g, u, i, A, { lc: "#FFC93C", tc: "#ffffff", qb: "#FFC93C", sc: "#ffffff" });
}

let serverMod: any = null;
async function qrImage(value: string, px: number): Promise<HTMLImageElement> {
  let svg0 = "";
  try {
    if (!serverMod) serverMod = await import("react-dom/server");
    svg0 = serverMod.renderToStaticMarkup(React.createElement(QRCodeSVG, { value, size: px, level: "M", marginSize: 0, fgColor: "#111111", bgColor: "#ffffff" }));
  } catch (e: any) {
    throw new Error("QR code could not be generated: " + (e && e.message ? e.message : "unknown error"));
  }
  const svg = svg0.indexOf("xmlns=") < 0 ? svg0.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"') : svg0;
  const im = await loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
  if (!im) throw new Error("QR code image could not be created.");
  return im;
}

export async function renderIdCardCanvas(o: IdCardOptions, target?: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const dpi = o.dpi || 300;
  const W = Math.round(ID_CARD_W_IN * dpi);
  const H = Math.round(ID_CARD_H_IN * dpi);
  const u = W / 24;
  const info = prepare(o);
  const [photoImg, logoImg, signImg] = await Promise.all([loadImg(o.photo), loadImg(o.logo), loadImg(o.sign)]);
  const qr = await qrImage(info.qr, Math.round(7.2 * u));
  const A: Assets = {
    photo: photoImg,
    logo: logoImg ? halve(logoImg, Math.ceil(7 * u), Math.ceil(2.6 * u)) : null,
    sign: signImg ? halve(signImg, Math.ceil(8 * u), Math.ceil(1.6 * u)) : null,
    qr
  };
  const cv = target || document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d");
  if (!g) throw new Error("Canvas is not available on this device.");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, H);
  g.save();
  rr(g, 0, 0, W, H, 1.1 * u);
  g.clip();
  if (o.theme === "sunshine") sunshine(g, u, info, A);
  else if (o.theme === "violet") violet(g, u, info, A);
  else candy(g, u, info, A);
  g.restore();
  const lw = Math.max(1, Math.round(0.012 * dpi));
  g.strokeStyle = "#cbd5e1";
  g.lineWidth = lw;
  rr(g, lw / 2, lw / 2, W - lw, H - lw, 1.1 * u);
  g.stroke();
  return cv;
}
