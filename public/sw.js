// Authenticated pages and private snapshots are deliberately never cached by this worker.
self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

function safeDestination(value) {
  try {
    const url = new URL(typeof value === "string" ? value : "/events", self.location.origin);
    if (
      url.origin === self.location.origin &&
      /^\/(events(?:\/[a-f0-9-]+(?:\/alert)?)?|settings)\/?$/i.test(url.pathname)
    ) {
      return url.href;
    }
  } catch {}
  return `${self.location.origin}/events`;
}

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    const data = event.data?.json();
    if (data && typeof data === "object") payload = data;
  } catch {}
  const title = typeof payload.title === "string" ? payload.title.slice(0, 120) : "Halo";
  const body =
    typeof payload.body === "string"
      ? payload.body.slice(0, 500)
      : "Шинэ мэдэгдлээ нээж шалгана уу.";
  const tag = typeof payload.tag === "string" ? payload.tag.slice(0, 100) : "halo-event";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: "/icons/halo-192.png",
      badge: "/icons/halo-badge-96.png",
      requireInteraction: payload.severity === "critical",
      data: { url: safeDestination(payload.url) },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = safeDestination(event.notification.data?.url);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          if (client.url !== destination) await client.navigate(destination);
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow(destination);
    })(),
  );
});
