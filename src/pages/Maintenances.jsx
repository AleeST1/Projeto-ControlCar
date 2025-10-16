import { useState, useEffect } from 'react'
import EmptyState from '../components/EmptyState'
import { useAppStore } from '../store/appStore'
import ConfirmDialog from '../components/ConfirmDialog'
import { enableNotifications, disableNotifications, getNotificationStatus } from '../services/messaging'
import PageHeader from '../components/PageHeader'
import FilterBar from '../components/FilterBar'

export default function Maintenances() {
  const vehicles = useAppStore((s) => s.vehicles)
  const addReminder = useAppStore((s) => s.addReminder)
  const addToast = useAppStore((s) => s.addToast)
  const currentUserId = useAppStore((s) => s.currentUserId)
  const [form, setForm] = useState({ vehicleId: '', description: '', dueDate: '', repeatEveryDays: '', priority: 'medium' })
  const [submitting, setSubmitting] = useState(false)
  const [{ permission, hasToken }, setNotif] = useState({ permission: typeof Notification !== 'undefined' ? Notification.permission : 'default', hasToken: !!localStorage.getItem('fcmToken') })

  useEffect(() => {
    setNotif(getNotificationStatus())
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.vehicleId || !form.dueDate || !form.description) {
      return
    }
    setSubmitting(true)
    try {
      addReminder({
        vehicleId: form.vehicleId,
        type: 'maintenance',
        description: form.description.trim(),
        dueDate: new Date(form.dueDate).toISOString(),
        dueMileage: null,
        repeatEveryDays: form.repeatEveryDays ? Number(form.repeatEveryDays) : null,
        priority: form.priority || 'medium',
      })
      setForm({ vehicleId: '', description: '', dueDate: '', repeatEveryDays: '', priority: 'medium' })
      addToast({ type: 'success', message: 'Manutenção adicionada com sucesso' })
    } catch (err) {
      console.error('Erro ao adicionar manutenção:', err)
      addToast({ type: 'error', message: 'Erro ao adicionar manutenção' })
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleNotifications() {
    try {
      if (hasToken) {
        await disableNotifications()
        setNotif(getNotificationStatus())
        addToast({ type: 'success', message: 'Notificações desativadas' })
      } else {
        await enableNotifications(currentUserId)
        setNotif(getNotificationStatus())
        addToast({ type: 'success', message: 'Notificações ativadas' })
      }
    } catch (e) {
      addToast({ type: 'error', message: e?.message || 'Falha ao atualizar notificações' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Manutenções" subtitle="Receba avisos próximos do vencimento e gerencie suas manutenções.">
        <button
          className={`px-3 py-1.5 rounded-lg text-sm shadow-sm ${hasToken ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
          onClick={toggleNotifications}
        >
          {hasToken ? 'Desativar notificações' : 'Ativar notificações'}
        </button>
      </PageHeader>

      <section id="add-maintenance" className="space-y-3">
        <h3 className="text-lg font-medium">Cadastrar manutenção</h3>
        <form className="glass-card rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-3" onSubmit={handleSubmit}>
          <Select
            label="Veículo"
            value={form.vehicleId}
            required
            onChange={(v) => setForm((f) => ({ ...f, vehicleId: v }))}
            options={[{ value: '', label: 'Selecione' }, ...vehicles.map((v) => ({ value: v.vehicleId, label: `${v.model} ${v.plate}` }))]}
          />
          <Input
            label="Descrição"
            value={form.description}
            required
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
          />
          <Input
            label="Data"
            type="date"
            value={form.dueDate}
            required
            onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))}
          />
          <Input
            label="Repetir a cada (dias)"
            type="number"
            value={form.repeatEveryDays}
            onChange={(v) => setForm((f) => ({ ...f, repeatEveryDays: v }))}
          />
          <Select
            label="Prioridade"
            value={form.priority}
            onChange={(v) => setForm((f) => ({ ...f, priority: v }))}
            options={[
              { value: 'low', label: 'Baixa' },
              { value: 'medium', label: 'Média' },
              { value: 'high', label: 'Alta' },
            ]}
          />
          <div className="sm:col-span-3">
            <button className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60" disabled={submitting}>
              {submitting ? 'Adicionando…' : 'Adicionar manutenção'}
            </button>
          </div>
        </form>
      </section>

      <MaintenanceList />
    </div>
  )
}

function MaintenanceList() {
  const vehicles = useAppStore((s) => s.vehicles)
  const reminders = useAppStore((s) => s.reminders)
  const toggleReminder = useAppStore((s) => s.toggleReminder)
  const removeReminder = useAppStore((s) => s.removeReminder)
  const updateReminder = useAppStore((s) => s.updateReminder)
  const snoozeReminder = useAppStore((s) => s.snoozeReminder)
  const addToast = useAppStore((s) => s.addToast)
  const [filterVehicleId, setFilterVehicleId] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const list = filterVehicleId ? reminders.filter((x) => x.vehicleId === filterVehicleId) : reminders

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium">Agendadas</h3>
      <FilterBar
        vehicleOptions={[{ value: '', label: 'Todos' }, ...vehicles.map((v) => ({ value: v.vehicleId, label: `${v.model} ${v.plate}` }))]}
        vehicleValue={filterVehicleId}
        onVehicleChange={setFilterVehicleId}
        actions={(
          <>
            <button className="px-3 py-1.5 rounded-lg bg-dark-200 border border-dark-300 text-xs hover:bg-dark-300" onClick={() => exportMaintenancesCSV(list, vehicles)}>Exportar CSV</button>
            <button className="px-3 py-1.5 rounded-lg bg-dark-200 border border-dark-300 text-xs hover:bg-dark-300" onClick={() => exportMaintenancesXLS(list, vehicles)}>Exportar Excel</button>
          </>
        )}
      />

      {list.length === 0 && (
        <EmptyState
          icon="event"
          title="Nenhuma manutenção cadastrada"
          description="Cadastre manutenções por data e receba avisos próximos do vencimento."
          actionText="Adicionar manutenção"
          to="#add-maintenance"
        />
      )}

      {list.map((r) => {
        const v = vehicles.find((vv) => vv.vehicleId === r.vehicleId)
        const dueDateLabel = r.dueDate ? new Date(r.dueDate).toLocaleDateString('pt-BR') : '—'
        const overdue = r.dueDate ? new Date(r.dueDate) < new Date() : false
        return (
          <div key={r.reminderId} className="glass-card rounded-2xl p-5 flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="font-medium text-white">{r.description}</div>
                {r.priority && (
                  <span className={`px-2 py-0.5 rounded text-[11px] ${r.priority === 'high' ? 'bg-red-600 text-white' : r.priority === 'medium' ? 'bg-yellow-500 text-black' : 'bg-secondary-600 text-white'}`}>{r.priority === 'high' ? 'Alta' : r.priority === 'medium' ? 'Média' : 'Baixa'}</span>
                )}
              </div>
              <div className="text-xs text-secondary-300">{v ? `${v.model} ${v.plate}` : 'Veículo'} • Data: {dueDateLabel} {r.repeatEveryDays ? `• Repete a cada ${r.repeatEveryDays}d` : ''}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`px-3 py-1.5 rounded-lg text-sm shadow-sm transition-colors ${r.isCompleted ? 'bg-green-600 text-white hover:bg-green-700' : overdue ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-yellow-500 text-black hover:bg-yellow-600'}`}
                onClick={() => { toggleReminder(r.reminderId); addToast({ type: 'success', message: 'Manutenção atualizada' }) }}
              >
                {r.isCompleted ? 'Concluída' : overdue ? 'Atrasada' : 'Pendente'}
              </button>
              <button className="px-3 py-1.5 rounded-lg text-sm bg-dark-200 text-white hover:bg-dark-300 border border-dark-300" onClick={() => { snoozeReminder(r.reminderId, 7); addToast({ type: 'success', message: 'Adiado por 7 dias' }) }}>Adiar 7d</button>
              <select
                className="px-2 py-1 rounded-lg text-sm bg-dark-200 text-white border border-dark-300"
                value={r.priority || 'medium'}
                onChange={(e) => { updateReminder(r.reminderId, { priority: e.target.value }); addToast({ type: 'success', message: 'Prioridade atualizada' }) }}
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
              <button className="px-3 py-1.5 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm" onClick={() => setConfirmDeleteId(r.reminderId)}>Remover</button>
            </div>
          </div>
        )
      })}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Confirmar exclusão"
        message="Tem certeza que deseja excluir esta manutenção? Esta ação é irreversível."
        confirmText="Excluir"
        cancelText="Cancelar"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (!confirmDeleteId) return
          removeReminder(confirmDeleteId)
          addToast({ type: 'success', message: 'Manutenção removida' })
          setConfirmDeleteId(null)
        }}
      />
    </div>
  )
}

function exportMaintenancesCSV(list, vehicles) {
  const rows = []
  rows.push(['ID', 'Veículo', 'Descrição', 'Data', 'Concluída', 'Atrasada'].join(','))
  list.forEach((r) => {
    const v = vehicles.find((x) => x.vehicleId === r.vehicleId)
    const overdue = r.dueDate ? new Date(r.dueDate) < new Date() : false
    const cols = [
      r.reminderId,
      v ? `${v.model} ${v.plate}` : '',
      (r.description || '').replace(/"/g, '"'),
      r.dueDate ? new Date(r.dueDate).toLocaleDateString('pt-BR') : '',
      r.isCompleted ? 'Sim' : 'Não',
      overdue ? 'Sim' : 'Não',
    ]
    rows.push(cols.map((c) => (/[\,\n\"]/.test(c) ? `"${c}"` : c)).join(','))
  })
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `manutencoes_${new Date().toISOString().slice(0,10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportMaintenancesXLS(list, vehicles) {
  const css = `
    table { border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 4px; }
  `
  const rowsHtml = list.map((r) => {
    const v = vehicles.find((x) => x.vehicleId === r.vehicleId)
    const overdue = r.dueDate ? new Date(r.dueDate) < new Date() : false
    return `<tr>
      <td>${v ? `${v.model} ${v.plate}` : ''}</td>
      <td>${r.description || ''}</td>
      <td>${r.dueDate ? new Date(r.dueDate).toLocaleDateString('pt-BR') : ''}</td>
      <td>${r.isCompleted ? 'Sim' : 'Não'}</td>
      <td>${overdue ? 'Sim' : 'Não'}</td>
    </tr>`
  }).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${css}</style></head><body>
    <table>
      <thead><tr><th>Veículo</th><th>Descrição</th><th>Data</th><th>Concluída</th><th>Atrasada</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </body></html>`
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `manutencoes_${new Date().toISOString().slice(0,10)}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
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
        className="rounded-lg border border-dark-100 bg-dark-300 px-3 py-2 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
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