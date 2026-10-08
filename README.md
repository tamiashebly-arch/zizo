# Technical Affairs — cinematic corporate film

A ~84 s photoreal-style 3D architectural film, built as a deterministic Three.js scene:
every frame is a pure function of time `t`, so one continuous camera journey uses the **same building model**
in all eight scenes (exterior → dissolving cutaway → systems → risks → impact → work order → Technical Affairs → return).

- `index.html` – player (open via any static server, e.g. `npx http-server .`; scrub or play).
- `src/building.js` – the single building (6 floors + roof plant), all systems, indicators.
- `src/site.js` – plaza, palms, sky/sun, walking staff.
- `src/film.js` – timeline: camera, scenes, overlays, work-order pathway, Technical Affairs metaphor.
- `tools/render.mjs` – headless frame renderer; `ffmpeg` assembles `output/technical_affairs_film.mp4`.

Rendering: `node tools/render.mjs frames 1920 1080 24 0 2016` then
`ffmpeg -framerate 24 -i frames/f%05d.jpg -c:v libx264 -crf 16 -pix_fmt yuv420p output/technical_affairs_film.mp4`.

Post-production: the final ~4 s keeps the upper third of the frame as clean sky for the official Ministry logo and the
Arabic closing titles (open the player with `?titles` to preview the text placeholder is NOT included — logo/titles are left to post).
The facade fascia above the entrance is intentionally blank for the logo. No logos are generated.
