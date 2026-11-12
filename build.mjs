import fs from 'fs';
const dir = new URL('.', import.meta.url).pathname;
const srcDir = dir + (process.env.SRC || 'src') + '/'; // SRC builds from another source folder (a working copy)
const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();
// WORLD_DIR takes the four world files from another folder (a saved copy), OUT writes somewhere other than dist
const wdir = process.env.WORLD_DIR ? dir + process.env.WORLD_DIR + '/' : null, outDir = dir + (process.env.OUT || 'dist') + '/';
// STABLE names a folder of saved copies: any source file that also exists there is taken from there (files other people are working on)
// MINE names the files the builder is working on itself (comma separated): those always come from the source folder
const sdir = process.env.STABLE ? dir + process.env.STABLE + '/' : null, mine = (process.env.MINE || '').split(',').filter(Boolean);
const pick = (f) => (sdir && !mine.includes(f) && fs.existsSync(sdir + f) ? sdir : wdir && /^1[1-4]_/.test(f) ? wdir : srcDir) + f;
const js = files.map((f) => '// ===== ' + f + ' =====\n' + fs.readFileSync(pick(f), 'utf8')).join('\n');
const tpl = fs.readFileSync(dir + 'index.template.html', 'utf8');
// SITE names the address the page will live at (https://example.com/): then the tags that link cards read are written with it.
// Without it they are left out, as in the copy that runs inside Claude
const site = process.env.SITE || '';
const head = site ? tpl.replace(/<!--\/?SITE-->\n?/g, '').split('https://DOMAIN/').join(site.endsWith('/') ? site : site + '/') : tpl.replace(/<!--SITE-->[\s\S]*?<!--\/SITE-->\n?/, '');
// ENERGY=1 builds the 0.9 line, in which the parasol has only so many beats in the air and the paintings bring more
const energy = !!process.env.ENERGY;
const out = head.replace('/*__SCRIPT__*/', () => "(function () {\n'use strict';\nconst ENERGY = " + energy + ';\n' + js + '\n})();');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outDir + 'index.html', out);
// the reproductions of the originals travel beside the page
fs.mkdirSync(outDir + 'img', { recursive: true });
let n = 0;
// (a sharper copy in orig/hi takes the place of the one in orig/final)
if (fs.existsSync(dir + 'orig/final')) for (const f of fs.readdirSync(dir + 'orig/final')) if (f.endsWith('.jpg')) { fs.copyFileSync(dir + (fs.existsSync(dir + 'orig/hi/' + f) ? 'orig/hi/' : 'orig/final/') + f, outDir + 'img/' + f); n++; }
console.log('copied', n, 'originals');
// a build for the web site (SITE is set) also carries the share picture, the icons and the manifest that its page names
if (site) for (const f of ['og-en.jpg', 'og.jpg', 'favicon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest']) if (fs.existsSync(dir + 'launch/' + f)) fs.copyFileSync(dir + 'launch/' + f, outDir + f);
console.log('built', files.length, 'files,', (out.length / 1024).toFixed(1), 'KiB');
