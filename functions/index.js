const admin = require('firebase-admin')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onRequest } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions')

// Dias de antecedência para notificar. Pode ser sobrescrito por env ou query param.
const DAYS_BEFORE = Number(process.env.REMINDER_DAYS_BEFORE || '7')

admin.initializeApp()
const db = admin.firestore()

async function runReminderJob(daysBefore = DAYS_BEFORE) {
  try {
    const tokensSnap = await db.collection('notificationTokens').get()
    const tokensByUser = new Map()
    tokensSnap.forEach((doc) => {
      const data = doc.data()
      const { userId, token } = data || {}
      if (userId && token) {
        const list = tokensByUser.get(userId) || []
        list.push(token)
        tokensByUser.set(userId, list)
      }
    })

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    for (const [userId, tokens] of tokensByUser.entries()) {
      if (!tokens || tokens.length === 0) continue

      const [remindersSnap, vehiclesSnap] = await Promise.all([
        db.collection('maintenances').where('userId', '==', userId).get(),
        db.collection('vehicles').where('userId', '==', userId).get(),
      ])
      const vehicleById = {}
      vehiclesSnap.forEach((d) => (vehicleById[d.id] = d.data()))

      let notification = null
      remindersSnap.forEach((d) => {
        const r = d.data()
        if (r.isCompleted) return
        let overdue = false
        let dueSoon = false

        if (r.dueDate) {
          const due = new Date(r.dueDate)
          const deltaDays = Math.floor((due - todayStart) / (24 * 60 * 60 * 1000))
          overdue = due < todayStart
          // Dispara notificação exatamente X dias antes da data
          dueSoon = deltaDays === daysBefore
        }

        if (typeof r.dueMileage === 'number') {
          const v = vehicleById[r.vehicleId]
          const curr = v?.currentMileage ?? 0
          const margin = 200
          overdue = overdue || curr >= r.dueMileage
          dueSoon = dueSoon || (curr >= r.dueMileage - margin && curr < r.dueMileage)
        }

        if (overdue || dueSoon) {
          const v = vehicleById[r.vehicleId]
          const vehicleLabel = v ? `${v.model} ${v.plate}` : 'Veículo'
          const title = overdue ? 'Manutenção atrasada' : 'Manutenção chegando'
          const base = `${vehicleLabel}: ${r.description}`
          const details = []
          if (r.dueDate) details.push(`Data: ${new Date(r.dueDate).toLocaleDateString('pt-BR')}`)
          if (typeof r.dueMileage === 'number') details.push(`Km: ${r.dueMileage}`)
          const body = overdue
            ? [base, ...details].join(' • ')
            : ['A manutenção do seu veículo está chegando', base, ...details].join(' • ')
          notification = { title, body }
        }
      })

      if (!notification) continue
      try {
        const resp = await admin.messaging().sendEachForMulticast({
          tokens,
          notification,
          data: { url: '/maintenances' },
        })
        logger.info(`Notificação enviada para ${userId}`, { success: resp.successCount, failure: resp.failureCount })
      } catch (e) {
        logger.error('Erro ao enviar FCM', e)
      }
    }
  } catch (err) {
    logger.error('Falha no job de notificações', err)
  }
}

exports.sendReminderNotifications = onSchedule({ schedule: 'every day 08:00', timeZone: 'America/Sao_Paulo' }, async (event) => {
  await runReminderJob()
})

exports.sendReminderNotificationsNow = onRequest(async (req, res) => {
  let days = Number(req.query.daysBefore || req.query.days || DAYS_BEFORE)
  if (!Number.isFinite(days) || days < 0 || days > 365) {
    days = DAYS_BEFORE
  }
  await runReminderJob(days)
  res.json({ ok: true, daysBefore: days })
})

// Migração: copia documentos de 'reminders' para 'maintenances'
exports.migrateRemindersToMaintenances = onRequest(async (req, res) => {
  try {
    const remSnap = await db.collection('reminders').get()
    const batch = db.batch()
    remSnap.forEach((doc) => {
      batch.set(db.collection('maintenances').doc(doc.id), doc.data())
    })
    await batch.commit()

    const shouldDelete = req.query.delete === '1'
    let deleted = 0
    if (shouldDelete) {
      const batchDel = db.batch()
      remSnap.forEach((doc) => batchDel.delete(doc.ref))
      await batchDel.commit()
      deleted = remSnap.size
    }
    res.json({ migrated: remSnap.size, deleted })
  } catch (e) {
    logger.error('Falha na migração reminders -> maintenances', e)
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Seed: cria uma manutenção de teste com dueDate em 7 dias para cada usuário com token
exports.seedMaintenanceTest = onRequest(async (req, res) => {
  try {
    const tokensSnap = await db.collection('notificationTokens').get()
    const users = new Set()
    tokensSnap.forEach((doc) => {
      const data = doc.data()
      if (data?.userId) users.add(data.userId)
    })

    const now = new Date()
    const dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString()
    let created = 0

    const batch = db.batch()
    for (const userId of users) {
      const vehicleId = `test-vehicle-${userId}`
      const vehicleRef = db.collection('vehicles').doc(vehicleId)
      batch.set(vehicleRef, { userId, model: 'Teste', plate: 'TEST-1234', currentMileage: 10000 })

      const maintId = `test-maint-${userId}`
      const maintRef = db.collection('maintenances').doc(maintId)
      batch.set(maintRef, {
        userId,
        vehicleId,
        description: 'Manutenção de teste',
        dueDate,
        isCompleted: false,
      })
      created++
    }
    await batch.commit()
    res.json({ ok: true, users: users.size, created })
  } catch (e) {
    logger.error('Falha no seed de manutenções de teste', e)
    res.status(500).json({ ok: false, error: e.message })
  }
})