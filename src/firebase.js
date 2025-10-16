import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
export const isFirebaseConfigured = Boolean(apiKey)

let app = null
let auth = null
let db = null
let storage = null

if (isFirebaseConfigured) {
  const firebaseConfig = {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  // Persistência offline (IndexedDB). Trata múltiplas abas e navegadores sem suporte.
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      // failed-precondition: múltiplas abas abertas usando persistência
      // unimplemented: navegador não suporta IndexedDB
      console.warn('Firestore offline persistence não habilitada:', err?.code || err)
    })
  } catch (e) {
    console.warn('Falha ao habilitar persistência offline:', e?.code || e)
  }
  storage = getStorage(app)
}

export { app, auth, db, storage }