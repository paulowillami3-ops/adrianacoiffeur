import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Build-time validation for critical variables
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (mode === 'production') {
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      throw new Error('VITE_SUPABASE_URL is missing or placeholder! Build stopped.');
    }
    if (!supabaseAnonKey || supabaseAnonKey === 'placeholder') {
      throw new Error('VITE_SUPABASE_ANON_KEY is missing or placeholder! Build stopped.');
    }
  }

  console.log('Build Context:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseAnonKey, mode });

  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      allowedHosts: ['farrah-polydomous-tomboyishly.ngrok-free.dev'],
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Adriana Coiffeur',
          short_name: 'Adriana Coiffeur',
          description: 'Agende seu horário com estilo.',
          theme_color: '#343863',
          background_color: '#F7F3F0',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
