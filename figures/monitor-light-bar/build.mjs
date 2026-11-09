// Fig 1 · Monitor light bar. Run: node build.mjs [--light]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { BAR, PANEL, DESK, TILT, OPTIC, MM, beamOf, readoutOf } from "./model.mjs";
import { BAR_FRAME, LOUPE, barBody, barCap, lensLip, cutEnd, beamArt, loupeOf } from "./live-parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 640;
const HEIGHT = 430;
const AZIMUTH = 32;

const DESK_PLAN = { x: DESK.x0, y: -DESK.half, w: DESK.x1 - DESK.x0, d: DESK.half * 2, r: 5 };
const DESK_H = 7;
const MAT = { x: 16, y: -80, w: 116, d: 160, r: 6 };
const MAT_H = 0.5;
const BASE = { x: -42, y: -32, w: 46, d: 64, r: 8 };
const BASE_H = 2.4;
const NECK = { x: -25, y: -7, w: 9, d: 14, r: 2 };
const PANEL_PLAN = { x: PANEL.back, y: -PANEL.half, w: PANEL.front - PANEL.back, d: PANEL.half * 2, r: 1.2 };
const LIP = { x: 0, y: -9, w: 1.4, d: 18, r: 0.5 };
const BRIDGE = { x: -6.6, y: -9, w: 8, d: 18, r: 0.6 };
const POST = { x: -1.2, y: -5, w: 3.2, d: 10, r: 0.8 };
const KEYBOARD = { x: 54, y: -46, w: 26, d: 92, r: 2.2 };
const KEY_Z = MAT_H + 2.1;
const PUCK = [70, 62];

const P = k.fitProjection(
  [...k.boxCorners(DESK_PLAN, -DESK_H, 0), [BAR.x, -BAR.half - 3, BAR.z + BAR.r + 1], [BAR.x, BAR.half, BAR.z + BAR.r + 1], [PANEL.back, -PANEL.half, PANEL.top], [PANEL.back, PANEL.half, PANEL.top]],
  WIDTH - 150,
  HEIGHT,
  { pad: 20, azimuth: AZIMUTH },
);
P.origin = [P.origin[0] + 150, P.origin[1]];
const MAGNIFY = LOUPE.k / G.scaleOf(P);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const fix = (n) => Math.round(n * 1000) / 1000;
const matrixOf = (u, v, o) => `matrix(${[u[0], u[1], v[0], v[1], o[0], o[1]].map(fix).join(" ")})`;
const O = at([0, 0, 0]);
const axis = (d) => { const p = at(d); return [p[0] - O[0], p[1] - O[1]]; };
const EX = axis([1, 0, 0]);
const EY = axis([0, 1, 0]);
const EZ = axis([0, 0, 1]);
// Floor coordinates (x, y) at z = 0, and screen-plane coordinates (y, z) at x = 0.
const FLOOR = matrixOf(EX, EY, O);
const SCREEN_O = at([PANEL.front + 0.02, 0, 0]);
const SCREEN = matrixOf(EY, EZ, SCREEN_O);

function desk() {
  const out = [`<path class="iso-halo" d="${k.haloOf(DESK_PLAN, -DESK_H, DESK_H, P)}"/>`];
  out.push(S(k.slabOf(DESK_PLAN, -DESK_H, DESK_H, P, 6, 1.2), { tone: "lo", inner: L(k.sideSeam(DESK_PLAN, -2.2, P, 6), { tone: "faint" }) }));
  out.push(S(k.slabOf(MAT, 0, MAT_H, P, 6), { tone: "lo", crease: "none", flat: true }));
  out.push(L(k.planOutline(k.insetPlan(MAT, 2), MAT_H, P, 6), { tone: "faint", dashed: true }));
  return out.join("");
}

function monitor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, 0, BASE_H, P)}" style="filter:blur(5px)"/>`];
  out.push(S(k.slabOf(BASE, 0, BASE_H, P, 8, 0.8), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 3.5), BASE_H, P, 8), { tone: "faint" }));
  const screws = k.corners(BASE, 7);
  out.push(D(screws.map(([x, y]) => at([x, y, BASE_H])), { size: 0.45 }));
  out.push(S(k.slabOf(NECK, BASE_H, PANEL.bottom + 20 - BASE_H, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: NECK.x - 2, y: NECK.y - 2, w: NECK.w + 4, d: NECK.d + 4, r: 2.5 }, BASE_H, 2, P, 3, 0.4), { tone: "mid" }));
  out.push(L(k.sideSeam(NECK, 14, P, 3), { tone: "faint" }));
  out.push(S(k.slabOf({ x: -12, y: -44, w: 7.2, d: 88, r: 4 }, 46, 56, P, 6, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf(PANEL_PLAN, PANEL.bottom, PANEL.top - PANEL.bottom, P, 3, 0.4), { tone: "mid", inner: L(k.sideSeam(PANEL_PLAN, PANEL.bottom + 1.2, P, 3), { tone: "faint" }) }));
  return out.join("");
}

// What the screen shows, drawn in its own plane: an editor window with a sidebar
// and lines of code. Lines that stand for text are marked free.
function screen() {
  const { screenHalf: h, screenBottom: b, screenTop: t } = PANEL;
  const rect = (y0, z0, y1, z1, cls) => `<path class="${cls}" d="M${y0} ${z0}H${y1}V${z1}H${y0}Z"/>`;
  const out = [`<clipPath id="mlb-screen-clip"><path d="M${-h} ${b}H${h}V${t}H${-h}Z"/></clipPath>`];
  out.push(`<g transform="${SCREEN}"><g clip-path="url(#mlb-screen-clip)">`);
  out.push(rect(-h, b, h, t, "mlb-glass"));
  out.push(rect(-h + 4, b + 6, h - 4, t - 4, "mlb-window"));
  out.push(rect(-h + 4, t - 9, h - 4, t - 4, "mlb-bar"));
  out.push(rect(-h + 4, b + 6, -h + 30, t - 9, "mlb-side"));
  out.push(`<g class="mlb-dots">${[0, 1, 2].map((i) => `<circle cx="${-h + 7.5 + i * 3.2}" cy="${t - 6.5}" r="0.9"/>`).join("")}</g>`);
  const code = [];
  const widths = [38, 52, 30, 61, 44, 24, 57, 49, 33, 66, 41, 28, 54, 36, 47];
  widths.forEach((w, i) => {
    const z = t - 14 - i * 4.4;
    if (z < b + 9) return;
    const indent = [0, 6, 6, 12, 12, 6, 0, 6, 12, 12, 6, 0, 6, 6, 0][i];
    code.push(`M${-h + 36 + indent} ${z}h${w}`);
  });
  out.push(`<path class="mlb-code" data-free="true" d="${code.join("")}"/>`);
  const side = [];
  for (let i = 0; i < 11; i++) side.push(`M${-h + 8} ${t - 15 - i * 5.2}h${[16, 12, 18, 10, 14, 17, 11, 15, 9, 13, 16][i]}`);
  out.push(`<path class="mlb-code" data-free="true" d="${side.join("")}"/>`);
  out.push(`<path class="mlb-glare" data-part="glare" d=""/>`);
  out.push(`</g><path class="mlb-frame" d="M${-h} ${b}H${h}V${t}H${-h}Z"/></g>`);
  out.push(D([at([PANEL.front, 62, PANEL.bottom + 2.5])], { size: 0.6, tone: "hi" }));
  return out.join("");
}

function clamp() {
  const out = [];
  const hinge = G.frameOf([-7.4, 0, PANEL.top - 0.2], [0, 1, 0], [0, 0, 1], [1, 0, 0]);
  out.push(S(G.disc(-9, 9, 1.5, hinge, P), { tone: "mid" }));
  out.push(S(k.slabOf(BRIDGE, PANEL.top, 2, P, 2, 0.4), { tone: "mid" }));
  out.push(D([at([BRIDGE.x + 2, -6, PANEL.top + 2]), at([BRIDGE.x + 2, 6, PANEL.top + 2])], { size: 0.4 }));
  out.push(S(k.slabOf(LIP, PANEL.top - 6, 8, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: LIP.x + LIP.w - 0.1, y: -7, w: 0.5, d: 14, r: 0.2 }, PANEL.top - 5.6, 2.2, P, 2), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf(POST, PANEL.top + 2, 3.2, P, 2, 0.3), { tone: "mid" }));
  return out.join("");
}

function keyboard() {
  const out = [`<path class="iso-halo" d="${k.haloOf(KEYBOARD, MAT_H, 2, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(KEYBOARD, MAT_H, KEY_Z - MAT_H, P, 4, 0.6), { tone: "mid" }));
  const keys = [];
  const pitch = 4.4;
  for (let row = 0; row < 5; row++) {
    const x = KEYBOARD.x + 2.2 + row * pitch;
    if (row === 4) {
      const spans = [[0, 2], [2, 4], [4, 6], [6, 14], [14, 16], [16, 18], [18, 20]];
      for (const [a, b] of spans) keys.push({ x, y: KEYBOARD.y + 2.4 + a * pitch, w: pitch - 0.7, d: (b - a) * pitch - 0.7, r: 0.5 });
      continue;
    }
    for (let col = 0; col < 20; col++) keys.push({ x, y: KEYBOARD.y + 2.4 + col * pitch, w: pitch - 0.7, d: pitch - 0.7, r: 0.5 });
  }
  keys.sort((a, b) => k.depthOf([a.x + a.w / 2, a.y + a.d / 2, KEY_Z], P) - k.depthOf([b.x + b.w / 2, b.y + b.d / 2, KEY_Z], P));
  for (const key of keys) out.push(S(k.slabOf(key, KEY_Z, 0.9, P, 2, 0.25), { tone: "mid", crease: "none" }));
  out.push(D([at([KEYBOARD.x + 1.2, KEYBOARD.y + KEYBOARD.d - 3, KEY_Z]), at([KEYBOARD.x + 1.2, KEYBOARD.y + KEYBOARD.d - 6, KEY_Z])], { size: 0.4, tone: "hi" }));
  return out.join("");
}

function puck() {
  const [x, y] = PUCK;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 6, y: y - 6, w: 12, d: 12, r: 6 }, MAT_H, 1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.cylinder(x, y, 6.4, MAT_H, 1.2, P, 40), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, 5.8, MAT_H + 1.2, 4.4, P, 48, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(x, y, 5.8, MAT_H + 1.6, MAT_H + 5.2, 56, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(x, y, 4.2, MAT_H + 5.6, P, 40), { tone: "faint" }));
  const ticks = k.radialTicks(x, y, 4.2, 24, 6, MAT_H + 5.6, [0.6, 1.1], P, -Math.PI * 0.75, Math.PI * 1.5);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([x, y], [x + 2.4, y - 2.4], MAT_H + 5.6, P), { tone: "hi", free: "end" }));
  out.push(D([at([x, y, MAT_H + 5.6])], { size: 0.5, tone: "hi" }));
  return out.join("");
}

function light() {
  return [
    `<g transform="${FLOOR}"><path class="mlb-pool" data-part="pool" d="" fill="url(#mlb-pool-g)" filter="url(#mlb-soft)"/></g>`,
    `<path class="mlb-fan" data-part="fan" d="" fill="url(#mlb-fan-g)"/>`,
  ].join("");
}

function defs() {
  const stop = (offset, opacity) => `<stop offset="${offset}" style="stop-color:var(--mlb-light)" stop-opacity="${opacity}"/>`;
  return `<defs>
<filter id="mlb-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4"/></filter>
<linearGradient id="mlb-pool-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="0">${stop(0, 0)}${stop(0.06, 0.55)}${stop(0.3, 1)}${stop(1, 0)}</linearGradient>
<linearGradient id="mlb-fan-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="0">${stop(0, 0.9)}${stop(1, 0.08)}</linearGradient>
<linearGradient id="mlb-glare-g" gradientUnits="userSpaceOnUse" x1="0" y1="1" x2="0" y2="0"><stop offset="0" style="stop-color:var(--mlb-glare)" stop-opacity="0"/><stop offset="0.12" style="stop-color:var(--mlb-glare)" stop-opacity="0.85"/><stop offset="1" style="stop-color:var(--mlb-glare)" stop-opacity="0.18"/></linearGradient>
</defs>`;
}

const bar = () => `<g data-part="cap"></g><g data-part="body"></g><g data-part="lip"></g>`;
const collar = () => S(G.ringBand(-7, 7, BAR.r, BAR.r + 0.8, BAR_FRAME, P), { tone: "mid", inner: L(G.arcOf(BAR_FRAME, 0, BAR.r + 0.8, P), { tone: "faint" }) }) + D([at([BAR.x, 7, BAR.z + BAR.r + 0.4])], { size: 0.45 });

const CSS = `
.mlb{--mlb-light:#fff1d6;--mlb-glare:#fff6e6;--mlb-glass:#0b0c0e;--mlb-window:#121418;--mlb-side:#0f1114;--mlb-ui:#3a4049;--mlb-cavity:#070707;--mlb-lens:#fff4dc;--mlb-pool-a:.34;--mlb-fan-a:.16}
.iso[data-theme="light"] .mlb{--mlb-light:#f0a020;--mlb-glare:#fff4dc;--mlb-glass:#2a2c31;--mlb-window:#33363c;--mlb-side:#2e3136;--mlb-ui:#5d636d;--mlb-cavity:#3b3b3e;--mlb-lens:#ffc85a;--mlb-pool-a:.22;--mlb-fan-a:.11}
.mlb-loupe-back{fill:var(--anatomy-paper)}
.mlb-loupe-rim{fill:none;stroke:var(--anatomy-mid);stroke-width:.8}
.mlb-loupe-rim2{fill:none;stroke:var(--anatomy-faint);stroke-width:.6}
.mlb-loupe-part{fill:var(--anatomy-shade-2);stroke:var(--anatomy-mid);stroke-width:.6}
.mlb-loupe-pad{fill:var(--anatomy-shade-0);stroke:var(--anatomy-lo);stroke-width:.6}
.mlb-loupe-pin{fill:var(--anatomy-paper);stroke:var(--anatomy-mid);stroke-width:.6}
.mlb-loupe-glass{fill:var(--mlb-glass);stroke:var(--anatomy-lo);stroke-width:.6}
.mlb-loupe-collar{fill:var(--anatomy-shade-1);stroke:var(--anatomy-mid);stroke-width:.6}
.mlb-loupe-bar{fill:var(--anatomy-shade-3);stroke:var(--anatomy-hi);stroke-width:.8}
.mlb-loupe-fan{fill:var(--mlb-light);opacity:calc(var(--mlb-fan-a) * 1.6);mix-blend-mode:screen}
.iso[data-theme="light"] .mlb-loupe-fan{mix-blend-mode:multiply}
.mlb-loupe-plumb{fill:none;stroke:var(--anatomy-mid);stroke-width:.6;stroke-dasharray:1.5 2.5}
.mlb-loupe-edge{fill:none;stroke:var(--anatomy-hi);stroke-width:.7}
.mlb-loupe-peak{fill:none;stroke:var(--anatomy-mid);stroke-width:.6;stroke-dasharray:4 3}
.mlb-loupe-reflector{fill:none;stroke:var(--anatomy-hi);stroke-width:1.2;stroke-linecap:round}
.mlb-loupe-ray{fill:none;stroke:var(--mlb-lens);stroke-width:.6;stroke-dasharray:2 2;stroke-linecap:round}
.mlb-loupe-lensline{fill:none;stroke:var(--anatomy-lit);stroke-width:.8}
.mlb-glass{fill:var(--mlb-glass)}
.mlb-window{fill:var(--mlb-window)}
.mlb-bar{fill:var(--mlb-side)}
.mlb-side{fill:var(--mlb-side)}
.mlb-dots circle{fill:var(--mlb-ui)}
.mlb-code{fill:none;stroke:var(--mlb-ui);stroke-width:1.3;stroke-linecap:round}
.mlb-frame{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke}
.mlb-glare{fill:url(#mlb-glare-g)}
.mlb-pool{opacity:var(--mlb-pool-a);mix-blend-mode:screen}
.mlb-fan{opacity:var(--mlb-fan-a);mix-blend-mode:screen}
.iso[data-theme="light"] .mlb-pool,.iso[data-theme="light"] .mlb-fan{mix-blend-mode:multiply}
.mlb-cavity{fill:var(--mlb-cavity);stroke:var(--anatomy-lo);stroke-width:.3}
.mlb-lens{fill:var(--mlb-lens);stroke:none}
.mlb-lip{fill:var(--mlb-lens)}
.mlb-board{fill:var(--anatomy-shade-2);stroke:var(--anatomy-mid);stroke-width:.3}
.mlb-ray{fill:none;stroke:var(--mlb-lens);stroke-width:.35;stroke-dasharray:.8 .8;stroke-linecap:round}
.mlb-leds circle{fill:var(--mlb-lens)}
.iso-line.mlb-beam{stroke-dasharray:2 3;animation:mlb-flow 1.6s linear infinite}
@keyframes mlb-flow{to{stroke-dashoffset:-10}}
@media (prefers-reduced-motion: reduce){.iso-line.mlb-beam{animation:none}}
`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "mlb",
  label:
    "A monitor on a desk with a light bar clamped to its top edge. The bar's flat lens faces down; inside, an LED board aims down and forward and a curved reflector behind it turns backward rays forward, so no light leaves behind the vertical. The beam lands on the desk in front of the keyboard and never reaches the screen unless the bar is tilted back past its cut-off.",
  body: [
    `<style>${CSS}</style>`,
    defs(),
    desk(),
    monitor(),
    screen(),
    keyboard(),
    puck(),
    light(),
    clamp(),
    bar(),
    `<g data-part="collar">${collar()}</g>`,
    `<g data-part="cut"></g>`,
    `<g data-part="rays"></g>`,
    `<g data-part="loupe"></g>`,
  ],
});

const strip = (file) =>
  readFileSync(join(HERE, file), "utf8")
    .replace(/^import[^;]*;\s*$/gm, "")
    .replace(/^export /gm, "");

const live = `
const P = ${JSON.stringify(P)};
const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const part = (name) => svgEl.querySelector('[data-part="' + name + '"]');
const el = { cap: part("cap"), body: part("body"), lip: part("lip"), cut: part("cut"), rays: part("rays"), pool: part("pool"), fan: part("fan"), glare: part("glare"), loupe: part("loupe") };
const poolG = svgEl.querySelector("#mlb-pool-g");
const poolStops = poolG.querySelectorAll("stop");
const fanG = svgEl.querySelector("#mlb-fan-g");
const glareG = svgEl.querySelector("#mlb-glare-g");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clampTo = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let shown = null;
function draw(tilt) {
  const t = Math.round(tilt * 20) / 20;
  if (t === shown) return;
  shown = t;
  el.cap.innerHTML = solidSvg(barCap(t, P), { tone: "hi", crease: "lo" });
  el.body.innerHTML = solidSvg(barBody(t, P), { tone: "hi", crease: "lo" });
  const lip = lensLip(t, P);
  el.lip.innerHTML = '<path class="mlb-lip" d="' + lip.fill + '"/>' + lineSvg(lip.line, { tone: "lit" });
  const c = cutEnd(t, P);
  el.cut.innerHTML = '<path class="mlb-cavity" d="' + c.cavity + '"/><path class="mlb-board" d="' + c.boss + '"/><path class="mlb-board" d="' + c.board + '"/>' +
    lineSvg(c.reflector, { tone: "hi" }) + c.rays.map((d) => '<path class="mlb-ray" d="' + d + '"/>').join("") +
    '<path class="mlb-lens" d="' + c.lens + '"/>' + lineSvg(c.lensLine, { tone: "lit" }) +
    '<g class="mlb-leds">' + c.leds.map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="0.32"/>').join("") + "</g>";
  const a = beamArt(t, P);
  const b = a.beam;
  el.pool.setAttribute("d", a.pool);
  poolG.setAttribute("x1", b.poolFrom); poolG.setAttribute("x2", b.poolTo);
  const peak = clampTo((b.peakX - b.poolFrom) / Math.max(1, b.poolTo - b.poolFrom), 0.12, 0.9);
  poolStops[1].setAttribute("offset", Math.min(0.06, peak / 2));
  poolStops[2].setAttribute("offset", peak);
  el.fan.setAttribute("d", a.fan);
  fanG.setAttribute("x1", a.fanFrom[0]); fanG.setAttribute("y1", a.fanFrom[1]);
  fanG.setAttribute("x2", a.fanTo[0]); fanG.setAttribute("y2", a.fanTo[1]);
  el.glare.setAttribute("d", a.glare);
  glareG.setAttribute("y1", Math.max(${PANEL.screenBottom} + 1, b.glareTop) + 1.5); glareG.setAttribute("y2", ${PANEL.screenBottom});
  el.rays.innerHTML = a.rays.map((r, i) => lineSvg(r.d, { tone: i % 2 === 0 && b.glare > 0 ? "hi" : "mid", className: "mlb-beam" })).join("") +
    dotsSvg(a.rays.map((r) => r.end), { size: 0.7, tone: "hi" });
  el.loupe.innerHTML = loupeOf(t);
  const text = readoutOf(b);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(t)));
  stage.setAttribute("aria-valuetext", text);
}
const TOUR = [0, 8, 0, -10];
const HOLD = 3.2;
let tilt = ${TILT.rest}, target = tilt, clock = 0, touring = !still.matches, visible = false, frame = 0, last = 0, idle = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; target = TOUR[Math.floor(clock / HOLD) % TOUR.length]; }
  tilt = still.matches ? target : tilt + (target - tilt) * (1 - Math.exp(-dt / 0.45));
  if (Math.abs(target - tilt) < 0.02) tilt = target;
  draw(tilt);
  const settled = !touring && tilt === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false;
  target = clampTo(next, ${TILT.min}, ${TILT.max});
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 4000);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svgEl.getBoundingClientRect();
  const share = clampTo(((event.clientX - box.left) / box.width - 0.15) / 0.7, 0, 1);
  steer(${TILT.min} + share * (${TILT.max} - ${TILT.min}));
});
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = target + 1;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = target - 1;
  if (event.key === "Home") to = ${TILT.min};
  if (event.key === "End") to = ${TILT.max};
  if (to === null) return;
  event.preventDefault();
  steer(Math.round(to));
});
window.__mlb = { set: (v) => { touring = false; tilt = target = v; draw(v); } };
draw(tilt);
`;

const script = [
  readFileSync(join(HERE, "../kit/iso-kit.mjs"), "utf8").replace(/^export /gm, ""),
  readFileSync(join(HERE, "../kit/lathe.mjs"), "utf8").replace(/^import[^;]*;\s*$/gm, "").replace(/^export /gm, "").replace(/\b(oriented|runsOf|signedArea)\b/g, "lathe_$1"),
  strip("model.mjs"),
  strip("live-parts.mjs"),
  live,
].join("\n");

const rest = beamOf(TILT.rest);
const body = k.plateHtml({
  fig: "Fig 1",
  title: "Monitor light bar",
  hint: "Move across to tilt the bar",
  readout: readoutOf(rest),
  keys: [
    { mark: "lit", label: "Lens and LEDs: where the light leaves the bar" },
    { mark: "raised", label: "Cut end: LED board aimed down and forward, reflector behind it" },
    { mark: "dashed", label: "Edge rays of the beam, from each end of the lens" },
    { mark: "dotted", label: `Detail, ${MAGNIFY.toFixed(0)}\u00d7: the cut end against true vertical` },
  ],
  caption: `A light bar sits on the monitor's top edge, ${BAR.half * 2 * MM / 10} cm long and ${Math.round(((BAR.z - BAR.r) * MM) / 10)} cm above the desk, with a lip over the front bezel and a hinged counterweight leg behind. Its LEDs are aimed down and forward and a reflector turns every backward ray forward, so the beam runs from ${OPTIC.rear}° to ${OPTIC.front}° in front of vertical: it lights the desk and keyboard but never reaches the screen, so there is no glare to reflect into your eyes. Tilt the bar back more than ${OPTIC.rear}° and the rear edge of the beam crosses the screen plane and lights the glass.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Light bar tilt: arrow keys turn the bar in its collar" aria-valuemin="${TILT.min}" aria-valuemax="${TILT.max}" aria-valuenow="0">${svg}</div>`,
});

const out = theme === "light" ? "monitor-light-bar-light.html" : "monitor-light-bar.html";
writeFileSync(join(HERE, out), k.pageHtml({ title: "Monitor light bar", theme, body, script, width: 700 }));
console.log("wrote", out);
