// The clamp's spring hinge, in millimetres. Pure: no imports, so the page inlines it.
// x points from the monitor's back (−) to its screen (+, the screen face is x = 0),
// z is up with the monitor's top edge at z = 0, and y runs along the edge.

export const HINGE = { x: -52, z: 2, r: 4.2 };
export const LEG = { len: 56, thick: 3, half: 9 };
export const PAD = { len: 10, thick: 2.5, half: 8 };
// Torsion spring: unloaded at 64° from vertical, 2.2 N·mm per degree of wind.
export const SPRING = { free: 64, rate: 2.2 };
export const THICK = { min: 6, max: 42, rest: 22 };

const RAD = Math.PI / 180;
const REACH = LEG.thick / 2 + PAD.thick;

// The leg's tip, where the pad's face meets the panel, for a leg angle phi.
export function tipOf(phi) {
  const t = phi * RAD;
  return [HINGE.x + LEG.len * Math.sin(t) + REACH * Math.cos(t), HINGE.z - LEG.len * Math.cos(t) + REACH * Math.sin(t)];
}

// The spring swings the leg forward until the pad meets the back of a panel `thick` mm deep.
export function poseOf(thick) {
  let lo = 0;
  let hi = SPRING.free;
  if (tipOf(hi)[0] <= -thick) return { thick, phi: hi, contact: false, torque: 0, grip: 0, tip: tipOf(hi) };
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (tipOf(mid)[0] < -thick) lo = mid; else hi = mid;
  }
  const phi = (lo + hi) / 2;
  const tip = tipOf(phi);
  const torque = SPRING.rate * (SPRING.free - phi);
  // The pad pushes on the panel horizontally; its lever arm about the pin is the drop to the pad.
  const grip = torque / (HINGE.z - tip[1]);
  return { thick, phi, contact: true, torque, grip, tip };
}

export function readoutOf(pose) {
  const base = `panel ${pose.thick.toFixed(0)} mm · leg ${pose.phi.toFixed(0)}°`;
  if (!pose.contact) return `${base} · pad clear of the panel`;
  return `${base} · spring ${pose.torque.toFixed(0)} N·mm · grip ${pose.grip.toFixed(1)} N each side`;
}
