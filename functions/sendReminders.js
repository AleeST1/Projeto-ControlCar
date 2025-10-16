const admin = require('firebase-admin')

// Dias de antecedência (local script). Pode ser definido via env ou argumento CLI.
const DAYS_BEFORE = Number(process.env.REMINDER_DAYS_BEFORE || (process.argv[2] || '7'))

// Inicializa usando credencial de service account
// Configure a variável de ambiente FIREBASE_SERVICE_ACCOUNT_JSON com o conteúdo JSON da chave do serviço
const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
let serviceAccount
if (svcJson) {
  try {
    serviceAccount = JSON.parse(svcJson)
  } catch (e) {
    console.error('FIREBASE_SERVICE_ACCOUNT_JSON inválido:', e.message)
    process.exit(1)
  }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  } catch (e) {
    console.error('Falha ao ler GOOGLE_APPLICATION_CREDENTIALS:', e.message)
    process.exit(1)
  }
} else {
  console.error('Defina FIREBASE_SERVICE_ACCOUNT_JSON ou GOOGLE_APPLICATION_CREDENTIALS (caminho do arquivo da chave de serviço).')
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

async function runReminderJob() {
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

    let totalNotified = 0

    for (const [userId, tokens] of tokensByUser.entries()) {
      if (!tokens || tokens.length === 0) continue

      const [remindersSnap, vehiclesSnap, documentsSnap, finesSnap] = await Promise.all([
        db.collection('maintenances').where('userId', '==', userId).get(),
        db.collection('vehicles').where('userId', '==', userId).get(),
        db.collection('documents').where('userId', '==', userId).get(),
        db.collection('fines').where('userId', '==', userId).get(),
      ])

      const vehicleById = {}
      vehiclesSnap.forEach((d) => (vehicleById[d.id] = d.data()))

      let notifMaint = null
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
          dueSoon = deltaDays === DAYS_BEFORE
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
          // Priorizar atrasadas sobre próximas
          const candidate = { title, body }
          if (!notifMaint || overdue) notifMaint = { notification: candidate, url: '/maintenances' }
        }
      })

      // Documentos (vencimento por data)
      let notifDocs = null
      documentsSnap.forEach((d) => {
        const doc = d.data()
        if (!doc?.dueDate) return
        const due = new Date(doc.dueDate)
        const deltaDays = Math.floor((due - todayStart) / (24 * 60 * 60 * 1000))
        const overdue = due < todayStart
        const dueSoon = deltaDays === DAYS_BEFORE
        if (!overdue && !dueSoon) return
        const v = vehicleById[doc.vehicleId]
        const vehicleLabel = v ? `${v.model} ${v.plate}` : 'Veículo'
        const title = overdue ? 'Documento vencido' : 'Documento a vencer'
        const base = `${vehicleLabel}: ${doc.title || doc.type || 'Documento'}`
        const details = [`Data: ${due.toLocaleDateString('pt-BR')}`]
        const body = overdue
          ? [base, ...details].join(' • ')
          : ['Um documento do seu veículo está próximo do vencimento', base, ...details].join(' • ')
        const candidate = { title, body }
        if (!notifDocs || overdue) notifDocs = { notification: candidate, url: '/documents' }
      })

      // Multas (vencimento do pagamento por data)
      let notifFines = null
      const currencyBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
      finesSnap.forEach((d) => {
        const fine = d.data()
        if (!fine?.dueDate) return
        const due = new Date(fine.dueDate)
        const deltaDays = Math.floor((due - todayStart) / (24 * 60 * 60 * 1000))
        const overdue = due < todayStart
        const dueSoon = deltaDays === DAYS_BEFORE
        if (!overdue && !dueSoon) return
        const v = vehicleById[fine.vehicleId]
        const vehicleLabel = v ? `${v.model} ${v.plate}` : 'Veículo'
        const title = overdue ? 'Multa vencida' : 'Multa a vencer'
        const base = `${vehicleLabel}: ${fine.description || 'Multa'}`
        const details = [`Data: ${due.toLocaleDateString('pt-BR')}`]
        if (typeof fine.value === 'number') details.push(`Valor: ${currencyBRL.format(fine.value)}`)
        if (typeof fine.points === 'number') details.push(`Pontos: ${fine.points}`)
        const body = overdue
          ? [base, ...details].join(' • ')
          : ['Uma multa do seu veículo está próxima do vencimento', base, ...details].join(' • ')
        const candidate = { title, body }
        if (!notifFines || overdue) notifFines = { notification: candidate, url: '/fines' }
      })

      const notifsToSend = [notifMaint, notifDocs, notifFines].filter(Boolean)
      if (notifsToSend.length === 0) continue
      for (const n of notifsToSend) {
        try {
          const resp = await admin.messaging().sendEachForMulticast({
            tokens,
            notification: n.notification,
            data: { url: n.url },
          })
          totalNotified += resp.successCount
          console.log(`Notificação enviada para ${userId}`, { url: n.url, success: resp.successCount, failure: resp.failureCount })
        } catch (e) {
          console.error('Erro ao enviar FCM', e)
        }
      }
    }

    console.log(`Job concluído (antecedência ${DAYS_BEFORE} dias). Total de notificações enviadas:`, totalNotified)
  } catch (err) {
    console.error('Falha no job de notificações', err)
    process.exitCode = 1
  }
}

runReminderJob().then(() => process.exit(0))