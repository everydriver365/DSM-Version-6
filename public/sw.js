self.addEventListener('push', function(event) {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: '/__l5e/assets-v1/822269be-f3a7-47f7-9696-0d4e26d6be94/icon-192.png',
    badge: '/__l5e/assets-v1/822269be-f3a7-47f7-9696-0d4e26d6be94/icon-192.png',
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
