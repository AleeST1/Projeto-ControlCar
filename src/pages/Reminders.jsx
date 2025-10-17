import { useState, useEffect } from 'react'
import EmptyState from '../components/EmptyState'
import { useAppStore } from '../store/appStore'
import ConfirmDialog from '../components/ConfirmDialog'
import { enableNotifications, disableNotifications, getNotificationStatus } from '../services/messaging'
import PageHeader from '../components/PageHeader'

export default function Reminders() {
  const vehicles = useAppStore((s) => s.vehicles)
  const addReminder = useAppStore((s) => s.addReminder)
  const addToast = useAppStore((s) => s.addToast)
  const currentUserId = useAppStore((s) => s.currentUserId)
  const [form, setForm] = useState({ vehicleId: '', type: 'maintenance', description: '', dueDate: '', dueMileage: '' })
  const [submitting, setSubmitting] = useState(false)
  const [{ permission, hasToken }, setNotif] = useState({ permission: typeof Notification !== 'undefined' ? Notification.permission : 'default', hasToken: !!localStorage.getItem('fcmToken') })

  useEffect(() => {
    setNotif(getNotificationStatus())
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    // Validação antes de marcar como submetendo para não travar o botão
    if (!form.vehicleId || (!form.dueDate && !form.dueMileage) || !form.description) {
      return
    }
    setSubmitting(true)
    try {
      addReminder({
        vehicleId: form.vehicleId,
        type: form.type,
        description: form.description.trim(),
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        dueMileage: form.dueMileage ? Number(form.dueMileage) : null,
      })
      setForm({ vehicleId: '', type: 'maintenance', description: '', dueDate: '', dueMileage: '' })
      addToast({ type: 'success', message: 'Lembrete adicionado com sucesso' })
    } catch (err) {
      console.error('Erro ao adicionar lembrete:', err)
      addToast({ type: 'error', message: 'Erro ao adicionar lembrete' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Lembretes" subtitle="Receba avisos quando um lembrete estiver próximo ou vencer.">
        {permission !== 'granted' || !hasToken ? (
          <button
            className="px-3 py-1.5 rounded-lg text-sm bg-primary-600 text-white hover:bg-primary-700"
            onClick={async () => {
              try {
                const token = await enableNotifications(currentUserId)
                setNotif({ permission: 'granted', hasToken: !!token })
                addToast({ type: 'success', message: 'Notificações ativadas' })
              } catch (err) {
                console.error('Falha ao ativar notificações:', err)
                addToast({ type: 'error', message: err?.message || 'Não foi possível ativar notificações' })
              }
            }}
          >
            Ativar notificações
          </button>
        ) : (
          <button
            className="px-3 py-1.5 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700"
            onClick={async () => {
              const ok = await disableNotifications()
              if (ok) {
                setNotif({ permission: 'default', hasToken: false })
                addToast({ type: 'success', message: 'Notificações desativadas' })
              } else {
                addToast({ type: 'error', message: 'Não foi possível desativar notificações' })
              }
            }}
          >
            Desativar notificações
          </button>
        )}
      </PageHeader>

      <form id="add-reminder" onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Veículo"
          value={form.vehicleId}
          onChange={(v) => setForm({ ...form, vehicleId: v })}
          options={vehicles.map((v) => ({ value: v.vehicleId, label: `${v.model} ${v.year} — ${v.plate}` }))}
          required
        />
        <Select
          label="Tipo"
          value={form.type}
          onChange={(v) => setForm({ ...form, type: v })}
          options={[
            { value: 'maintenance', label: 'Manutenção' },
            { value: 'document', label: 'Documento' },
          ]}
          required
        />
        <Input label="Descrição" value={form.description} onChange={(v) => setForm({ ...form, description: v })} required />
        <Input label="Data (opcional)" type="date" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
        <Input label="Quilometragem (opcional)" type="number" value={form.dueMileage} onChange={(v) => setForm({ ...form, dueMileage: v })} />
        <div className="sm:col-span-2">
          <button className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60" disabled={submitting}>{submitting ? 'Adicionando…' : 'Adicionar lembrete'}</button>
        </div>
      </form>

      <ReminderList />
    </div>
  )
}

function ReminderList() {
  const vehicles = useAppStore((s) => s.vehicles)
  const reminders = useAppStore((s) => s.reminders)
  const toggleReminder = useAppStore((s) => s.toggleReminder)
  const removeReminder = useAppStore((s) => s.removeReminder)
  const addToast = useAppStore((s) => s.addToast)
  const [filterVehicleId, setFilterVehicleId] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium">Agendados</h3>
      <div className="glass-card rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select
          label="Filtrar por veículo"
          value={filterVehicleId}
          onChange={(v) => setFilterVehicleId(v)}
          options={[{ value: '', label: 'Todos' }, ...vehicles.map((v) => ({ value: v.vehicleId, label: `${v.model} ${v.plate}` }))]}
        />
      </div>
      {(
        (filterVehicleId ? reminders.filter((x) => x.vehicleId === filterVehicleId) : reminders).length === 0
      ) && (
        <EmptyState 
          icon="event" 
          title="Nenhum lembrete cadastrado"
          description="Crie lembretes para manutenção e documentos e receba avisos de vencimento."
          actionText="Adicionar lembrete"
          to="#add-reminder"
        />
      )}
      {(filterVehicleId ? reminders.filter((x) => x.vehicleId === filterVehicleId) : reminders).map((r) => {
        const v = vehicles.find((v) => v.vehicleId === r.vehicleId)
        const dueDate = r.dueDate ? new Date(r.dueDate) : null
        const now = new Date()
        const isDateOverdue = dueDate ? dueDate < new Date(now.getFullYear(), now.getMonth(), now.getDate()) : false
        const isMileageOverdue = r.dueMileage != null && v && (v.currentMileage ?? 0) >= r.dueMileage
        const overdue = !r.isCompleted && (isDateOverdue || isMileageOverdue)
        return (
          <div key={r.reminderId} className={`glass-card rounded-2xl p-5 flex items-center justify-between ${overdue ? 'border-red-400 bg-red-900/15' : ''}`}>
            <div>
              <div className="font-medium text-white">{r.description}</div>
              <div className="text-xs text-secondary-300">{v ? `${v.model} ${v.plate}` : 'Veículo'} • {r.type === 'document' ? 'Documento' : 'Manutenção'}</div>
              <div className="text-xs text-secondary-400 mt-1">
                {r.dueDate ? `Data: ${new Date(r.dueDate).toLocaleDateString()}` : ''}
                {r.dueDate && r.dueMileage ? ' • ' : ''}
                {r.dueMileage ? `Km: ${r.dueMileage}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className={`px-3 py-1.5 rounded-lg text-sm shadow-sm transition-colors ${r.isCompleted ? 'bg-green-600 text-white hover:bg-green-700' : overdue ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-yellow-500 text-black hover:bg-yellow-600'}`} onClick={() => { toggleReminder(r.reminderId); addToast({ type: 'success', message: 'Lembrete atualizado' }) }}>
                {r.isCompleted ? 'Concluído' : overdue ? 'Atrasado' : 'Pendente'}
              </button>
              <button className="px-3 py-1.5 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm" onClick={() => setConfirmDeleteId(r.reminderId)}>Remover</button>
            </div>
          </div>
        )
      })}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Confirmar exclusão"
        message="Tem certeza que deseja excluir este lembrete? Esta ação é irreversível."
        confirmText="Excluir"
        cancelText="Cancelar"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (!confirmDeleteId) return
          removeReminder(confirmDeleteId)
          addToast({ type: 'success', message: 'Lembrete removido' })
          setConfirmDeleteId(null)
        }}
      />
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', required }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-secondary-300">{label}</span>
      <input
        className="rounded-lg border border-dark-100 bg-dark-300 px-3 py-2 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
        value={value}
        type={type}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function Select({ label, value, onChange, options, required }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-secondary-300">{label}</span>
      <select
        className="rounded-lg border border-dark-100 bg-dark-700 px-3 py-2 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  )
}