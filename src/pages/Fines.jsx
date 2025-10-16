import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '../store/appStore'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { uploadFineAttachment } from '../services/storage'
import PageHeader from '../components/PageHeader'
import FilterBar from '../components/FilterBar'

export default function Fines() {
  const vehicles = useAppStore((s) => s.vehicles)
  const addFine = useAppStore((s) => s.addFine)
  const addToast = useAppStore((s) => s.addToast)
  const currentUserId = useAppStore((s) => s.currentUserId)
  const [form, setForm] = useState({ vehicleId: '', date: '', description: '', value: '', points: '', dueDate: '', file: null })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const fineId = crypto.randomUUID()
      let attachmentUrl = undefined
      if (form.file) {
        attachmentUrl = await uploadFineAttachment(currentUserId || 'offline', fineId, form.file)
      }
      const item = {
        fineId,
        vehicleId: form.vehicleId || null,
        date: form.date || null,
        description: form.description || '',
        value: form.value ? Number(form.value) : 0,
        points: form.points ? Number(form.points) : 0,
        dueDate: form.dueDate || null,
        attachmentUrl,
      }
      addFine(item)
      setForm({ vehicleId: '', date: '', description: '', value: '', points: '', dueDate: '', file: null })
      addToast({ type: 'success', message: 'Multa registrada.' })
    } catch (err) {
      console.error(err)
      addToast({ type: 'error', message: 'Falha ao registrar multa.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader title="Multas" subtitle="Registre e acompanhe valores, pontos e vencimentos." />
      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="text-sm text-secondary-200 flex flex-col gap-1">
          <span>Veículo</span>
          <select className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100" value={form.vehicleId} onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}>
            <option value="">—</option>
            {vehicles.map((v) => (
              <option key={v.vehicleId} value={v.vehicleId}>{v.name || v.model || v.plate || v.vehicleId}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-secondary-200 flex flex-col gap-1">
          <span>Data</span>
          <input className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        </label>
        <label className="text-sm text-secondary-200 flex flex-col gap-1 sm:col-span-2">
          <span>Descrição</span>
          <input className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100" type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Ex.: Excesso de velocidade" />
        </label>
        <label className="text-sm text-secondary-200 flex flex-col gap-1">
          <span>Valor (R$)</span>
          <input className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100" type="number" step="0.01" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
        </label>
        <label className="text-sm text-secondary-200 flex flex-col gap-1">
          <span>Pontos</span>
          <input className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100" type="number" value={form.points} onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))} />
        </label>
        <label className="text-sm text-secondary-200 flex flex-col gap-1">
          <span>Vencimento</span>
          <input className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </label>
        <label className="text-sm text-secondary-200 flex flex-col gap-1 sm:col-span-2">
          <span>Anexo (opcional)</span>
          <input className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100" type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] || null }))} />
        </label>
        <div className="sm:col-span-2">
          <button className="px-4 py-2.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60" type="submit" disabled={submitting}>
            {submitting ? 'Salvando…' : 'Adicionar multa'}
          </button>
        </div>
      </form>

      <FineList />
    </div>
  )
}

function FineList() {
  const vehicles = useAppStore((s) => s.vehicles)
  const fines = useAppStore((s) => s.fines)
  const updateFine = useAppStore((s) => s.updateFine)
  const removeFine = useAppStore((s) => s.removeFine)
  const addToast = useAppStore((s) => s.addToast)

  const [filterVehicleId, setFilterVehicleId] = useState('')
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const list = useMemo(() => {
    let arr = filterVehicleId ? fines.filter((f) => f.vehicleId === filterVehicleId) : fines
    if (search) {
      const q = search.toLowerCase()
      arr = arr.filter((f) => (f.description || '').toLowerCase().includes(q))
    }
    return arr.sort((a, b) => {
      const ta = a.dueDate ? new Date(a.dueDate).getTime() : 0
      const tb = b.dueDate ? new Date(b.dueDate).getTime() : 0
      return tb - ta
    })
  }, [fines, filterVehicleId, search])

  if (!fines.length) return <EmptyState title="Nenhuma multa" description="Registre suas multas para controle de pontos e valores." icon="priority_high" />

  return (
    <div className="space-y-4">
      <FilterBar
        vehicleOptions={[{ value: '', label: 'Todos os veículos' }, ...vehicles.map((v) => ({ value: v.vehicleId, label: v.name || v.model || v.plate || v.vehicleId }))]}
        vehicleValue={filterVehicleId}
        onVehicleChange={setFilterVehicleId}
        searchValue={search}
        onSearchChange={(val) => setSearch(val)}
      />

      <ul className="glass-card rounded-2xl p-5 divide-y divide-dark-100">
        {list.map((f) => {
          const dueText = f.dueDate ? new Date(f.dueDate).toLocaleDateString() : '—'
          const overdue = f.dueDate ? new Date(f.dueDate).getTime() < Date.now() : false
          const valueText = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(f.value || 0)
          return (
            <li key={f.fineId} className="py-3 flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${overdue ? 'bg-red-500' : 'bg-amber-500'} flex items-center justify-center text-white`}>
                  <span className="material-icons text-sm">priority_high</span>
                </div>
                <div>
                  <div className="text-sm text-white font-medium">{f.description || 'Multa'}</div>
                  <div className="text-xs text-secondary-300">Valor: {valueText} · Pontos: {f.points || 0} · Vencimento: {dueText}</div>
                  {f.attachmentUrl && (
                    <a className="text-xs text-sky-400 underline" href={f.attachmentUrl} target="_blank" rel="noreferrer">Ver anexo</a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 rounded-md text-xs bg-dark-100 text-secondary-200 hover:bg-dark-200" onClick={() => updateFine(f.fineId, { description: f.description })}>Editar</button>
                <button className="px-2 py-1 rounded-md text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30" onClick={() => setConfirmDeleteId(f.fineId)}>Remover</button>
              </div>
            </li>
          )
        })}
      </ul>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Remover multa"
        description="Essa ação não pode ser desfeita."
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          removeFine(confirmDeleteId)
          setConfirmDeleteId(null)
          addToast({ type: 'success', message: 'Multa removida.' })
        }}
      />
    </div>
  )
}