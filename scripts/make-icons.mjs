// Рисует иконки приложения (концентрические кольца групп) без внешних зависимостей.
// Запуск: npm run icons  → public/icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png, icon.svg
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pub = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
const BG = "#EEF3EF";
const TRACK = "#DCE6E0";
// фрукты, овощи, зерновые, белок, молочные (снаружи внутрь) и доля заполнения
const RINGS = [["#E2483D", 0.82], ["#3F9B5A", 0.7], ["#D98B1F", 0.9], ["#7A4BB3", 0.6], ["#3A86C8", 0.76]];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, px) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** scale: доля размера, которую занимают кольца; rounded: скруглённый фон (не для maskable) */
function draw(size, scale, rounded) {
  const px = Buffer.alloc(size * size * 4);
  const SS = 4, c = size / 2, R = (size / 2) * scale, w = R / 7, gap = R / 4.7;
  const corner = size * 0.22;
  const bg = hex(BG), track = hex(TRACK);
  const sample = (x, y) => {
    // фон со скруглёнными углами
    if (rounded) {
      const dx = Math.max(corner - x, 0, x - (size - corner)), dy = Math.max(corner - y, 0, y - (size - corner));
      if (dx * dx + dy * dy > corner * corner) return null;
    }
    const dx = x - c, dy = y - c, d = Math.hypot(dx, dy);
    let ang = Math.atan2(dx, -dy) / (2 * Math.PI); if (ang < 0) ang += 1;
    for (let i = 0; i < RINGS.length; i++) {
      const r = R - w / 2 - i * gap;
      if (Math.abs(d - r) <= w / 2) return ang <= RINGS[i][1] ? hex(RINGS[i][0]) : track;
      // скруглённые концы дуги
      const a = RINGS[i][1] * 2 * Math.PI;
      for (const t of [0, a]) {
        const ex = c + r * Math.sin(t), ey = c - r * Math.cos(t);
        if (Math.hypot(x - ex, y - ey) <= w / 2) return hex(RINGS[i][0]);
      }
    }
    return bg;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const col = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
      if (col) { r += col[0]; g += col[1]; b += col[2]; a++; }
    }
    const o = (y * size + x) * 4;
    if (a) { px[o] = r / a; px[o + 1] = g / a; px[o + 2] = b / a; }
    px[o + 3] = Math.round((a / (SS * SS)) * 255);
  }
  return png(size, px);
}

writeFileSync(resolve(pub, "icon-192.png"), draw(192, 0.78, true));
writeFileSync(resolve(pub, "icon-512.png"), draw(512, 0.78, true));
writeFileSync(resolve(pub, "icon-512-maskable.png"), draw(512, 0.6, false));
writeFileSync(resolve(pub, "apple-touch-icon.png"), draw(180, 0.72, false));

// SVG-версия (фавикон)
const R = 50 * 0.78, w = R / 7, gap = R / 4.7;
const arcs = RINGS.map(([col, p], i) => {
  const r = R - w / 2 - i * gap, L = 2 * Math.PI * r;
  return `<circle cx="50" cy="50" r="${r.toFixed(2)}" fill="none" stroke="${TRACK}" stroke-width="${w.toFixed(2)}"/>` +
    `<circle cx="50" cy="50" r="${r.toFixed(2)}" fill="none" stroke="${col}" stroke-width="${w.toFixed(2)}" stroke-linecap="round" stroke-dasharray="${(p * L).toFixed(2)} ${L.toFixed(2)}" transform="rotate(-90 50 50)"/>`;
}).join("");
writeFileSync(resolve(pub, "icon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${BG}"/>${arcs}</svg>\n`);
console.log("Иконки готовы в public/");
