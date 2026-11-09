// The parts that change with the tilt. The build draws them at rest, and the page
// redraws them each frame from the same functions (imports and exports stripped).
import { iso, pathOf } from "../kit/iso-kit.mjs";
import { frameOf, prismOf, hullOf } from "../kit/lathe.mjs";
import { BAR, PANEL, turned, beamOf } from "./model.mjs";

// The bar's frame: axis +y, u = up, v = toward the viewer, so a section point
// (u forward, w up) maps to frame coordinates [w, u].
export const BAR_FRAME = frameOf([BAR.x, 0, BAR.z], [0, 1, 0], [0, 0, 1], [1, 0, 0]);
const LENS_ANGLE = Math.acos(BAR.chord / BAR.r);

// The D section: an arc over the top, closed by the flat lens chord.
export function sectionOf(r, chord, steps = 44) {
  const reach = Math.PI - Math.acos(chord / r);
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const a = -reach + (2 * reach * i) / steps;
    points.push([r * Math.sin(a), r * Math.cos(a)]);
  }
  return points;
}

const inFrame = (tilt, points) => points.map((point) => { const [u, w] = turned(tilt, point); return [w, u]; });
const worldAt = (tilt, [u, w], y) => { const [du, dw] = turned(tilt, [u, w]); return [BAR.x + du, y, BAR.z + dw]; };
const flat = (points, P) => pathOf(points.map((point) => iso(point, P)), true);

export function barBody(tilt, P) {
  return prismOf(BAR_FRAME, inFrame(tilt, sectionOf(BAR.r, BAR.chord)), -BAR.half, BAR.half, P);
}

export function barCap(tilt, P) {
  return prismOf(BAR_FRAME, inFrame(tilt, sectionOf(BAR.r + 0.25, BAR.chord + 0.2)), -BAR.half - 3, -BAR.half, P);
}

// The front lip of the lens: the one edge of the lit window you can see from above.
export function lensLip(tilt, P) {
  const edge = BAR.r * Math.sin(LENS_ANGLE);
  const a = worldAt(tilt, [edge, -BAR.chord], -BAR.lit);
  const b = worldAt(tilt, [edge, -BAR.chord], BAR.lit);
  const c = worldAt(tilt, [edge - 0.2, -BAR.chord - 0.55], BAR.lit);
  const d = worldAt(tilt, [edge - 0.2, -BAR.chord - 0.55], -BAR.lit);
  return { fill: flat([a, b, c, d], P), line: pathOf([iso(a, P), iso(b, P)]) };
}

// The cut end of the bar at y = BAR.half: housing wall, cavity, lens, LED board,
// reflector and three rays, all turned with the bar.
export function cutEnd(tilt, P, project) {
  const y = BAR.half + 0.02;
  const at = project || ((point) => iso(worldAt(tilt, point, y), P));
  const poly = (points) => pathOf(points.map(at), true);
  const line = (points) => pathOf(points.map(at));
  const inner = 3.3;
  const lensTop = -2.3;
  const reach = Math.PI - Math.acos(-lensTop / inner);
  const cavity = [];
  for (let i = 0; i <= 36; i++) {
    const a = -reach + (2 * reach * i) / 36;
    cavity.push([inner * Math.sin(a), inner * Math.cos(a)]);
  }
  const lensHalf = Math.sqrt(inner * inner - lensTop * lensTop);
  const outerHalf = Math.sqrt(BAR.r * BAR.r - BAR.chord * BAR.chord);
  const lens = [[-lensHalf, lensTop], [lensHalf, lensTop], [outerHalf, -BAR.chord], [-outerHalf, -BAR.chord]];
  // LED board on a boss at the top of the cavity, tipped 20 deg so the LEDs face down and forward.
  const t = (20 * Math.PI) / 180;
  const along = [Math.cos(t), Math.sin(t)];
  const down = [Math.sin(t), -Math.cos(t)];
  const mid = [-0.35, 2.55];
  const corner = (s, n) => [mid[0] + along[0] * s + down[0] * n, mid[1] + along[1] * s + down[1] * n];
  const board = [corner(-1.1, -0.2), corner(1.1, -0.2), corner(1.1, 0.25), corner(-1.1, 0.25)];
  const boss = [[-0.9, 3.25], [0.9, 3.25], corner(0.5, -0.2), corner(-0.5, -0.2)];
  const leds = [-0.6, 0, 0.6].map((s) => corner(s, 0.32));
  // The reflector: a curve down the rear wall that turns backward rays forward.
  const reflector = [];
  for (let i = 0; i <= 14; i++) {
    const f = i / 14;
    const a = -0.62 - f * 1.78;
    const r = inner - 0.12 - 0.5 * Math.sin(f * Math.PI);
    reflector.push([r * Math.sin(a), r * Math.cos(a)]);
  }
  const bounce = reflector[8];
  const rays = [
    [leds[1], [0.35, lensTop]],
    [leds[2], [1.55, lensTop]],
    [leds[0], bounce, [-0.25, lensTop]],
  ];
  return {
    cavity: poly(cavity),
    lens: poly(lens),
    lensLine: line([[-lensHalf, lensTop], [lensHalf, lensTop]]),
    boss: poly(boss),
    board: poly(board),
    leds: leds.map(at),
    reflector: line(reflector),
    rays: rays.map(line),
  };
}

// The light itself: the pool on the desk, the fan of light under the bar, the
// lit band on the screen when the rear ray leans back past it, and four edge rays.
export function beamArt(tilt, P) {
  const beam = beamOf(tilt);
  const [ex, ez] = beam.exit;
  const ends = [];
  const rays = [];
  for (const side of [-1, 1]) {
    const start = [ex, side * BAR.lit, ez];
    for (const land of [beam.rearLand, beam.frontLand]) {
      const end = [land.x, side * beam.halfAt(land.dist), land.z];
      ends.push(end);
      rays.push({ d: pathOf([iso(start, P), iso(end, P)]), end: iso(end, P) });
    }
  }
  const starts = [iso([ex, -BAR.lit, ez], P), iso([ex, BAR.lit, ez], P)];
  const screenEnds = ends.map((end) => iso(end, P));
  const fan = pathOf(hullOf([...starts, ...screenEnds]), true);
  const poolHalf = (x) => beam.halfAt(Math.hypot(x - ex, ez));
  const pool = [
    [beam.poolFrom, -poolHalf(beam.poolFrom)],
    [beam.poolTo, -poolHalf(beam.poolTo)],
    [beam.poolTo, poolHalf(beam.poolTo)],
    [beam.poolFrom, poolHalf(beam.poolFrom)],
  ];
  const glareHalf = Math.min(PANEL.screenHalf, beam.halfAt(beam.rearLand.dist));
  return {
    beam,
    rays,
    fan,
    fanFrom: iso([ex, 0, ez], P),
    fanTo: iso([beam.peakX, 0, 0], P),
    pool: pathOf(pool, true),
    glare: beam.glare > 0 ? pathOf([[-glareHalf, PANEL.screenBottom], [glareHalf, PANEL.screenBottom], [glareHalf, beam.glareTop], [-glareHalf, beam.glareTop]], true) : "",
  };
}

// The detail view: the bar's cut end seen face-on at LOUPE.k px per unit, with the
// clamp and the top of the panel behind it, true vertical, and the beam's edges.
// Seen from the +y end, "toward the viewer" (+x) runs to the left of the inset.
export const LOUPE = { cx: 92, cy: 150, r: 72, k: 7, lift: 20 };

export function loupeOf(tilt) {
  const { cx, cy, r, k } = LOUPE;
  const ox = cx;
  const oy = cy - LOUPE.lift;
  // world (x, z) relative to the bar axis -> inset px
  const px = ([x, z]) => [ox - (x - BAR.x) * k, oy - (z - BAR.z) * k];
  const sec = (point) => { const [du, dw] = turned(tilt, point); return px([BAR.x + du, BAR.z + dw]); };
  const poly = (points, cls) => `<path class="${cls}" d="${pathOf(points, true)}"/>`;
  const line = (points, cls) => `<path class="${cls}" d="${pathOf(points)}"/>`;
  const rect = (x0, z0, x1, z1) => [px([x0, z0]), px([x1, z0]), px([x1, z1]), px([x0, z1])];
  const beam = beamOf(tilt);
  const exit = px(beam.exit);
  const out = [`<clipPath id="mlb-loupe-clip"><circle cx="${cx}" cy="${cy}" r="${r - 0.6}"/></clipPath>`];
  out.push(`<circle class="mlb-loupe-back" cx="${cx}" cy="${cy}" r="${r}"/>`);
  out.push(`<g clip-path="url(#mlb-loupe-clip)">`);
  // beam fan and its edge rays, out to the rim
  const far = r * 2.4 / k;
  const toward = (deg) => { const t = (deg * Math.PI) / 180; return px([beam.exit[0] + Math.sin(t) * far, beam.exit[1] - Math.cos(t) * far]); };
  const fan = [exit];
  for (let i = 0; i <= 12; i++) fan.push(toward(beam.rear + ((beam.front - beam.rear) * i) / 12));
  out.push(poly(fan, "mlb-loupe-fan"));
  // the panel, its glass face and the clamp
  out.push(poly(rect(PANEL.back, 60, PANEL.front, PANEL.top), "mlb-loupe-part"));
  out.push(poly(rect(PANEL.front - 0.35, 60, PANEL.front, PANEL.screenTop), "mlb-loupe-glass"));
  out.push(poly(rect(-6.6, PANEL.top, 1.4, PANEL.top + 2), "mlb-loupe-part"));
  out.push(poly(rect(0, PANEL.top - 6, 1.4, PANEL.top), "mlb-loupe-part"));
  out.push(poly(rect(-7.4 - 0.9, PANEL.top - 18, -7.4 + 0.9 + 0.4, PANEL.top - 0.2), "mlb-loupe-part"));
  out.push(poly(rect(PANEL.back - 0.5, PANEL.top - 18, PANEL.back, PANEL.top - 14), "mlb-loupe-pad"));
  const hinge = px([-7.4, PANEL.top - 0.2]);
  out.push(`<circle class="mlb-loupe-part" cx="${hinge[0]}" cy="${hinge[1]}" r="${1.5 * k}"/>`);
  out.push(`<circle class="mlb-loupe-pin" cx="${hinge[0]}" cy="${hinge[1]}" r="${0.4 * k}"/>`);
  out.push(poly(rect(-1.2, PANEL.top + 2, 2, BAR.z), "mlb-loupe-part"));
  // true vertical through the exit, ending on the rim
  out.push(line([exit, px([beam.exit[0], beam.exit[1] - far])], "mlb-loupe-plumb"));
  for (const deg of [beam.rear, beam.front]) out.push(line([exit, toward(deg)], "mlb-loupe-edge"));
  out.push(line([exit, toward(beam.peak)], "mlb-loupe-peak"));
  // the bar's section
  out.push(`<circle class="mlb-loupe-collar" cx="${ox}" cy="${oy}" r="${(BAR.r + 0.8) * k}"/>`);
  out.push(poly(sectionOf(BAR.r, BAR.chord, 48).map(sec), "mlb-loupe-bar"));
  const c = cutEnd(tilt, null, sec);
  out.push(`<path class="mlb-cavity" d="${c.cavity}"/><path class="mlb-board" d="${c.boss}"/><path class="mlb-board" d="${c.board}"/>`);
  out.push(`<path class="mlb-loupe-reflector" d="${c.reflector}"/>`);
  out.push(c.rays.map((d) => `<path class="mlb-loupe-ray" d="${d}"/>`).join(""));
  out.push(`<path class="mlb-lens" d="${c.lens}"/><path class="mlb-loupe-lensline" d="${c.lensLine}"/>`);
  out.push(`<g class="mlb-leds">${c.leds.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${0.3 * k}"/>`).join("")}</g>`);
  out.push(`</g>`);
  out.push(`<circle class="mlb-loupe-rim" cx="${cx}" cy="${cy}" r="${r}"/><circle class="mlb-loupe-rim2" cx="${cx}" cy="${cy}" r="${r + 3}"/>`);
  return out.join("");
}
