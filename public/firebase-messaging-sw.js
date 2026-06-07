// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// We fetch the real firebase config from the same origin statically
fetch('/firebase-applet-config.json')
  .then(response => response.json())
  .then(config => {
    firebase.initializeApp(config);
    const messaging = firebase.messaging();

    // Background messaging handler
    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      
      const notificationTitle = payload.notification?.title || payload.data?.title || 'DavidSTORE';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'Mise à jour disponible !',
        icon: payload.notification?.image || payload.data?.image || '/icon.png',
        badge: '/icon.png',
        data: payload.data || {}
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  })
  .catch(err => {
    console.error('Error auto-initializing Firebase inside Service Worker:', err);
  });

// Also register standard push handler as an absolute fallback for generic backend push events
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    console.log('[firebase-messaging-sw.js] Fallback push raw data:', data);

    const title = data.notification?.title || data.title || 'DavidSTORE';
    const options = {
      body: data.notification?.body || data.body || '',
      icon: data.notification?.icon || data.icon || '/icon.png',
      badge: '/icon.png',
      data: data.data || data
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (e) {
    const textData = event.data.text();
    console.log('[firebase-messaging-sw.js] Fallback plain text push:', textData);
    
    event.waitUntil(
      self.registration.showNotification('DavidSTORE', {
        body: textData,
        icon: '/icon.png',
        badge: '/icon.png'
      })
    );
  }
});

// Handle notification click to open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
            break;
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
