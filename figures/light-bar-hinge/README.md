# Fig 2 · Clamp hinge

An interactive isometric figure that explains how the light bar's clamp hinge fits any monitor.

- **The object:** the clamp seen from behind, sitting on a cut piece of a monitor's top edge. A bridge rests on the edge and its lip hooks over the front. At the back of the bridge is a pin hinge with alternating knuckles, and the leg hangs from it.
- **The mechanism:** a torsion spring wound around the pin has one arm on the bridge and one on the leg. It swings the leg forward until the leg's rubber pad meets the back of the panel. A thicker panel stops the leg earlier, so the spring is wound further and presses harder. The lip presses the front with the same force.
- **Interaction:** move the pointer across the figure (or use the arrow keys) to change the panel thickness from 6 to 42 mm. The readout shows the leg angle, spring torque and grip force from `model.mjs`.

## Build

```
node build.mjs          # light-bar-hinge.html (dark)
node build.mjs --light  # light-bar-hinge-light.html
```

The spring rate, free angle and leg length are illustrative values for a typical clamp of this kind, not a measured product.
