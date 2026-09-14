self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data ? event.data.text() : '' }; }
  const title = String(payload.title || 'EDUNIXO');
  const options = {
    body: String(payload.body || 'You have a new school notification.'),
    tag: String(payload.tag || `edunixo-${Date.now()}`),
    data: { url: String(payload.url || '/') },
    renotify: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification && event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil((async()=>{
    const windows = await clients.matchAll({ type:'window', includeUncontrolled:true });
    for (const client of windows) {
      if ('focus' in client) { if ('navigate' in client) await client.navigate(target); return client.focus(); }
    }
    return clients.openWindow ? clients.openWindow(target) : undefined;
  })());
});
