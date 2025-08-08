import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './', // Use relative paths for assets
  root: 'src', // Set the root directory to src
  publicDir: '../public', // Point to the public directory in project root
  plugins: [
    viteSingleFile()
  ],
  build: {
    outDir: '../dist-singlefile', // Output to dist-singlefile directory in project root
    assetsInlineLimit: 1000000, // Inline all assets by increasing this limit
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    emptyOutDir: true
  },
  server: {
    host: true,
    port: 3000
  }
});