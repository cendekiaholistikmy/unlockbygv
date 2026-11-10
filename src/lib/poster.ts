import type { Session, Track } from "./types";
import { episodeLabel, imageUrl, isOnline, shortDate, hari, timeLabel, TRACK_COLOR, venueOf } from "./format";

/**
 * Branded fallback posters, drawn as SVG on the fly. Any session without an
 * uploaded poster still gets a proper tile in the curved band and the cards.
 * (SVG inside <img> cannot load web fonts, so it uses heavy system fonts.)
 */

const FONT = "'Arial Black','Helvetica Neue',Arial,sans-serif";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function wrap(text: string, max: number, lines = 3) {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) {
      out.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) out.push(cur);
  if (out.length > lines) {
    out.length = lines;
    out[lines - 1] = out[lines - 1].replace(/\s*\S*$/, "") + "…";
  }
  return out;
}

function toData(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const DEFS = `<defs>
<linearGradient id="f" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#D4500F"/><stop offset=".55" stop-color="#F39A1E"/><stop offset="1" stop-color="#FFD23F"/></linearGradient>
<radialGradient id="glow" cx=".85" cy=".1" r=".9"><stop offset="0" stop-color="#F39A1E" stop-opacity=".45"/><stop offset="1" stop-color="#0B0D14" stop-opacity="0"/></radialGradient>
</defs>`;

/** 16:9 poster for a session. */
export function sessionPoster(s: Session): string {
  const lines = wrap(s.title.replace(/^\[|\]$/g, ""), 26);
  const trackFill = TRACK_COLOR[s.track as Track] ?? "#F39A1E";
  const trackText = s.track === "LIFE" || s.track === "TECH" ? "#0B0D14" : "#FFFFFF";
  const titleY = 470;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">${DEFS}
<rect width="1600" height="900" fill="#0B0D14"/><rect width="1600" height="900" fill="url(#glow)"/>
<rect y="0" width="1600" height="18" fill="url(#f)"/>
<path d="M1250 140 C1262 210 1290 238 1360 250 C1290 262 1262 290 1250 360 C1238 290 1210 262 1140 250 C1210 238 1238 210 1250 140Z" fill="url(#f)" opacity=".9"/>
<text x="96" y="180" font-family="${FONT}" font-size="34" font-weight="900" fill="#B8BCCB" letter-spacing="8">UNLOCK BY GENGVOLUNTEERS</text>
<text x="92" y="330" font-family="${FONT}" font-size="150" font-weight="900" font-style="italic" fill="url(#f)">${esc(episodeLabel(s.episode))}</text>
${lines
  .map(
    (l, i) =>
      `<text x="96" y="${titleY + i * 78}" font-family="${FONT}" font-size="64" font-weight="900" fill="#FFFFFF">${esc(l)}</text>`,
  )
  .join("")}
<rect x="96" y="740" rx="28" width="${s.track.length * 26 + 70}" height="56" fill="${trackFill}" stroke="#FFFFFF" stroke-opacity=".25"/>
<text x="131" y="779" font-family="${FONT}" font-size="28" font-weight="900" fill="${trackText}" letter-spacing="4">${esc(s.track)}</text>
${isOnline(s) ? "" : `<text x="1504" y="720" text-anchor="end" font-family="${FONT}" font-size="30" font-weight="900" fill="#F39A1E" letter-spacing="2">${esc(venueOf(s).toUpperCase())}</text>`}
<text x="1504" y="779" text-anchor="end" font-family="${FONT}" font-size="34" font-weight="900" fill="#FFFFFF">${esc(`${hari(s).toUpperCase()} · ${shortDate(s)} · ${timeLabel(s)}`)}</text>
</svg>`;
  return toData(svg);
}

/** Brand tiles that keep the band full when there are only a few sessions. */
export function brandTiles(): string[] {
  const words: [string, string][] = [
    ["OPEN", "Welcome and speaker intro"],
    ["UNLOCK", "The main conversation"],
    ["ASK", "Your questions, live"],
    ["ACT", "One action for the week"],
    ["GEN-Z,", "Level Up!"],
  ];
  return words.map(([big, small], i) => {
    const dark = i % 2 === 0;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">${DEFS}
<rect width="1600" height="900" fill="${dark ? "#0B0D14" : "url(#f)"}"/>${dark ? `<rect width="1600" height="900" fill="url(#glow)"/>` : ""}
<text x="800" y="500" text-anchor="middle" font-family="${FONT}" font-size="240" font-weight="900" font-style="italic" fill="${dark ? "url(#f)" : "#0B0D14"}">${esc(big)}</text>
<text x="800" y="620" text-anchor="middle" font-family="${FONT}" font-size="54" font-weight="900" fill="${dark ? "#FFFFFF" : "#0B0D14"}" letter-spacing="3">${esc(small.toUpperCase())}</text>
</svg>`;
    return toData(svg);
  });
}

export function posterFor(s: Session) {
  return s.poster ? imageUrl(s.poster) : sessionPoster(s);
}

/** Every image the curved band should stream, sessions first. */
export function bandImages(sessions: Session[]) {
  const imgs: { src: string; alt: string }[] = [];
  for (const s of sessions) {
    imgs.push({ src: posterFor(s), alt: `${episodeLabel(s.episode)}: ${s.title}` });
    for (const g of s.gallery.slice(0, 3)) imgs.push({ src: imageUrl(g), alt: `${episodeLabel(s.episode)} photo` });
  }
  const tiles = brandTiles();
  let i = 0;
  while (imgs.length < 8) imgs.push({ src: tiles[i++ % tiles.length], alt: "UNLOCK" });
  // Interleave brand tiles so posters never sit three in a row.
  if (imgs.length < 14) tiles.slice(0, 3).forEach((t, k) => imgs.splice(2 + k * 3, 0, { src: t, alt: "UNLOCK" }));
  return imgs;
}
