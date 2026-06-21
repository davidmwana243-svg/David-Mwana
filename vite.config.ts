import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate', // Met à jour l'application automatiquement quand le code change
        injectRegister: 'inline',   // Injecte directement le script de service worker dans le build html
        devOptions: {
          enabled: false             // Désactivé en dev pour éviter le cache stagnant et les ChunkLoadErrors sous AI Studio
        },
        manifest: {
          name: 'DavidSTORE',       // Nom complet de l'application
          short_name: 'DavidStore', // Nom abrégé sous l'icône de l'écran d'accueil
          description: 'Une superbe application de commerce électronique progressive DavidSTORE !',
          start_url: '/',
          display: 'standalone',              // S'ouvre dans sa propre fenêtre, sans l'interface du navigateur
          background_color: '#ffffff',        // Couleur de fond pendant le chargement (Splash-screen)
          theme_color: '#2563eb',             // Couleur de la barre d'état sur mobile
          icons: [
            {
              src: '/icon.png',               // Chemin vers votre logo dans le dossier 'public/'
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
