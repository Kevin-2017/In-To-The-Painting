# Into the Painting 入画 追光

Walk into the paintings of Claude Monet. Four worlds from his life, with the time of day and the season as the mechanic. Stand at an easel, wait for the light he painted, and the view becomes your own painting.

One HTML page, raw WebGL2, no dependencies. Play it at https://intothepainting.com

## Build

```
npm run build     # dist/  for local play
npm run site      # site/  the same game as a web site, with link card tags for intothepainting.com
npm run build:08  # dist/  the earlier line, in which the parasol never tires
```

Node 18 or newer. There is nothing to install.

## Layout

| Path | What it holds |
|---|---|
| src/ | the game, joined in file name order into index.template.html by build.mjs |
| orig/final, orig/hi | reproductions of the originals shown beside the player's pictures  |
| launch/ | share picture, icons, manifest, pictures for posts |
| film/ | storyboard and tools of the trailer (frames and films are not kept here) |
| snd/ | recorded piano notes |
| tools/ | makes the note lists of the written pieces from MIDI files |
| test/ | headless play tests, written for the development container (Chrome and Playwright) |

## Credits

Each world plays a piano piece from the painter's own years, arranged for the game: it begins as a sketch of tune and bass,
fills in to the piece as written with the first painting caught there, and then other players join the piano one by one
(cellos, a flute, a harp, violins), each doubling what the piano plays. It is phrased as a pianist would play it rather
than in strict time.

| World | Piece |
|---|---|
| The Normandy Coast | Erik Satie, Gymnopédie No. 1 (1888) |
| Argenteuil | Claude Debussy, Première Arabesque (1891) |
| The Fields of Giverny | Claude Debussy, Clair de lune (1905) |
| The Water Lily Pond | Erik Satie, Gymnopédie No. 3 (1888) |

The notes come from the public domain editions of the Mutopia Project (mutopiaproject.org), typeset by Evin Robertson (Satie) and
Keith OHara (Debussy). `tools/pieces.mjs` turns their MIDI output into `src/21_pieces.js`.

The piano is the Salamander Grand Piano V3 by Alexander Holm (a Yamaha C5), used under the Creative Commons Attribution 3.0
license (https://creativecommons.org/licenses/by/3.0/). The notes in `snd/` were taken from the copies in the Tone.js audio
repository (twenty four notes a minor third apart), cut to between four and eight seconds and converted to mono.

The cellos, the flute, the harp and the violins are from the Versilian Studios Chamber Orchestra 2, Community Edition
(github.com/sgossner/VSCO-2-CE), which its makers gave to the public domain (CC0 1.0). The notes used were cut and converted to mono.

## 中文

入画 追光，走进莫奈的画里。四个世界，时间和季节是玩法，在画架前等到他落笔的那一刻的光，眼前的风景就成为你的画。

本地试玩运行 `npm run build`，然后打开 dist/index.html。
