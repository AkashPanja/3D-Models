// The clamp's counterweighted hinge, in millimetres and newtons. Pure: no imports,
// so the page inlines it. x points from the monitor's back (−) to its screen (+, the
// screen face is x = 0), z is up with the monitor's top edge at z = 0, and y runs
// along the edge.
//
// The leg and a counterweight arm form one rigid bell crank on the hinge pin: the
// leg hangs down, the arm points back. Gravity pulls the weight down, which swings
// the leg forward until its pad meets the back of the panel.

export const HINGE = { x: -52, z: 2, r: 4.2 };
export const LEG = { len: 56, thick: 3, half: 9, weight: 0.15 }; // 15 g plate, centre of mass at mid-length
export const PAD = { len: 10, thick: 2.5, half: 8 };
// The counterweight: a 150 g steel block on an arm, its centre 22 mm behind the pin.
export const WEIGHT = { arm: 22, weight: 1.5, w: 12, h: 9, half: 12 };
export const THICK = { min: 6, max: 42, rest: 22 };

const RAD = Math.PI / 180;
const REACH = LEG.thick / 2 + PAD.thick;

// The leg's tip, where the pad's face meets the panel, for a leg angle phi from vertical.
export function tipOf(phi) {
  const t = phi * RAD;
  return [HINGE.x + LEG.len * Math.sin(t) + REACH * Math.cos(t), HINGE.z - LEG.len * Math.cos(t) + REACH * Math.sin(t)];
}

// Where the counterweight's centre sits: the arm points back (−x) when the leg hangs straight.
export function weightAt(phi) {
  const t = phi * RAD;
  return [HINGE.x - WEIGHT.arm * Math.cos(t), HINGE.z - WEIGHT.arm * Math.sin(t)];
}

// Gravity's torque about the pin, positive when it swings the leg toward the panel:
// the weight's moment minus the leg's own, which pulls it back toward vertical.
export function torqueOf(phi) {
  const t = phi * RAD;
  return WEIGHT.weight * WEIGHT.arm * Math.cos(t) - LEG.weight * (LEG.len / 2) * Math.sin(t);
}

// The angle the crank would hang at with nothing in the way.
export const FREE = Math.atan2(WEIGHT.weight * WEIGHT.arm, LEG.weight * (LEG.len / 2)) / RAD;

// The centre of gravity of the whole crank, relative to the pin.
export function centreOf(phi) {
  const t = phi * RAD;
  const w = weightAt(phi);
  const legMid = [HINGE.x + (LEG.len / 2) * Math.sin(t), HINGE.z - (LEG.len / 2) * Math.cos(t)];
  const total = WEIGHT.weight + LEG.weight;
  return [(w[0] * WEIGHT.weight + legMid[0] * LEG.weight) / total, (w[1] * WEIGHT.weight + legMid[1] * LEG.weight) / total];
}

// Gravity swings the leg forward until the pad meets the back of a panel `thick` mm deep.
export function poseOf(thick) {
  let lo = 0;
  let hi = FREE;
  if (tipOf(hi)[0] <= -thick) return { thick, phi: hi, contact: false, torque: 0, grip: 0, tip: tipOf(hi), behind: 0 };
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (tipOf(mid)[0] < -thick) lo = mid; else hi = mid;
  }
  const phi = (lo + hi) / 2;
  const tip = tipOf(phi);
  const torque = torqueOf(phi);
  // The pad pushes on the panel horizontally; its lever arm about the pin is the drop to the pad.
  const grip = torque / (HINGE.z - tip[1]);
  // How far the crank's centre of gravity sits behind the pin: that offset is what makes the torque.
  const behind = HINGE.x - centreOf(phi)[0];
  return { thick, phi, contact: true, torque, grip, tip, behind };
}

export function readoutOf(pose) {
  const base = `panel ${pose.thick.toFixed(0)} mm · leg ${pose.phi.toFixed(0)}°`;
  if (!pose.contact) return `${base} · pad clear of the panel`;
  return `${base} · CG ${pose.behind.toFixed(0)} mm behind pin · grip ${pose.grip.toFixed(2)} N`;
}
