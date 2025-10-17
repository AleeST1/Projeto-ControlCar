// Firebase Messaging Service Worker (compat for background handling)
(() => {
  const params = new URLSearchParams(self.location.search || '')
  const apiKey = params.get('apiKey')
  const authDomain = params.get('authDomain')
  const projectId = params.get('projectId')
  const messagingSenderId = params.get('messagingSenderId')
  const appId = params.get('appId')

  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js')
  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js')

  firebase.initializeApp({ apiKey, authDomain, projectId, messagingSenderId, appId })
  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    const title = payload?.notification?.title || 'Manutenção do veículo'
    const url = payload?.data?.url || payload?.fcmOptions?.link || '/maintenances'
    const options = {
      body: payload?.notification?.body || 'Você tem uma manutenção pendente.',
      icon: '/icons/controlcar-192.png',
      badge: '/icons/controlcar-192.png', // Android badge
      data: { url },
    }
    self.registration.showNotification(title, options)
  })

  self.addEventListener('install', (event) => {
    self.skipWaiting()
  })

  self.addEventListener('activate', (event) => {
    self.clients.claim()
  })

  self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const url = event.notification?.data?.url || '/maintenances'
    event.waitUntil((async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const absolute = new URL(url, self.location.origin).href
      for (const client of allClients) {
        if (client.url === absolute && 'focus' in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })())
  })
})()