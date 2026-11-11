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
const html = (await readFile('src/view/view.html', 'utf8')).replace('<script>/*__VIEW_JS__*/</script>', () => `<script>${js}</script>`);
await writeFile('dist/view.html', html);
console.log(`built dist/ (view.html ${(html.length / 1024).toFixed(0)} KB)`);
