# Into the Painting 入画 追光

Walk into the paintings of Claude Monet. Four worlds from his life, with the time of day and the season as the mechanic. Stand at an easel, wait for the light he painted, and the view becomes your own painting.

One HTML page, raw WebGL2, no dependencies. The site will live at https://intothepainting.com

## Build

```
npm run build   # dist/  for local play, and the copy that runs inside Claude
npm run site    # site/  the web site, with link card tags for intothepainting.com
```

Node 18 or newer. There is nothing to install.

## Deploy

Cloudflare Pages is connected to this repository. Every push to `main` runs `npm run site` and publishes `site/`.

| Setting in Cloudflare Pages | Value |
|---|---|
| Production branch | main |
| Build command | npm run site |
| Build output directory | site |

## Layout

| Path | What it holds |
|---|---|
| src/ | the game, joined in file name order into index.template.html by build.mjs |
| orig/final, orig/hi | reproductions of the originals shown beside the player's pictures (sources in DESIGN.md) |
| launch/ | share picture, icons, manifest, pictures for posts, the launch guide |
| film/ | storyboard and tools of the trailer (frames and films are not kept here) |
| test/ | headless play tests, written for the development container (Chrome and Playwright) |
| DESIGN.md | design document, in Chinese |
| NOTES.md | working notes of the development sessions |

## 中文

入画 追光，走进莫奈的画里。四个世界，时间和季节是玩法，在画架前等到他落笔的那一刻的光，眼前的风景就成为你的画。

改完代码推到 `main`，Cloudflare Pages 会自动构建并发布到 intothepainting.com。本地试玩运行 `npm run build`，然后打开 dist/index.html。
