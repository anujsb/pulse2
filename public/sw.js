
  // public/sw.js
  const CACHE_NAME = 'together-forever-v1';
  const urlsToCache = [
    '/',
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png'
  ];
  
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(urlsToCache))
    );
  });
  
  self.addEventListener('fetch', (event) => {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request);
        }
      )
    );
  });
  
  // package.json dependencies needed:
  /*
  {
    "dependencies": {
      "next": "^14.0.0",
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "typescript": "^5.0.0",
      "@types/node": "^20.0.0",
      "@types/react": "^18.2.0",
      "@types/react-dom": "^18.2.0",
      "tailwindcss": "^3.3.0",
      "autoprefixer": "^10.4.0",
      "postcss": "^8.4.0",
      "lucide-react": "^0.263.1",
      "@radix-ui/react-slot": "^1.0.2",
      "@radix-ui/react-dialog": "^1.0.4",
      "@radix-ui/react-select": "^1.2.2",
      "class-variance-authority": "^0.7.0",
      "clsx": "^2.0.0",
      "tailwind-merge": "^1.14.0"
    }
  }
  */