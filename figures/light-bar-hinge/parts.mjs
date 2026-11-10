// Parts that move with the panel thickness. The build draws them at rest and the
// page redraws them from the same functions (imports and exports stripped).
import { iso, pathOf, slabOf, solidSvg, lineSvg, dotsSvg } from "../kit/iso-kit.mjs";
import { frameOf, prismOf, disc, circleOf } from "../kit/lathe.mjs";
import { HINGE, LEG, PAD, WEIGHT, poseOf } from "./model.mjs";

export const PANEL_Y = 34;
export const PANEL_LOW = -66;
const DEG = Math.PI / 180;
export const HINGE_FRAME = frameOf([HINGE.x, 0, HINGE.z], [0, 1, 0], [0, 0, 1], [1, 0, 0]);

// A rectangle in the leg's own coordinates: s down the leg, o across it (+ toward the panel).
const legRect = (phi, s0, s1, o0, o1) => {
  const t = phi * DEG;
  const at = (s, o) => [-s * Math.cos(t) + o * Math.sin(t), s * Math.sin(t) + o * Math.cos(t)];
  return [at(s0, o0), at(s1, o0), at(s1, o1), at(s0, o1)];
};
const legPoint = (phi, s, o, y) => {
  const t = phi * DEG;
  return [HINGE.x + s * Math.sin(t) + o * Math.cos(t), y, HINGE.z - s * Math.cos(t) + o * Math.sin(t)];
};

// The monitor's top edge, cut at y = ±PANEL_Y so its layers show on the near cut.
export function panelSvg(thick, P) {
  const plan = { x: -thick, y: -PANEL_Y, w: thick, d: PANEL_Y * 2, r: 0 };
  const out = [solidSvg(slabOf(plan, PANEL_LOW, -PANEL_LOW, P, 1), { tone: "lo" })];
  const cut = (x) => pathOf([iso([x, PANEL_Y, 0], P), iso([x, PANEL_Y, PANEL_LOW], P)]);
  const layers = [-1.2, -3.4];
  if (thick > 9) layers.push(-thick + 1.6);
  out.push(lineSvg(layers.map(cut).join(""), { tone: "faint" }));
  const back = -thick + 1.6;
  if (thick > 12) {
    // the hollow behind the backlight: a board on stand-offs, seen in the cut
    const board = (x0, x1, z0, z1) => pathOf([[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => iso([x, PANEL_Y, z], P)), true);
    const bx = back + 1.4;
    out.push(`<path class="hb-board" d="${board(bx, bx + 1.6, -12, -56)}"/>`);
    out.push(lineSvg([-20, -48].map((z) => pathOf([iso([back, PANEL_Y, z], P), iso([bx, PANEL_Y, z], P)])).join(""), { tone: "lo" }));
  }
  return out.join("");
}

export function padSvg(phi, P) {
  const F = HINGE_FRAME;
  const s1 = LEG.len;
  const pad = prismOf(F, legRect(phi, s1 - PAD.len, s1, LEG.thick / 2, LEG.thick / 2 + PAD.thick), -PAD.half, PAD.half, P);
  return solidSvg(pad, { tone: "lo", crease: "none" });
}

export function legSvg(phi, P) {
  const F = HINGE_FRAME;
  const plate = prismOf(F, legRect(phi, 1.5, LEG.len, -LEG.thick / 2, LEG.thick / 2), -LEG.half, LEG.half, P);
  const face = -LEG.thick / 2 - 0.02;
  // a rating label on the outer face: a plate outline and three rule lines standing for text
  const label = [[18, 40]].map(([a, b]) => pathOf([legPoint(phi, a, face, -6), legPoint(phi, b, face, -6), legPoint(phi, b, face, 6), legPoint(phi, a, face, 6)].map((p) => iso(p, P)), true)).join("");
  const rules = [22, 27, 32].map((s) => pathOf([iso(legPoint(phi, s, face, -4.5), P), iso(legPoint(phi, s, face, 4.5 - (s % 3)), P)])).join("");
  return solidSvg(plate, { tone: "hi", crease: "lo" }) + lineSvg(label, { tone: "lo" }) + lineSvg(rules, { tone: "faint", free: true });
}

// The hinge: bridge knuckles at the ends, leg knuckles inside them, and the leg's
// centre hub, from which the counterweight arm points back. Knuckles are drawn far
// (−y) to near (+y); the weight, furthest back and so nearest the viewer, goes last.
export const KNUCKLES = [[-14, -9.2, "bridge"], [-9, -4.6, "leg"], [4.6, 9, "leg"], [9.2, 14, "bridge"]];

export function hingeSvg(phi, P) {
  const F = HINGE_FRAME;
  const knuckle = ([y0, y1, owner]) => solidSvg(disc(y0, y1, HINGE.r, F, P), { tone: owner === "leg" ? "hi" : "mid", crease: "lo" });
  const out = [knuckle(KNUCKLES[0]), knuckle(KNUCKLES[1])];
  out.push(solidSvg(disc(-4.4, 4.4, HINGE.r + 0.6, F, P), { tone: "hi", crease: "lo" }));
  const arm = prismOf(F, legRect(phi, -1.6, 1.6, -WEIGHT.arm + WEIGHT.w / 2 - 0.2, -HINGE.r), -3.4, 3.4, P);
  out.push(solidSvg(arm, { tone: "hi", crease: "lo" }));
  out.push(knuckle(KNUCKLES[2]), knuckle(KNUCKLES[3]));
  out.push(dotsSvg([iso([HINGE.x, 14.02, HINGE.z], P)], { size: 0.7, tone: "hi" }));
  out.push(lineSvg(circleOf(F, 14, 1.3, P), { tone: "lo" }));
  // the counterweight: a steel block with two cap screws holding it to the arm
  const o0 = -WEIGHT.arm - WEIGHT.w / 2;
  const o1 = -WEIGHT.arm + WEIGHT.w / 2;
  const block = prismOf(F, legRect(phi, -WEIGHT.h / 2, WEIGHT.h / 2, o0, o1), -WEIGHT.half, WEIGHT.half, P);
  const face = WEIGHT.half + 0.02;
  // its centre of gravity, marked on the near face as the usual quartered circle
  const c = legPoint(phi, 0, -WEIGHT.arm, face);
  const ring = (r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return iso([c[0] + r * Math.cos(a), face, c[2] + r * Math.sin(a)], P); });
  const quarter = (a0) => pathOf([iso(c, P), ...ring(2.6, a0, a0 + Math.PI / 2, 8)], true);
  const mark = `<path class="hb-cg" d="${quarter(0)}${quarter(Math.PI)}"/>` + lineSvg(pathOf(ring(2.6, 0, Math.PI * 2, 32), true), { tone: "lit" });
  const screws = [-6, 6].map((y) => iso(legPoint(phi, -WEIGHT.h / 2 - 0.02, -WEIGHT.arm, y), P));
  out.push(solidSvg(block, { tone: "hi", lit: true, crease: "lo" }) + mark);
  out.push(dotsSvg(screws, { size: 0.55, tone: "hi" }));
  return out.join("");
}

export function partsOf(thick, P) {
  const pose = poseOf(thick);
  return { pose, panel: panelSvg(thick, P), pad: padSvg(pose.phi, P), leg: legSvg(pose.phi, P), hinge: hingeSvg(pose.phi, P) };
}
