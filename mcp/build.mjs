// Builds the Node entry points and the single-file in-chat view (dist/view.html).
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';

await mkdir('dist', { recursive: true });

await build({
  entryPoints: ['src/mcp.ts', 'src/cli.ts', 'src/http.ts', 'src/connector.ts'],
  bundle: true, platform: 'node', format: 'esm', target: 'node20',
  packages: 'external', outdir: 'dist', splitting: true, chunkNames: 'chunks/[name]-[hash]',
  banner: { js: '#!/usr/bin/env node' },
});
for (const f of ['mcp', 'cli', 'http']) await chmod(`dist/${f}.js`, 0o755);

const view = await build({
  entryPoints: ['src/view/view.ts'],
  bundle: true, platform: 'browser', format: 'iife', target: 'es2020', minify: true, write: false,
  define: { 'import.meta.env': '{}' },
});
const js = view.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
// The site's typefaces (SIL OFL 1.1, licenses in src/view/fonts), inlined so the panel needs no font requests.
const FONTS = [['Aujournuit', 'Aujournuit-VariableVF', 400], ['Apfel Grotezk', 'ApfelGrotezk-Regular', 400], ['Apfel Grotezk', 'ApfelGrotezk-Mittel', 500], ['Apfel Grotezk', 'ApfelGrotezk-Fett', 700], ['Departure Mono', 'DepartureMono-Regular', 400]];
const fontCss = (await Promise.all(FONTS.map(async ([family, file, weight]) => {
  const b64 = (await readFile(new URL(`./src/view/fonts/${file}.woff2`, import.meta.url))).toString('base64');
  return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${b64}) format("woff2");font-weight:${weight};font-display:swap}`;
}))).join('');
const html = (await readFile('src/view/view.html', 'utf8')).replace('<style>/*__FONTS__*/</style>', () => `<style>${fontCss}</style>`).replace('<script>/*__VIEW_JS__*/</script>', () => `<script>${js}</script>`);
await writeFile('dist/view.html', html);
console.log(`built dist/ (view.html ${(html.length / 1024).toFixed(0)} KB)`);
