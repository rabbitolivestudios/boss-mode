# Trailer sources

The 60-second trailer at `public/media/trailer.mp4` is made from these files.

- `index.html` and `cine.js`: the 30-second cartoon opening. `render(t)` draws one frame at time `t`, so frames are identical on every render. `art/` holds the stills it uses.
- `cine.mjs`: renders the cartoon to PNG frames with Playwright.
- `trailer3.mjs`: records the gameplay half from a dev build of the game (`npm run dev`), frame by frame.
- `score.mjs`: records the soundtrack from the game's own music and sound effects, following a cue sheet timed to the picture.
- `assemble.sh`: joins the frames, adds the soundtrack, and writes the master and the smaller web version.

The scripts still carry the scratch folder paths they were run from; change them before running again.
