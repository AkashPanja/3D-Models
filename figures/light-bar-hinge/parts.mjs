// Parts that move with the panel thickness. The build draws them at rest and the
// page redraws them from the same functions (imports and exports stripped).
import { iso, pathOf, slabOf, solidSvg, lineSvg, dotsSvg } from "../kit/iso-kit.mjs";
import { frameOf, prismOf } from "../kit/lathe.mjs";
import { HINGE, LEG, PAD, poseOf } from "./model.mjs";

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

// The spring's lower arm lies on the leg's outer face and pushes it toward the panel.
export function armSvg(phi, P) {
  const a = legPoint(phi, 4.2, -LEG.thick / 2 - 0.5, 1.5);
  const b = legPoint(phi, 15, -LEG.thick / 2 - 0.5, 1.5);
  const hook = legPoint(phi, 15, -LEG.thick / 2, 1.5);
  return lineSvg(pathOf([iso(a, P), iso(b, P), iso(hook, P)]), { tone: "lit" }) + dotsSvg([iso(hook, P)], { size: 0.5, tone: "hi" });
}

export function partsOf(thick, P) {
  const pose = poseOf(thick);
  return { pose, panel: panelSvg(thick, P), pad: padSvg(pose.phi, P), leg: legSvg(pose.phi, P), arm: armSvg(pose.phi, P) };
}
