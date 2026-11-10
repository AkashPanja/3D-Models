# Fig 2 · Clamp hinge

An interactive isometric figure that explains how the light bar's clamp hinge fits any monitor.

- **The object:** the clamp seen from behind, sitting on a cut piece of a monitor's top edge. A bridge rests on the edge and its lip hooks over the front. At the back of the bridge is a pin hinge with alternating knuckles, carrying one rigid bell crank: a leg that hangs down and a short arm that points back with a 150 g steel counterweight.
- **The mechanism:** gravity pulls the counterweight down, which swings the leg forward until its rubber pad meets the back of the panel. Because the panel stops the crank before its centre of gravity can get under the pin, the centre of gravity stays behind the pin and gravity keeps pressing the pad on the back and the lip on the front with the same force. There is no spring, and the grip stays almost the same (0.54–0.59 N) on thin and thick monitors.
- **Interaction:** move the pointer across the figure (or use the arrow keys) to change the panel thickness from 6 to 42 mm. The readout shows the leg angle, how far the centre of gravity sits behind the pin, and the grip force, all from `model.mjs`.

## Build

```
node build.mjs          # light-bar-hinge.html (dark)
node build.mjs --light  # light-bar-hinge-light.html
```

The weight, arm length and leg length are illustrative values for a typical clamp of this kind, not a measured product.
