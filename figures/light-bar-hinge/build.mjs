// Fig 2 · The light bar clamp's counterweighted hinge. Run: node build.mjs [--light]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { HINGE, LEG, WEIGHT, THICK, FREE, poseOf, readoutOf } from "./model.mjs";
import { PANEL_Y, PANEL_LOW, partsOf } from "./parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 640;
const HEIGHT = 440;
const AZIMUTH = 128;

const BRIDGE = { x: -48, y: -14, w: 68, d: 28, r: 1.5 };
const BRIDGE_H = 4;
const LIP = { x: 0, y: -14, w: 4, d: 28, r: 0.6 };
const POST = { x: 10, y: -6, w: 12, d: 12, r: 1 };
const BAR = { x: 16, z: 22, r: 15, half: 36 };
const BAR_FRAME = G.frameOf([BAR.x, 0, BAR.z], [0, 1, 0], [0, 0, 1], [1, 0, 0]);
const PIN = G.frameOf([HINGE.x, 0, HINGE.z], [0, 1, 0], [0, 0, 1], [1, 0, 0]);

const P = k.fitProjection(
  [...k.boxCorners({ x: -THICK.max, y: -PANEL_Y, w: THICK.max, d: PANEL_Y * 2 }, PANEL_LOW, 0), [BAR.x + BAR.r, -BAR.half - 2, BAR.z + BAR.r], [BAR.x - BAR.r, BAR.half + 2, BAR.z + BAR.r], [BAR.x + BAR.r, BAR.half + 2, BAR.z - BAR.r], [HINGE.x - WEIGHT.arm - WEIGHT.w, WEIGHT.half, HINGE.z - WEIGHT.arm], [HINGE.x - WEIGHT.arm - WEIGHT.w, WEIGHT.half, HINGE.z + WEIGHT.h]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: AZIMUTH },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

function lip() {
  return S(k.slabOf(LIP, -14, 14, P, 2, 0.3), { tone: "mid" });
}

function bridge() {
  const out = [S(k.slabOf(BRIDGE, 0, BRIDGE_H, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(BRIDGE, 1.2, P, 3), { tone: "faint" }) })];
  const recess = { x: -36, y: -9, w: 30, d: 18, r: 1.5 };
  out.push(L(k.planOutline(recess, BRIDGE_H, P, 3), { tone: "lo" }));
  out.push(L([0, 1, 2].map((i) => k.lineOnTop([recess.x + 4, -5 + i * 4], [recess.x + 18 - i * 4, -5 + i * 4], BRIDGE_H, P)).join(""), { tone: "faint", free: true }));
  out.push(D([[-44, -10], [-44, 10], [16, -10], [16, 10]].map(([x, y]) => at([x, y, BRIDGE_H])), { size: 0.5 }));
  out.push(L([[-44, -10], [-44, 10], [16, -10], [16, 10]].map(([x, y]) => k.ring(x, y, 1.6, BRIDGE_H, P, 16)).join(""), { tone: "lo" }));
  return out.join("");
}

function bar() {
  const out = [S(k.slabOf(POST, BRIDGE_H, 2.8, P, 2, 0.3), { tone: "mid" })];
  out.push(S(G.disc(-BAR.half - 2, -BAR.half, BAR.r + 0.4, BAR_FRAME, P), { tone: "mid" }));
  out.push(S(G.solidOf([[-BAR.half, BAR.r], [BAR.half, BAR.r]], BAR_FRAME, P), { tone: "mid", crease: "none" }));
  out.push(S(G.ringBand(-9, 9, BAR.r, BAR.r + 1.5, BAR_FRAME, P), { tone: "mid", inner: L(G.arcOf(BAR_FRAME, 0, BAR.r + 1.5, P), { tone: "faint" }) }));
  out.push(S(G.disc(BAR.half, BAR.half + 2, BAR.r + 0.4, BAR_FRAME, P), { tone: "mid" }));
  out.push(L(G.circleOf(BAR_FRAME, BAR.half + 2, BAR.r - 3, P), { tone: "faint" }));
  return out.join("");
}

const CSS = `
.hb-cg{fill:var(--anatomy-lit);stroke:none}
.hb-board{fill:var(--anatomy-shade-1);stroke:var(--anatomy-lo);stroke-width:.4}
`;

const rest = partsOf(THICK.rest, P);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "The clamp of a monitor light bar, seen from behind on a cut piece of the monitor's top edge. A bridge rests on the edge with a lip over the front; at its back a pin hinge carries a bell crank: a leg hanging down and a short arm pointing back with a steel counterweight. Gravity pulls the weight down, which swings the leg forward until its rubber pad meets the back of the panel, whatever its thickness.",
  body: [
    `<style>${CSS}</style>`,
    lip(),
    `<g data-part="panel">${rest.panel}</g>`,
    `<g data-part="pad">${rest.pad}</g>`,
    `<g data-part="leg">${rest.leg}</g>`,
    bridge(),
    bar(),
    `<g data-part="hinge">${rest.hinge}</g>`,
  ],
});

const strip = (text) => text.replace(/^import[^;]*;\s*$/gm, "").replace(/^export /gm, "");
const script = [
  readFileSync(join(HERE, "../kit/iso-kit.mjs"), "utf8").replace(/^export /gm, ""),
  strip(readFileSync(join(HERE, "../kit/lathe.mjs"), "utf8")).replace(/\b(oriented|runsOf|signedArea)\b/g, "lathe_$1"),
  strip(readFileSync(join(HERE, "model.mjs"), "utf8")),
  strip(readFileSync(join(HERE, "parts.mjs"), "utf8")),
  `
const P = ${JSON.stringify(P)};
const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const part = (name) => svgEl.querySelector('[data-part="' + name + '"]');
const el = { panel: part("panel"), pad: part("pad"), leg: part("leg"), hinge: part("hinge") };
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clampTo = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let shown = null;
function draw(thick) {
  const t = Math.round(thick * 10) / 10;
  if (t === shown) return;
  shown = t;
  const p = partsOf(t, P);
  el.panel.innerHTML = p.panel; el.pad.innerHTML = p.pad; el.leg.innerHTML = p.leg; el.hinge.innerHTML = p.hinge;
  const text = readoutOf(p.pose);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(t)));
  stage.setAttribute("aria-valuetext", text);
}
const TOUR = [22, 40, 22, 8];
const HOLD = 3.2;
let thick = ${THICK.rest}, target = thick, clock = 0, touring = !still.matches, visible = false, frame = 0, last = 0, idle = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; target = TOUR[Math.floor(clock / HOLD) % TOUR.length]; }
  thick = still.matches ? target : thick + (target - thick) * (1 - Math.exp(-dt / 0.5));
  if (Math.abs(target - thick) < 0.02) thick = target;
  draw(thick);
  frame = visible && (touring || thick !== target) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false;
  target = clampTo(next, ${THICK.min}, ${THICK.max});
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 4000);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svgEl.getBoundingClientRect();
  const share = clampTo(((event.clientX - box.left) / box.width - 0.15) / 0.7, 0, 1);
  steer(${THICK.min} + share * (${THICK.max} - ${THICK.min}));
});
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = target + 2;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = target - 2;
  if (event.key === "Home") to = ${THICK.min};
  if (event.key === "End") to = ${THICK.max};
  if (to === null) return;
  event.preventDefault();
  steer(Math.round(to));
});
window.__hb = { set: (v) => { touring = false; thick = target = v; draw(v); } };
draw(thick);
`,
].join("\n");

const thin = poseOf(THICK.min);
const thickest = poseOf(THICK.max);
const body = k.plateHtml({
  fig: "Fig 2",
  title: "Clamp hinge",
  hint: "Move to change the monitor",
  readout: readoutOf(rest.pose),
  keys: [
    { mark: "lit", label: "Counterweight, 150 g, with its centre of gravity marked" },
    { mark: "raised", label: "Leg, hub and arm: one rigid crank that swings on the pin" },
    { mark: "flat", label: "Monitor top edge, cut to show its layers" },
  ],
  caption: `Seen from behind. The bridge rests on the monitor's top edge and its lip hooks over the front. At the back of the bridge a pin carries one rigid crank: the leg hangs down and a short arm points back with a ${WEIGHT.weight * 100} g steel weight ${WEIGHT.arm} mm behind the pin. With nothing in the way the crank would hang with its centre of gravity straight under the pin, the leg swung ${FREE.toFixed(0)}\u00b0 forward. The panel stops it first, so the centre of gravity stays behind the pin (${thin.behind.toFixed(0)} mm on a ${THICK.min} mm panel, ${thickest.behind.toFixed(0)} mm on a ${THICK.max} mm one) and gravity keeps turning the crank: the pad presses the back of the panel and the lip presses the front with the same force, ${thin.grip.toFixed(2)} to ${thickest.grip.toFixed(2)} N. Unlike a spring, the weight presses almost equally on thin and thick monitors and never wears out. The weight, arm and ${LEG.len} mm leg are illustrative values.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Monitor thickness: arrow keys change the panel the clamp sits on" aria-valuemin="${THICK.min}" aria-valuemax="${THICK.max}" aria-valuenow="${THICK.rest}">${svg}</div>`,
});

const out = theme === "light" ? "light-bar-hinge-light.html" : "light-bar-hinge.html";
writeFileSync(join(HERE, out), k.pageHtml({ title: "Clamp hinge", theme, body, script, width: 700 }));
console.log("wrote", out);
