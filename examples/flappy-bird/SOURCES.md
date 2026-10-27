# Asset provenance

Downloaded 2026-10-21 from **Flappy Bird Style Sprites**, by **Ian Peter**:
https://opengameart.org/content/flappy-bird-style-sprites

The author's listing identifies the assets as **CC0**. The CC0 1.0 text is
preserved in `assets/CC0-1.0.txt`, obtained from:
https://creativecommons.org/publicdomain/zero/1.0/legalcode.txt

| Local filename | Original download |
| --- | --- |
| `assets/bird-up.png` | https://opengameart.org/sites/default/files/sprite_0_11.png |
| `assets/bird-down.png` | https://opengameart.org/sites/default/files/sprite_1_3.png |
| `assets/pipe.png` | https://opengameart.org/sites/default/files/pipe_2.png |
| `assets/pipe-top.png` | https://opengameart.org/sites/default/files/pipe2.png |

Original PNG bytes are retained. Costumes are scaled and rotated at runtime.
The portrait pipe costumes wrap the original PNGs in SVG, retaining the cap's
proportions and extending the shaft to cover the taller stage.
The sky, ground and instruction cards are simple SVG artwork authored for this
example in `build.cjs`; no additional third-party visual assets or fonts are
bundled. The title is **Little Wings**; this project does not use the original
Flappy Bird logo or audio. Ian Peter is credited here voluntarily.

Generator and game logic follow the repository's GPL-3.0 license. The downloaded
PNG artwork retains its separately recorded CC0 provenance.
