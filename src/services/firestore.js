import { db } from '../firebase'
import { doc, setDoc, deleteDoc, getDocs, query, where, collection, updateDoc, onSnapshot } from 'firebase/firestore'
import { getDoc, arrayUnion, arrayRemove } from 'firebase/firestore'

export const isFirestoreEnabled = import.meta.env.VITE_USE_FIRESTORE === '1'

// Código de convite curto (Base32 sem caracteres confusos)
const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function randomIndex(max) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(1)
    crypto.getRandomValues(arr)
    return arr[0] % max
  }
  return Math.floor(Math.random() * max)
}
function generateInviteCode(length = 10) {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += INVITE_ALPHABET[randomIndex(INVITE_ALPHABET.length)]
  }
  return code
}
async function ensureUniqueInviteCode(length = 10, maxAttempts = 6) {
  // Verifica unicidade usando o índice público de convites (familyInvites),
  // que possui leitura liberada para usuários autenticados pelas regras.
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateInviteCode(length)
    const snap = await getDocs(query(collection(db, 'familyInvites'), where('code', '==', code)))
    if (snap.empty) return code
  }
  // Em caso extremo, aumenta o tamanho para reduzir colisões
  const fallback = generateInviteCode(length + 1)
  const snap = await getDocs(query(collection(db, 'familyInvites'), where('code', '==', fallback)))
  return snap.empty ? fallback : `${fallback}${generateInviteCode(1)}`
}

// Novo: carregar dados por escopo (usuário ou família)
export async function loadAllForScope({ userId, familyId }) {
  const results = { vehicles: [], fuelings: [], reminders: [], trips: [], documents: [], fines: [] }
  const collections = ['vehicles', 'fuelings', 'trips', 'documents', 'fines']
  const filter = familyId ? where('familyId', '==', familyId) : where('userId', '==', userId)

  for (const col of collections) {
    const snap = await getDocs(query(collection(db, col), filter))
    results[col] = snap.docs.map((d) => ({ ...d.data(), [`${col.slice(0, -1)}Id`]: d.id }))
  }
  const maintSnap = await getDocs(query(collection(db, 'maintenances'), filter))
  results.reminders = maintSnap.docs.map((d) => ({ ...d.data(), reminderId: d.id }))
  return results
}

export async function upsertVehicle(userId, vehicle) {
  const id = vehicle.vehicleId
  await setDoc(doc(db, 'vehicles', id), { ...vehicle, userId })
}

export async function removeVehicleFirestore(vehicleId) {
  await deleteDoc(doc(db, 'vehicles', vehicleId))
}

export async function upsertFueling(userId, fueling) {
  const id = fueling.fuelingId
  await setDoc(doc(db, 'fuelings', id), { ...fueling, userId })
}

export async function removeFuelingFirestore(fuelingId) {
  await deleteDoc(doc(db, 'fuelings', fuelingId))
}

export async function upsertReminder(userId, reminder) {
  const id = reminder.reminderId
  await setDoc(doc(db, 'maintenances', id), { ...reminder, userId })
}

export async function removeReminderFirestore(reminderId) {
  await deleteDoc(doc(db, 'maintenances', reminderId))
}

export async function updateVehicleFirestore(vehicleId, updates) {
  await updateDoc(doc(db, 'vehicles', vehicleId), updates)
}

export async function updateFuelingFirestore(fuelingId, updates) {
  await updateDoc(doc(db, 'fuelings', fuelingId), updates)
}

export async function removeVehicleCascade(userId, vehicleId) {
  // Remove veículo e registros relacionados (abastecimentos e lembretes)
  await deleteDoc(doc(db, 'vehicles', vehicleId))
  const fuelsSnap = await getDocs(query(collection(db, 'fuelings'), where('vehicleId', '==', vehicleId)))
  for (const d of fuelsSnap.docs) {
    const data = d.data()
    if (!userId || data.userId === userId) {
      await deleteDoc(doc(db, 'fuelings', d.id))
    }
  }
  const remsSnap = await getDocs(query(collection(db, 'maintenances'), where('vehicleId', '==', vehicleId)))
  for (const d of remsSnap.docs) {
    const data = d.data()
    if (!userId || data.userId === userId) {
      await deleteDoc(doc(db, 'maintenances', d.id))
    }
  }
  const docsSnap = await getDocs(query(collection(db, 'documents'), where('vehicleId', '==', vehicleId)))
  for (const d of docsSnap.docs) {
    const data = d.data()
    if (!userId || data.userId === userId) {
      await deleteDoc(doc(db, 'documents', d.id))
    }
  }
  const finesSnap = await getDocs(query(collection(db, 'fines'), where('vehicleId', '==', vehicleId)))
  for (const d of finesSnap.docs) {
    const data = d.data()
    if (!userId || data.userId === userId) {
      await deleteDoc(doc(db, 'fines', d.id))
    }
  }
}

export async function updateReminderFirestore(reminderId, updates) {
  await updateDoc(doc(db, 'maintenances', reminderId), updates)
}

// Novo: assinar coleções por escopo (usuário ou família)
export function subscribeScopeCollections({ userId, familyId }, { onVehicles, onFuelings, onReminders, onTrips, onDocuments, onFines, onSync } = {}) {
  const filter = familyId ? where('familyId', '==', familyId) : where('userId', '==', userId)

  const unsubVehicles = onSnapshot(query(collection(db, 'vehicles'), filter), (snap) => {
    const items = snap.docs.map((d) => ({ ...d.data(), vehicleId: d.id }))
    if (onVehicles) onVehicles(items)
    if (onSync) onSync('vehicles')
  })

  const unsubFuelings = onSnapshot(query(collection(db, 'fuelings'), filter), (snap) => {
    const items = snap.docs.map((d) => {
      const data = d.data()
      const pricePerLiter = Number(((data.totalCost ?? 0) / ((data.liters ?? 0) || 1)).toFixed(2))
      return { ...data, fuelingId: d.id, pricePerLiter }
    })
    if (onFuelings) onFuelings(items)
    if (onSync) onSync('fuelings')
  })

  const unsubReminders = onSnapshot(query(collection(db, 'maintenances'), filter), (snap) => {
    const items = snap.docs.map((d) => ({ ...d.data(), reminderId: d.id }))
    if (onReminders) onReminders(items)
    if (onSync) onSync('reminders')
  })

  const unsubTrips = onSnapshot(query(collection(db, 'trips'), filter), (snap) => {
    const items = snap.docs.map((d) => ({ ...d.data(), tripId: d.id }))
    if (onTrips) onTrips(items)
    if (onSync) onSync('trips')
  })

  const unsubDocuments = onSnapshot(query(collection(db, 'documents'), filter), (snap) => {
    const items = snap.docs.map((d) => ({ ...d.data(), documentId: d.id }))
    if (onDocuments) onDocuments(items)
    if (onSync) onSync('documents')
  })

  const unsubFines = onSnapshot(query(collection(db, 'fines'), filter), (snap) => {
    const items = snap.docs.map((d) => ({ ...d.data(), fineId: d.id }))
    if (onFines) onFines(items)
    if (onSync) onSync('fines')
  })

  return () => {
    unsubVehicles()
    unsubFuelings()
    unsubReminders()
    unsubTrips()
    unsubDocuments()
    unsubFines()
  }
}

export async function upsertTrip(userId, trip) {
  const id = trip.tripId
  await setDoc(doc(db, 'trips', id), { ...trip, userId })
}

export async function removeTripFirestore(tripId) {
  await deleteDoc(doc(db, 'trips', tripId))
}

export async function updateTripFirestore(tripId, updates) {
  await updateDoc(doc(db, 'trips', tripId), updates)
}

// Documentos
export async function upsertDocument(userId, document) {
  const id = document.documentId
  await setDoc(doc(db, 'documents', id), { ...document, userId })
}

export async function removeDocumentFirestore(documentId) {
  await deleteDoc(doc(db, 'documents', documentId))
}

export async function updateDocumentFirestore(documentId, updates) {
  await updateDoc(doc(db, 'documents', documentId), updates)
}

// Multas
export async function upsertFine(userId, fine) {
  const id = fine.fineId
  await setDoc(doc(db, 'fines', id), { ...fine, userId })
}

export async function removeFineFirestore(fineId) {
  await deleteDoc(doc(db, 'fines', fineId))
}

export async function updateFineFirestore(fineId, updates) {
  await updateDoc(doc(db, 'fines', fineId), updates)
}

// FCM tokens
export async function registerFcmToken(userId, token) {
  await setDoc(doc(db, 'notificationTokens', token), { token, userId, createdAt: Date.now() })
}

export async function removeFcmToken(token) {
  await deleteDoc(doc(db, 'notificationTokens', token))
}

// Família: criar
export async function createFamily(ownerId, name) {
  const familyId = crypto.randomUUID()
  const inviteCode = await ensureUniqueInviteCode(7)
  await setDoc(doc(db, 'families', familyId), {
    familyId,
    name: name || 'Minha família',
    ownerId,
    memberIds: [ownerId],
    inviteCode,
    createdAt: Date.now(),
  })
  // Índice público de convite para resolução por código curto
  await setDoc(doc(db, 'familyInvites', inviteCode), {
    code: inviteCode,
    familyId,
    ownerId,
    createdAt: Date.now(),
  })
  return { familyId, name, inviteCode }
}

// Família: obter família do usuário (primeira encontrada)
export async function getUserFamily(userId) {
  const snap = await getDocs(query(collection(db, 'families'), where('memberIds', 'array-contains', userId)))
  const docSnap = snap.docs[0]
  return docSnap ? { ...docSnap.data(), familyId: docSnap.id } : null
}

// Família: entrar via código (familyId)
export async function joinFamily(codeOrId, userId) {
  const input = (codeOrId || '').trim().toUpperCase()
  let resolvedFamilyId = null
  let targetDocRef = null

  // Removido: entrada por ID direto (UUID). Exigir sempre código curto.
  if (input.includes('-') || input.length > 20) {
    resolvedFamilyId = input
    targetDocRef = doc(db, 'families', resolvedFamilyId)
  } else {
    // Resolve via índice público de convites
    const inviteSnap = await getDoc(doc(db, 'familyInvites', input.toUpperCase()))
    if (!inviteSnap.exists()) throw new Error('Código de convite inválido')
    resolvedFamilyId = inviteSnap.data().familyId
    targetDocRef = doc(db, 'families', resolvedFamilyId)
  }

  await updateDoc(targetDocRef, { memberIds: arrayUnion(userId) })
  const docSnap = await getDoc(targetDocRef)
  return docSnap.exists() ? { ...docSnap.data(), familyId: resolvedFamilyId } : null
}

// Família: sair
export async function leaveFamily(familyId, userId) {
  await updateDoc(doc(db, 'families', familyId), { memberIds: arrayRemove(userId) })
}

// Família: assinar membros
export function subscribeFamilyMembers(familyId, callback) {
  return onSnapshot(doc(db, 'families', familyId), (snap) => {
    if (snap.exists()) callback({ ...snap.data(), familyId })
  })
}