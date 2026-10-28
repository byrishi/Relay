import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      'geist/font/sans': path.resolve(__dirname, 'src/lib/geist/sans.ts'),
      'geist/font/mono': path.resolve(__dirname, 'src/lib/geist/mono.ts'),
      'geist/font/pixel': path.resolve(__dirname, 'src/lib/geist/pixel.ts'),
    },
  },
});
