// The light bar's optics, in world units (1 unit = 4 mm). Pure: no imports, so the
// page inlines this file as-is and the build and the live figure share one model.

export const MM = 4;

// The bar: a D-section tube lying along y, its flat lens facing down.
export const BAR = { x: 3, z: 129.5, r: 4, half: 54, lit: 50, chord: 2.8 };

// The monitor panel: its screen is the plane x = 0, facing the viewer (+x).
export const PANEL = { back: -5, front: 0, bottom: 34, top: 122, half: 78, screenBottom: 39, screenTop: 120, screenHalf: 76 };

// The desk top, z = 0.
export const DESK = { x0: -44, x1: 142, half: 100 };

// The asymmetric optic: angles from straight down, positive toward the viewer.
// The reflector cuts every ray off at 3 deg in front of vertical; the front edge
// of the beam is at 42 deg and the brightest ray at 20 deg.
export const OPTIC = { rear: 3, peak: 20, front: 42, spread: 0.18 };

// How far the bar turns in its collar.
export const TILT = { min: -14, max: 5, rest: 0 };

const RAD = Math.PI / 180;

// A point in the bar's own section (u toward the viewer, w up) turned by the tilt.
export function turned(tilt, [u, w]) {
  const t = tilt * RAD;
  return [u * Math.cos(t) - w * Math.sin(t), u * Math.sin(t) + w * Math.cos(t)];
}

// Where the light leaves the lens: the centre of the chord, turned with the bar.
export function exitOf(tilt) {
  const [du, dw] = turned(tilt, [0, -BAR.chord]);
  return [BAR.x + du, BAR.z + dw];
}

// Where a ray from (x0, z0) at `deg` from vertical lands: on the screen plane if
// it leans back far enough to reach it, otherwise on the desk.
export function landOf([x0, z0], deg) {
  const t = deg * RAD;
  const dx = Math.sin(t);
  const dz = -Math.cos(t);
  if (dx < 0) {
    const k = (PANEL.front - x0) / dx;
    const z = z0 + dz * k;
    if (z >= 0) return { x: PANEL.front, z, on: z >= PANEL.screenBottom ? "screen" : "bezel", dist: k };
  }
  const k = -z0 / dz;
  return { x: x0 + dx * k, z: 0, on: "desk", dist: k };
}

// Everything the figure shows for one tilt.
export function beamOf(tilt) {
  const exit = exitOf(tilt);
  const rear = OPTIC.rear + tilt;
  const peak = OPTIC.peak + tilt;
  const front = OPTIC.front + tilt;
  const rearLand = landOf(exit, rear);
  const peakLand = landOf(exit, peak);
  const frontLand = landOf(exit, front);
  const deskX = (deg) => exit[0] + exit[1] * Math.tan(deg * RAD);
  const poolFrom = Math.max(PANEL.front, deskX(rear));
  const poolTo = Math.min(DESK.x1, deskX(front));
  const glareTop = rearLand.on === "screen" ? Math.min(PANEL.screenTop, rearLand.z) : 0;
  const glare = glareTop > PANEL.screenBottom ? glareTop - PANEL.screenBottom : 0;
  const halfAt = (dist) => BAR.lit + dist * OPTIC.spread;
  return { tilt, exit, rear, peak, front, rearLand, peakLand, frontLand, poolFrom, poolTo, peakX: deskX(peak), glareTop, glare, halfAt };
}

// The readout: one true sentence about where the light goes.
export function readoutOf(beam) {
  const sign = beam.tilt > 0.05 ? "+" : beam.tilt < -0.05 ? "−" : "";
  const tilt = `tilt ${sign}${Math.abs(beam.tilt).toFixed(0)}°`;
  if (beam.glare > 0) return `${tilt} · rear ray ${Math.abs(beam.rear).toFixed(0)}° behind vertical · ${Math.round((beam.glare * MM) / 10)} cm of screen lit`;
  return `${tilt} · desk lit ${Math.round((beam.poolFrom * MM) / 10)}–${Math.round((beam.poolTo * MM) / 10)} cm out · screen dark`;
}
