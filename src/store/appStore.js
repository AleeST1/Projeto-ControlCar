import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { isFirestoreEnabled, upsertVehicle, updateVehicleFirestore, removeVehicleCascade, upsertFueling, updateFuelingFirestore, removeFuelingFirestore, upsertReminder, removeReminderFirestore, updateReminderFirestore, upsertTrip, updateTripFirestore, removeTripFirestore, upsertDocument, updateDocumentFirestore, removeDocumentFirestore, upsertFine, updateFineFirestore, removeFineFirestore } from '../services/firestore'

function computePricePerLiter(totalCost, liters) {
  if (!liters || liters <= 0) return 0
  return Number((totalCost / liters).toFixed(2))
}

function computeAverageKmPerLiter(fuelings) {
  // Average over fill-ups where we have previous odometer to compute distance
  if (!fuelings || fuelings.length < 2) return 0
  let totalDistance = 0
  let totalLiters = 0
  const sorted = [...fuelings].sort((a, b) => a.odometer - b.odometer)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const distance = (curr.odometer ?? 0) - (prev.odometer ?? 0)
    if (distance > 0 && curr.liters > 0) {
      totalDistance += distance
      totalLiters += curr.liters
    }
  }
  if (totalLiters === 0) return 0
  return Number((totalDistance / totalLiters).toFixed(2))
}

export const useAppStore = create(
  persist(
    (set, get) => ({
      currentUserId: null,
      vehicles: [],
      fuelings: [],
      reminders: [],
      trips: [],
      documents: [],
      fines: [],
      // Tema dinâmico
      themeColor: '#00bcd4',
      // Escopo família
      currentFamilyId: null,
      // UI feedback (não persistido)
      toasts: [],
      // Sync flags (não persistidos)
      syncEnabled: false,
      realtimeSubscribed: false,
      lastSyncAt: null,

      setCurrentUser: (user) => set(() => ({ currentUserId: user?.uid || null })),
      setThemeColor: (color) => set(() => ({ themeColor: color || '#00bcd4' })),
      setCurrentFamilyId: (familyId) => set(() => ({ currentFamilyId: familyId || null })),
      resetAll: () => set(() => ({ vehicles: [], fuelings: [], reminders: [], trips: [], documents: [], fines: [] })),
      setAllData: (payload) =>
        set(() => ({
          vehicles: Array.isArray(payload?.vehicles) ? payload.vehicles : [],
          fuelings: Array.isArray(payload?.fuelings)
            ? payload.fuelings.map((f) => ({ ...f, pricePerLiter: computePricePerLiter(f.totalCost, f.liters) }))
            : [],
          reminders: Array.isArray(payload?.reminders) ? payload.reminders : [],
          trips: Array.isArray(payload?.trips) ? payload.trips : [],
          documents: Array.isArray(payload?.documents) ? payload.documents : [],
          fines: Array.isArray(payload?.fines) ? payload.fines : [],
        })),

      setVehicles: (list) => set(() => ({ vehicles: Array.isArray(list) ? list : [] })),
      setFuelings: (list) => set(() => ({ fuelings: Array.isArray(list) ? list.map((f) => ({ ...f, pricePerLiter: computePricePerLiter(f.totalCost, f.liters) })) : [] })),
      setReminders: (list) => set(() => ({ reminders: Array.isArray(list) ? list : [] })),
      setTrips: (list) => set(() => ({ trips: Array.isArray(list) ? list : [] })),
      setDocuments: (list) => set(() => ({ documents: Array.isArray(list) ? list : [] })),
      setFines: (list) => set(() => ({ fines: Array.isArray(list) ? list : [] })),

      // Sync actions
      setSyncEnabled: (val) => set(() => ({ syncEnabled: Boolean(val) })),
      setRealtimeSubscribed: (val) => set(() => ({ realtimeSubscribed: Boolean(val) })),
      setLastSyncAt: (ts) => set(() => ({ lastSyncAt: ts ?? Date.now() })),

      // Toasts
      addToast: (payload) => {
        const id = crypto.randomUUID()
        const toast = {
          id,
          type: payload?.type || 'info',
          message: payload?.message || '',
          timeoutMs: typeof payload?.timeoutMs === 'number' ? payload.timeoutMs : 4000,
        }
        set((state) => ({ toasts: [...state.toasts, toast] }))
        return id
      },
      dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      clearToasts: () => set(() => ({ toasts: [] })),

      addVehicle: (vehicle) => {
        const userId = get().currentUserId
        const familyId = get().currentFamilyId
        const newVehicle = { ...vehicle, vehicleId: vehicle.vehicleId || crypto.randomUUID(), userId, familyId }
        set((state) => ({ vehicles: [...state.vehicles, newVehicle] }))
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          upsertVehicle(userId, newVehicle).catch((e) => console.error('Erro ao sincronizar veículo:', e))
        }
      },

      updateVehicle: (vehicleId, updates) => {
        set((state) => ({
          vehicles: state.vehicles.map((v) => (v.vehicleId === vehicleId ? { ...v, ...updates } : v)),
        }))
        const userId = get().currentUserId
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          updateVehicleFirestore(vehicleId, updates).catch((e) => console.error('Erro ao atualizar veículo no Firestore:', e))
        }
      },

      updateVehicleMileage: (vehicleId, mileage) => {
        set((state) => ({
          vehicles: state.vehicles.map((v) => (v.vehicleId === vehicleId ? { ...v, currentMileage: mileage } : v)),
        }))
        const userId = get().currentUserId
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          updateVehicleFirestore(vehicleId, { currentMileage: mileage }).catch((e) => console.error('Erro ao atualizar quilometragem no Firestore:', e))
        }
      },

      removeVehicle: (vehicleId) => {
        set((state) => ({
          vehicles: state.vehicles.filter((v) => v.vehicleId !== vehicleId),
          fuelings: state.fuelings.filter((f) => f.vehicleId !== vehicleId),
          reminders: state.reminders.filter((r) => r.vehicleId !== vehicleId),
          documents: state.documents.filter((d) => d.vehicleId !== vehicleId),
          fines: state.fines.filter((fi) => fi.vehicleId !== vehicleId),
        }))
        const userId = get().currentUserId
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          removeVehicleCascade(userId, vehicleId).catch((e) => console.error('Erro ao remover veículo no Firestore:', e))
        }
      },

      addFueling: (fueling) => {
        const userId = get().currentUserId
        const familyId = get().currentFamilyId
        const pricePerLiter = computePricePerLiter(fueling.totalCost, fueling.liters)
        const fuelingId = fueling.fuelingId || crypto.randomUUID()
        const item = { ...fueling, fuelingId, pricePerLiter, userId, familyId }
        set((state) => ({ fuelings: [...state.fuelings, item] }))
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          upsertFueling(userId, item).catch((e) => console.error('Erro ao sincronizar abastecimento:', e))
        }
      },

      updateFueling: (fuelingId, updates) => {
        set((state) => ({
          fuelings: state.fuelings.map((f) => (f.fuelingId === fuelingId ? { ...f, ...updates, pricePerLiter: computePricePerLiter(updates.totalCost ?? f.totalCost, updates.liters ?? f.liters) } : f)),
        }))
        const userId = get().currentUserId
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          updateFuelingFirestore(fuelingId, updates).catch((e) => console.error('Erro ao atualizar abastecimento no Firestore:', e))
        }
      },

      removeFueling: (fuelingId) => {
        set((state) => ({ fuelings: state.fuelings.filter((f) => f.fuelingId !== fuelingId) }))
        const userId = get().currentUserId
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          removeFuelingFirestore(fuelingId).catch((e) => console.error('Erro ao remover abastecimento no Firestore:', e))
        }
      },

      fuelingsForVehicle: (vehicleId) => get().fuelings.filter((f) => f.vehicleId === vehicleId),
      averageConsumptionForVehicle: (vehicleId) => {
        const list = get().fuelingsForVehicle(vehicleId)
        return computeAverageKmPerLiter(list)
      },

      addReminder: (reminder) => {
        const userId = get().currentUserId
        const familyId = get().currentFamilyId
        const item = {
          ...reminder,
          reminderId: reminder.reminderId || crypto.randomUUID(),
          isCompleted: false,
          // novos campos opcionais
          repeatEveryDays: typeof reminder.repeatEveryDays === 'number' ? reminder.repeatEveryDays : null,
          priority: reminder.priority || 'medium',
          userId,
          familyId,
        }
        set((state) => ({ reminders: [...state.reminders, item] }))
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          upsertReminder(userId, item).catch((e) => console.error('Erro ao sincronizar lembrete:', e))
        }
      },

      updateReminder: (reminderId, updates) => {
        set((state) => ({
          reminders: state.reminders.map((r) => (r.reminderId === reminderId ? { ...r, ...updates } : r)),
        }))
        const userId = get().currentUserId
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          updateReminderFirestore(reminderId, updates).catch((e) => console.error('Erro ao atualizar lembrete no Firestore:', e))
        }
      },

      toggleReminder: (reminderId) => {
        const stateBefore = get()
        const current = stateBefore.reminders.find((x) => x.reminderId === reminderId)
        const toggled = current ? !current.isCompleted : true
        // Atualiza item
        set((state) => ({
          reminders: state.reminders.map((r) => (r.reminderId === reminderId ? { ...r, isCompleted: toggled } : r)),
        }))
        // Se concluir e houver repetição, cria próxima ocorrência
        if (current && toggled && typeof current.repeatEveryDays === 'number' && current.repeatEveryDays > 0) {
          const userId = get().currentUserId
          const familyId = get().currentFamilyId
          const nextDueMs = (current.dueDate ? new Date(current.dueDate).getTime() : Date.now()) + current.repeatEveryDays * 24 * 60 * 60 * 1000
          const nextItem = {
            ...current,
            reminderId: crypto.randomUUID(),
            isCompleted: false,
            dueDate: new Date(nextDueMs).toISOString(),
            userId,
            familyId,
          }
          set((state) => ({ reminders: [...state.reminders, nextItem] }))
          if (isFirestoreEnabled && userId && userId !== 'offline') {
            upsertReminder(userId, nextItem).catch((e) => console.error('Erro ao criar próxima ocorrência do lembrete:', e))
          }
        }
        const userId = get().currentUserId
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          const r = get().reminders.find((x) => x.reminderId === reminderId)
          if (r) {
            updateReminderFirestore(reminderId, { isCompleted: r.isCompleted }).catch((e) => console.error('Erro ao atualizar lembrete no Firestore:', e))
          }
        }
      },

      snoozeReminder: (reminderId, days) => {
        const r = get().reminders.find((x) => x.reminderId === reminderId)
        const baseMs = r?.dueDate ? new Date(r.dueDate).getTime() : Date.now()
        const nextMs = baseMs + (Number(days) || 0) * 24 * 60 * 60 * 1000
        const nextDate = new Date(nextMs).toISOString()
        set((state) => ({
          reminders: state.reminders.map((it) => (it.reminderId === reminderId ? { ...it, dueDate: nextDate } : it)),
        }))
        const userId = get().currentUserId
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          updateReminderFirestore(reminderId, { dueDate: nextDate }).catch((e) => console.error('Erro ao adiar lembrete no Firestore:', e))
        }
      },

      removeReminder: (reminderId) => {
        set((state) => ({ reminders: state.reminders.filter((r) => r.reminderId !== reminderId) }))
        const userId = get().currentUserId
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          removeReminderFirestore(reminderId).catch((e) => console.error('Erro ao remover lembrete no Firestore:', e))
        }
      },

      // Trips
      addTrip: (trip) => {
        const userId = get().currentUserId
        const familyId = get().currentFamilyId
        const item = { ...trip, tripId: trip.tripId || crypto.randomUUID(), isCompleted: false, userId, familyId }
        set((state) => ({ trips: [...state.trips, item] }))
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          upsertTrip(userId, item).catch((e) => console.error('Erro ao sincronizar viagem:', e))
        }
      },

      updateTrip: (tripId, updates) => {
        set((state) => ({
          trips: state.trips.map((t) => (t.tripId === tripId ? { ...t, ...updates } : t)),
        }))
        const userId = get().currentUserId
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          updateTripFirestore(tripId, updates).catch((e) => console.error('Erro ao atualizar viagem no Firestore:', e))
        }
      },

      toggleTrip: (tripId) => {
        set((state) => ({
          trips: state.trips.map((t) => (t.tripId === tripId ? { ...t, isCompleted: !t.isCompleted } : t)),
        }))
        const userId = get().currentUserId
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          const t = get().trips.find((x) => x.tripId === tripId)
          if (t) {
            updateTripFirestore(tripId, { isCompleted: t.isCompleted }).catch((e) => console.error('Erro ao atualizar viagem no Firestore:', e))
          }
        }
      },

      removeTrip: (tripId) => {
        set((state) => ({ trips: state.trips.filter((t) => t.tripId !== tripId) }))
        const userId = get().currentUserId
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          removeTripFirestore(tripId).catch((e) => console.error('Erro ao remover viagem no Firestore:', e))
        }
      },

      // Documents
      addDocument: (document) => {
        const userId = get().currentUserId
        const familyId = get().currentFamilyId
        const item = { ...document, documentId: document.documentId || crypto.randomUUID(), userId, familyId }
        set((state) => ({ documents: [...state.documents, item] }))
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          upsertDocument(userId, item).catch((e) => console.error('Erro ao sincronizar documento:', e))
        }
      },

      updateDocument: (documentId, updates) => {
        set((state) => ({
          documents: state.documents.map((d) => (d.documentId === documentId ? { ...d, ...updates } : d)),
        }))
        const userId = get().currentUserId
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          updateDocumentFirestore(documentId, updates).catch((e) => console.error('Erro ao atualizar documento no Firestore:', e))
        }
      },

      removeDocument: (documentId) => {
        set((state) => ({ documents: state.documents.filter((d) => d.documentId !== documentId) }))
        const userId = get().currentUserId
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          removeDocumentFirestore(documentId).catch((e) => console.error('Erro ao remover documento no Firestore:', e))
        }
      },

      // Fines
      addFine: (fine) => {
        const userId = get().currentUserId
        const familyId = get().currentFamilyId
        const item = { ...fine, fineId: fine.fineId || crypto.randomUUID(), userId, familyId }
        set((state) => ({ fines: [...state.fines, item] }))
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          upsertFine(userId, item).catch((e) => console.error('Erro ao sincronizar multa:', e))
        }
      },

      updateFine: (fineId, updates) => {
        set((state) => ({
          fines: state.fines.map((f) => (f.fineId === fineId ? { ...f, ...updates } : f)),
        }))
        const userId = get().currentUserId
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          updateFineFirestore(fineId, updates).catch((e) => console.error('Erro ao atualizar multa no Firestore:', e))
        }
      },

      removeFine: (fineId) => {
        set((state) => ({ fines: state.fines.filter((f) => f.fineId !== fineId) }))
        const userId = get().currentUserId
        if (isFirestoreEnabled && userId && userId !== 'offline') {
          removeFineFirestore(fineId).catch((e) => console.error('Erro ao remover multa no Firestore:', e))
        }
      },
    }),
    {
      name: 'controlcar-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currentUserId: state.currentUserId, currentFamilyId: state.currentFamilyId, vehicles: state.vehicles, fuelings: state.fuelings, reminders: state.reminders, trips: state.trips, documents: state.documents, fines: state.fines, themeColor: state.themeColor }),
    }
  )
)