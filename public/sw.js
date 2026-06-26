self.addEventListener('push', function(event) {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    tag: data.tag || 'dsm-notification',
    requireInteraction: false,
    data: data.data || {}
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'DSM by EveryDriver', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/home';
  event.waitUntil(
    clients.openWindow(url)
  );
});

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});
