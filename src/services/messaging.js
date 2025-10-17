import { app, isFirebaseConfigured } from '../firebase'
import { getMessaging, getToken, deleteToken, onMessage } from 'firebase/messaging'
import { registerFcmToken, removeFcmToken } from './firestore'

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
const FCM_SW_SCOPE = '/firebase-cloud-messaging-push-scope'

async function waitForActive(reg, timeoutMs = 8000) {
  if (reg?.active) return reg
  const worker = reg.installing || reg.waiting
  if (worker) {
    await new Promise((resolve) => {
      const onChange = () => {
        if (worker.state === 'activated') resolve()
      }
      worker.addEventListener('statechange', onChange)
      if (worker.state === 'activated') resolve()
    })
  } else {
    await new Promise((resolve) => {
      const start = Date.now()
      const tick = () => {
        if (reg.active || Date.now() - start > timeoutMs) return resolve()
        setTimeout(tick, 150)
      }
      tick()
    })
  }
  return reg
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker não suportado')
  const params = new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  })

  const registrations = await navigator.serviceWorker.getRegistrations()
  let fcmReg = registrations.find((r) => (r?.scope || '').endsWith(`${FCM_SW_SCOPE}/`))

  if (!fcmReg) {
    fcmReg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`, { scope: FCM_SW_SCOPE })
  }

  await fcmReg.update().catch(() => {})
  await waitForActive(fcmReg)
  return fcmReg
}

export async function enableNotifications(userId) {
  if (!isFirebaseConfigured) throw new Error('Firebase não configurado')
  if (!('Notification' in window)) throw new Error('Notificações não suportadas neste navegador')
  if (Notification.permission === 'denied') throw new Error('Permissão de notificações negada')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permissão de notificações não concedida')

  const swReg = await registerServiceWorker()
  const messaging = getMessaging(app)
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg })
  if (!token) throw new Error('Não foi possível obter o token FCM')

  localStorage.setItem('fcmToken', token)
  if (userId && userId !== 'offline') {
    await registerFcmToken(userId, token)
  }
  return token
}

export async function disableNotifications() {
  try {
    // Mesmo sem Firebase configurado, limpamos dados locais
    const token = localStorage.getItem('fcmToken')
    if (token) {
      await removeFcmToken(token).catch(() => {})
    }

    if (isFirebaseConfigured) {
      try {
        const messaging = getMessaging(app)
        await deleteToken(messaging).catch(() => {})
      } catch (e) {
        // Ignora erros ao deletar token para garantir desligamento
        console.warn('deleteToken falhou, prosseguindo:', e)
      }
    }

    localStorage.removeItem('fcmToken')

    // Tenta cancelar inscrição no Push e desregistrar o SW
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) await sub.unsubscribe().catch(() => {})
        await reg.unregister().catch(() => {})
      }
    } catch (e) {
      console.warn('Falha ao desregistrar Service Worker:', e)
    }

    return true
  } catch (err) {
    console.warn('Falha ao desativar notificações:', err)
    return false
  }
}

export function getNotificationStatus() {
  const hasToken = !!localStorage.getItem('fcmToken')
  const permission = typeof Notification !== 'undefined' ? Notification.permission : 'default'
  return { permission, hasToken }
}

export function listenForegroundMessages(handler) {
  if (!isFirebaseConfigured) return () => {}
  const messaging = getMessaging(app)
  const unsub = onMessage(messaging, handler)
  return unsub
}