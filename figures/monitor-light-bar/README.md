# Fig 1 · Monitor light bar

An interactive isometric figure that explains how a monitor light bar avoids screen glare.

- **The object:** a monitor on a desk with a light bar clamped to its top edge (a front lip, a bridge, a hinged counterweight leg, and a collar the bar turns in).
- **The mechanism:** the LED board inside the bar is aimed down and forward, and a curved reflector behind it turns backward rays forward. The beam therefore runs from 3° to 42° in front of vertical: it lights the desk and keyboard and never reaches the screen.
- **Interaction:** move the pointer across the figure (or use the arrow keys) to tilt the bar. Past 3° backward, the rear edge of the beam crosses the screen plane and lights the glass. The readout gives the true numbers from `model.mjs`.
- **Detail view:** the circle at top left shows the bar's cut end at 4×, against true vertical.

## Build

```
node build.mjs          # monitor-light-bar.html (dark)
node build.mjs --light  # monitor-light-bar-light.html
```

Open either HTML file in a browser. Everything is inlined, so no server is needed.

## Files

- `model.mjs`: the optics (beam angles, where each ray lands, glare), in world units of 4 mm
- `live-parts.mjs`: the parts that move with the tilt (bar, lens lip, cut end, light, detail view)
- `build.mjs`: the static drawing, the card and the live script
- `../kit/`: the drawing kit from the [anatomy](https://github.com/wheresryan22/anatomy) skill (MIT, see `LICENSE-anatomy`)

The optic angles describe a generic asymmetric screen bar, not a measured product.
