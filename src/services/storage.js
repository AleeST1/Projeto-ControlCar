import { storage, isFirebaseConfigured } from '../firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export async function uploadVehiclePhoto(userId, vehicleId, file) {
  if (!isFirebaseConfigured) throw new Error('Firebase não configurado')
  if (!file) throw new Error('Arquivo inválido')
  const path = `vehicles/${userId}/${vehicleId}/${Date.now()}_${file.name}`
  const r = ref(storage, path)
  const snap = await uploadBytes(r, file)
  const url = await getDownloadURL(snap.ref)
  return url
}

export async function uploadDocumentAttachment(userId, documentId, file) {
  if (!isFirebaseConfigured) throw new Error('Firebase não configurado')
  if (!file) throw new Error('Arquivo inválido')
  const path = `documents/${userId}/${documentId}/${Date.now()}_${file.name}`
  const r = ref(storage, path)
  const snap = await uploadBytes(r, file)
  const url = await getDownloadURL(snap.ref)
  return url
}

export async function uploadFineAttachment(userId, fineId, file) {
  if (!isFirebaseConfigured) throw new Error('Firebase não configurado')
  if (!file) throw new Error('Arquivo inválido')
  const path = `fines/${userId}/${fineId}/${Date.now()}_${file.name}`
  const r = ref(storage, path)
  const snap = await uploadBytes(r, file)
  const url = await getDownloadURL(snap.ref)
  return url
}