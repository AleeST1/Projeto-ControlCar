import { useMemo, useState, useEffect } from 'react'
import EmptyState from '../components/EmptyState'
import { useAppStore } from '../store/appStore'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import FilterBar from '../components/FilterBar'

export default function Trips() {
  const vehicles = useAppStore((s) => s.vehicles)
  const addTrip = useAppStore((s) => s.addTrip)
  const addToast = useAppStore((s) => s.addToast)
  const [form, setForm] = useState({ vehicleId: '', title: '', destination: '', startDate: '', endDate: '', plannedDistance: '', budget: '', notes: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function validateTripForm(payload) {
    const errs = {}
    const title = (payload.title || '').trim()
    if (!payload.vehicleId) errs.vehicleId = 'Selecione um veículo'
    if (!title) errs.title = 'Título é obrigatório'
    else if (title.length < 3) errs.title = 'Título deve ter ao menos 3 caracteres'
    if (!payload.startDate) errs.startDate = 'Data de início é obrigatória'
    if (payload.endDate && payload.startDate) {
      const sd = new Date(payload.startDate)
      const ed = new Date(payload.endDate)
      if (ed < sd) errs.endDate = 'Fim não pode ser antes do início'
    }
    if (payload.plannedDistance !== '' && payload.plannedDistance != null) {
      const v = Number(payload.plannedDistance)
      if (Number.isNaN(v) || v < 0) errs.plannedDistance = 'Distância deve ser número positivo'
    }
    if (payload.budget !== '' && payload.budget != null) {
      const v = Number(payload.budget)
      if (Number.isNaN(v) || v < 0) errs.budget = 'Orçamento deve ser número positivo'
    }
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const v = validateTripForm(form)
    setErrors(v)
    if (Object.keys(v).length > 0) {
      addToast({ type: 'error', message: 'Verifique os erros no formulário' })
      return
    }
    setSubmitting(true)
    try {
      addTrip({
        vehicleId: form.vehicleId,
        title: form.title.trim(),
        destination: form.destination.trim(),
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        plannedDistance: form.plannedDistance ? Number(form.plannedDistance) : null,
        budget: form.budget ? Number(form.budget) : null,
        notes: form.notes.trim(),
        tasks: [],
      })
      setForm({ vehicleId: '', title: '', destination: '', startDate: '', endDate: '', plannedDistance: '', budget: '', notes: '' })
      setErrors({})
      addToast({ type: 'success', message: 'Viagem criada com sucesso' })
    } catch (err) {
      console.error('Erro ao criar viagem:', err)
      addToast({ type: 'error', message: 'Erro ao criar viagem' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Viagens" subtitle="Planeje e acompanhe suas viagens." />

      <form id="add-trip" onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Veículo"
          value={form.vehicleId}
          onChange={(v) => { const next = { ...form, vehicleId: v }; setForm(next); setErrors(validateTripForm(next)) }}
          options={vehicles.map((v) => ({ value: v.vehicleId, label: `${v.model} ${v.year} — ${v.plate}` }))}
          required
          error={errors.vehicleId}
        />
        <Input label="Título" value={form.title} onChange={(v) => { const next = { ...form, title: v }; setForm(next); setErrors(validateTripForm(next)) }} required error={errors.title} />
        <Input label="Destino" value={form.destination} onChange={(v) => { const next = { ...form, destination: v }; setForm(next); setErrors(validateTripForm(next)) }} />
        <Input label="Início" type="date" value={form.startDate} onChange={(v) => { const next = { ...form, startDate: v }; setForm(next); setErrors(validateTripForm(next)) }} required error={errors.startDate} />
        <Input label="Fim (opcional)" type="date" value={form.endDate} onChange={(v) => { const next = { ...form, endDate: v }; setForm(next); setErrors(validateTripForm(next)) }} error={errors.endDate} />
        <Input label="Distância planejada (km)" type="number" value={form.plannedDistance} onChange={(v) => { const next = { ...form, plannedDistance: v }; setForm(next); setErrors(validateTripForm(next)) }} error={errors.plannedDistance} />
        <Input label="Orçamento (R$)" type="number" value={form.budget} onChange={(v) => { const next = { ...form, budget: v }; setForm(next); setErrors(validateTripForm(next)) }} error={errors.budget} />
        <Textarea label="Notas" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        <div className="sm:col-span-2">
          <button className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60" disabled={submitting}>
            {submitting ? 'Criando…' : 'Criar viagem'}
          </button>
        </div>
      </form>

      <TripList />
    </div>
  )
}

function TripList() {
  const vehicles = useAppStore((s) => s.vehicles)
  const fuelings = useAppStore((s) => s.fuelings)
  const trips = useAppStore((s) => s.trips)
  const updateTrip = useAppStore((s) => s.updateTrip)
  const toggleTrip = useAppStore((s) => s.toggleTrip)
  const removeTrip = useAppStore((s) => s.removeTrip)
  const addReminder = useAppStore((s) => s.addReminder)
  const addToast = useAppStore((s) => s.addToast)
  const [filterVehicleId, setFilterVehicleId] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', destination: '', startDate: '', endDate: '', plannedDistance: '', budget: '', notes: '' })
  const [editErrors, setEditErrors] = useState({})

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(id)
  }, [])

  const list = useMemo(() => {
    let arr = filterVehicleId ? trips.filter((t) => t.vehicleId === filterVehicleId) : trips
    const fromT = fromDate ? new Date(fromDate).getTime() : -Infinity
    const toT = toDate ? new Date(toDate).getTime() : Infinity
    arr = arr.filter((t) => {
      const sd = t.startDate ? new Date(t.startDate).getTime() : 0
      return sd >= fromT && sd <= toT
    })
    const q = search.trim().toLowerCase()
    if (q) {
      arr = arr.filter((t) => {
        const v = vehicles.find((x) => x.vehicleId === t.vehicleId)
        const vehicleLabel = v ? `${v.model} ${v.plate}`.toLowerCase() : ''
        return (t.title || '').toLowerCase().includes(q) || (t.destination || '').toLowerCase().includes(q) || vehicleLabel.includes(q)
      })
    }
    arr = arr.slice().sort((a, b) => {
      const pick = (obj) => {
        switch (sortBy) {
          case 'date': return new Date(obj.startDate || 0).getTime()
          case 'budget': return Number(obj.budget || 0)
          case 'totalCost': {
            const { totalCost } = computeSummary(obj)
            return Number(totalCost || 0)
          }
          default: return new Date(obj.startDate || 0).getTime()
        }
      }
      const A = pick(a)
      const B = pick(b)
      const cmp = A < B ? -1 : A > B ? 1 : 0
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return arr
  }, [trips, filterVehicleId, fromDate, toDate, search, sortBy, sortOrder, vehicles, fuelings])

  function computeSummary(t) {
    const start = t.startDate ? new Date(t.startDate).getTime() : 0
    const end = t.endDate ? new Date(t.endDate).getTime() : Number.MAX_SAFE_INTEGER
    const items = fuelings.filter((f) => f.vehicleId === t.vehicleId && new Date(f.date).getTime() >= start && new Date(f.date).getTime() <= end)
    const totalCost = items.reduce((sum, f) => sum + (f.totalCost ?? 0), 0)
    const totalLiters = items.reduce((sum, f) => sum + (f.liters ?? 0), 0)
    return { totalCost, totalLiters }
  }

  function startEdit(t) {
    setEditingId(t.tripId)
    setEditForm({
      title: t.title || '',
      destination: t.destination || '',
      startDate: t.startDate ? new Date(t.startDate).toISOString().slice(0,10) : '',
      endDate: t.endDate ? new Date(t.endDate).toISOString().slice(0,10) : '',
      plannedDistance: t.plannedDistance != null ? String(t.plannedDistance) : '',
      budget: t.budget != null ? String(t.budget) : '',
      notes: t.notes || '',
    })
    setEditErrors({})
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({ title: '', destination: '', startDate: '', endDate: '', plannedDistance: '', budget: '', notes: '' })
  }

  async function saveEdit(tripId) {
    const v = {
      vehicleId: trips.find((x)=>x.tripId===tripId)?.vehicleId || '',
      title: editForm.title,
      destination: editForm.destination,
      startDate: editForm.startDate,
      endDate: editForm.endDate,
      plannedDistance: editForm.plannedDistance,
      budget: editForm.budget,
      notes: editForm.notes,
    }
    const errs = validateTripForm(v)
    setEditErrors(errs)
    if (Object.keys(errs).length > 0) {
      addToast({ type: 'error', message: 'Corrija os erros antes de salvar' })
      return
    }
    setEditSaving(true)
    try {
      const updates = {
        title: editForm.title.trim(),
        destination: editForm.destination.trim(),
        startDate: new Date(editForm.startDate).toISOString(),
        endDate: editForm.endDate ? new Date(editForm.endDate).toISOString() : null,
        plannedDistance: editForm.plannedDistance ? Number(editForm.plannedDistance) : null,
        budget: editForm.budget ? Number(editForm.budget) : null,
        notes: editForm.notes.trim(),
      }
      updateTrip(tripId, updates)
      addToast({ type: 'success', message: 'Viagem atualizada' })
      cancelEdit()
    } catch (err) {
      console.error('Erro ao atualizar viagem:', err)
      addToast({ type: 'error', message: 'Erro ao atualizar viagem' })
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium">Planejadas</h3>

      <FilterBar
        vehicleOptions={[{ value: '', label: 'Todos' }, ...vehicles.map((v) => ({ value: v.vehicleId, label: `${v.model} ${v.plate}` }))]}
        vehicleValue={filterVehicleId}
        onVehicleChange={setFilterVehicleId}
        searchValue={search}
        onSearchChange={setSearch}
        advancedChildren={(
          <>
            <Select
              label="Ordenar por"
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'date', label: 'Data' },
                { value: 'totalCost', label: 'Custo total' },
                { value: 'budget', label: 'Orçamento' },
              ]}
            />
            <Select
              label="Ordem"
              value={sortOrder}
              onChange={setSortOrder}
              options={[
                { value: 'desc', label: 'Descendente' },
                { value: 'asc', label: 'Ascendente' },
              ]}
            />
            <Input label="De (data)" type="date" value={fromDate} onChange={setFromDate} />
            <Input label="Até (data)" type="date" value={toDate} onChange={setToDate} />
          </>
        )}
        actions={(
          <>
            <button className="px-3 py-1.5 rounded-lg bg-dark-200 border border-dark-300 text-xs hover:bg-dark-300" onClick={() => exportTripsCSV(list, vehicles)}>Exportar CSV</button>
            <button className="px-3 py-1.5 rounded-lg bg-dark-200 border border-dark-300 text-xs hover:bg-dark-300" onClick={() => exportTripsPDF(list, vehicles)}>Exportar PDF</button>
          </>
        )}
      />
      {list.length === 0 && (
        <EmptyState
          icon="map"
          title="Nenhuma viagem cadastrada"
          description="Crie suas viagens com destino, período e orçamento para acompanhar custos."
          actionText="Adicionar viagem"
          to="#add-trip"
        />
      )}
      {loading ? (
        [1,2,3].map((i) => (
          <div key={`trip-skeleton-${i}`} className="glass-card loading p-4 rounded-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="h-5 bg-dark-300 rounded w-48" />
                <div className="h-3 bg-dark-300 rounded w-32 mt-2" />
                <div className="h-3 bg-dark-300 rounded w-52 mt-2" />
                <div className="h-3 bg-dark-300 rounded w-44 mt-2" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 bg-dark-300 rounded w-24" />
                <div className="h-8 bg-dark-300 rounded w-20" />
                <div className="h-8 bg-dark-300 rounded w-20" />
              </div>
            </div>
            <div className="h-2 bg-dark-300 rounded w-full mt-3" />
          </div>
        ))
      ) : list.map((t) => {
        const v = vehicles.find((v) => v.vehicleId === t.vehicleId)
        const { totalCost, totalLiters } = computeSummary(t)
        const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
        const budgetPct = t.budget ? Math.min(100, Math.round(((totalCost || 0) / (t.budget || 1)) * 100)) : null
        const daysToStart = t.startDate ? Math.ceil((new Date(t.startDate).getTime() - Date.now()) / (1000*60*60*24)) : null
        const isUpcoming = daysToStart != null && daysToStart >= 0 && daysToStart <= 7 && !t.isCompleted
        return (
          <div key={t.tripId} className={`glass-card rounded-2xl p-5 flex flex-col gap-3`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-white">{t.title}</div>
                <div className="text-xs text-secondary-300">{v ? `${v.model} ${v.plate}` : 'Veículo'} {t.destination ? `• ${t.destination}` : ''}</div>
                <div className="text-xs text-secondary-400 mt-1">
                  {t.startDate ? `Início: ${new Date(t.startDate).toLocaleDateString()}` : ''}
                  {t.endDate ? ` • Fim: ${new Date(t.endDate).toLocaleDateString()}` : ''}
                </div>
                {(t.plannedDistance || t.budget) && (
                  <div className="text-xs text-secondary-400 mt-1">
                    {t.plannedDistance ? `Plano: ${t.plannedDistance} km` : ''}
                    {t.plannedDistance && t.budget ? ' • ' : ''}
                    {t.budget ? `Orçamento: ${currency.format(t.budget)}` : ''}
                  </div>
                )}
                <div className="text-sm text-secondary-200 mt-2">Custos no período: {currency.format(totalCost)} • Litros: {totalLiters.toFixed(2)}</div>
                {typeof budgetPct === 'number' && (
                  <BudgetBar percent={budgetPct} totalCost={totalCost} budget={t.budget} />
                )}
                {t.notes && <div className="text-xs text-secondary-400 mt-1">{t.notes}</div>}
              </div>
              <div className="flex items-center gap-2">
                {editingId === t.tripId ? (
                  <>
                    <button className="px-3 py-1.5 rounded-lg text-sm bg-green-600 text-white hover:bg-green-700 shadow-sm disabled:opacity-60" disabled={editSaving} onClick={() => saveEdit(t.tripId)}>{editSaving ? 'Salvando…' : 'Salvar'}</button>
                    <button className="px-3 py-1.5 rounded-lg text-sm bg-dark-200 text-white hover:bg-dark-300 border border-dark-300" onClick={cancelEdit}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button className={`px-3 py-1.5 rounded-lg text-sm shadow-sm transition-colors ${t.isCompleted ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-yellow-500 text-black hover:bg-yellow-600'}`} onClick={() => { toggleTrip(t.tripId); addToast({ type: 'success', message: 'Status da viagem atualizado' }) }}>
                      {t.isCompleted ? 'Concluída' : 'Em planejamento'}
                    </button>
                    <button className="px-3 py-1.5 rounded-lg text-sm bg-primary-600 text-white hover:bg-primary-700 shadow-sm" onClick={() => startEdit(t)}>Editar</button>
                    <button className="px-3 py-1.5 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm" onClick={() => setConfirmDeleteId(t.tripId)}>Excluir</button>
                  </>
                )}
              </div>
            </div>

            {editingId === t.tripId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Título" value={editForm.title} onChange={(v) => { const next = { ...editForm, title: v }; setEditForm(next); setEditErrors(validateTripForm({ ...next, vehicleId: t.vehicleId })) }} required error={editErrors.title} />
                <Input label="Destino" value={editForm.destination} onChange={(v) => { const next = { ...editForm, destination: v }; setEditForm(next); setEditErrors(validateTripForm({ ...next, vehicleId: t.vehicleId })) }} />
                <Input label="Início" type="date" value={editForm.startDate} onChange={(v) => { const next = { ...editForm, startDate: v }; setEditForm(next); setEditErrors(validateTripForm({ ...next, vehicleId: t.vehicleId })) }} required error={editErrors.startDate} />
                <Input label="Fim (opcional)" type="date" value={editForm.endDate} onChange={(v) => { const next = { ...editForm, endDate: v }; setEditForm(next); setEditErrors(validateTripForm({ ...next, vehicleId: t.vehicleId })) }} error={editErrors.endDate} />
                <Input label="Distância planejada (km)" type="number" value={editForm.plannedDistance} onChange={(v) => { const next = { ...editForm, plannedDistance: v }; setEditForm(next); setEditErrors(validateTripForm({ ...next, vehicleId: t.vehicleId })) }} error={editErrors.plannedDistance} />
                <Input label="Orçamento (R$)" type="number" value={editForm.budget} onChange={(v) => { const next = { ...editForm, budget: v }; setEditForm(next); setEditErrors(validateTripForm({ ...next, vehicleId: t.vehicleId })) }} error={editErrors.budget} />
                <Textarea label="Notas" value={editForm.notes} onChange={(v) => setEditForm({ ...editForm, notes: v })} />
              </div>
            )}

            {/* Sugestões de manutenções para viagens próximas */}
            {isUpcoming && (
              <div className="rounded-lg bg-dark-200 border border-dark-300 p-3 text-xs text-secondary-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-icons text-base text-amber-400">event_available</span>
                  <span>Viagem começa em {daysToStart} {daysToStart === 1 ? 'dia' : 'dias'}. Sugestões rápidas:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { type: 'maintenance', description: 'Verificar óleo', icon: 'oil_barrel' },
                    { type: 'maintenance', description: 'Checar pneus/calibragem', icon: 'tire_repair' },
                    { type: 'document', description: 'Revisar documentos/seguro', icon: 'assignment' },
                    { type: 'maintenance', description: 'Montar kit emergência', icon: 'medical_services' },
                  ].map((sug, idx) => (
                    <button
                      key={idx}
                      className="px-2 py-1 rounded-md bg-dark-300 border border-dark-400 hover:bg-dark-400 flex items-center gap-1"
                      onClick={() => {
                        addReminder({
                          vehicleId: t.vehicleId,
                          type: sug.type,
                          description: sug.description,
                          dueDate: t.startDate ? new Date(t.startDate).toISOString() : null,
                        })
                        addToast({ type: 'success', message: 'Manutenção sugerida criada' })
                      }}
                      title={sug.description}
                    >
                      <span className="material-icons text-[14px] text-secondary-300">{sug.icon}</span>
                      <span>{sug.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist de tarefas da viagem */}
            <TripChecklist trip={t} onUpdate={updateTrip} addToast={addToast} />

            <ConfirmDialog
              open={!!confirmDeleteId}
              title="Confirmar exclusão"
              message="Tem certeza que deseja excluir esta viagem? Esta ação é irreversível."
              confirmText="Excluir"
              cancelText="Cancelar"
              onCancel={() => setConfirmDeleteId(null)}
              onConfirm={() => {
                if (!confirmDeleteId) return
                removeTrip(confirmDeleteId)
                addToast({ type: 'success', message: 'Viagem removida' })
                setConfirmDeleteId(null)
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', required, error }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-secondary-300">{label}</span>
      <input
        className={`rounded-lg border ${error ? 'border-red-500' : 'border-dark-100'} bg-dark-300 px-3 py-2 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none`}
        value={value}
        type={type}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </label>
  )
}

function Select({ label, value, onChange, options, required, error }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-secondary-300">{label}</span>
      <select
        className={`rounded-lg border ${error ? 'border-red-500' : 'border-dark-100'} bg-dark-300 px-3 py-2 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none`}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecione...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </label>
  )
}

function Textarea({ label, value, onChange, required, error }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
      <span className="text-secondary-300">{label}</span>
      <textarea
        className={`rounded-lg border ${error ? 'border-red-500' : 'border-dark-100'} bg-dark-300 px-3 py-2 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none min-h-[80px]`}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </label>
  )
}

function BudgetBar({ percent, totalCost, budget }) {
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const over = percent > 100
  const pct = Math.min(percent, 100)
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[11px] text-secondary-400 mb-1">
        <span>Orçamento consumido</span>
        <span>{pct}% ({currency.format(totalCost)} / {currency.format(budget)})</span>
      </div>
      <div className="w-full h-2 rounded bg-dark-200 overflow-hidden">
        <div className={`h-2 ${over ? 'bg-red-500' : 'bg-primary-500'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
      </div>
      {over && <div className="text-[11px] text-red-400 mt-1">Orçamento ultrapassado</div>}
    </div>
  )
}

function TripChecklist({ trip, onUpdate, addToast }) {
  const [newTask, setNewTask] = useState('')
  const tasks = Array.isArray(trip.tasks) ? trip.tasks : []
  function toggleTask(id) {
    const next = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    onUpdate(trip.tripId, { tasks: next })
  }
  function removeTask(id) {
    const next = tasks.filter((t) => t.id !== id)
    onUpdate(trip.tripId, { tasks: next })
    addToast({ type: 'success', message: 'Tarefa removida' })
  }
  function addTask() {
    const label = newTask.trim()
    if (!label) return
    const item = { id: crypto.randomUUID(), label, done: false }
    onUpdate(trip.tripId, { tasks: [...tasks, item] })
    setNewTask('')
    addToast({ type: 'success', message: 'Tarefa adicionada' })
  }
  return (
    <div className="rounded-lg bg-dark-200 border border-dark-300 p-3">
      <div className="text-xs text-secondary-300 mb-2 flex items-center gap-2">
        <span className="material-icons text-base text-secondary-400">checklist</span>
        <span>Checklist da viagem</span>
      </div>
      {tasks.length === 0 ? (
        <div className="text-[12px] text-secondary-400">Nenhuma tarefa ainda. Adicione abaixo itens como "Levar documentos", "Checar água do radiador", etc.</div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((i) => (
            <li key={i.id} className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!i.done} onChange={() => toggleTask(i.id)} />
                <span className={`${i.done ? 'line-through text-secondary-500' : 'text-secondary-200'}`}>{i.label}</span>
              </label>
              <button className="px-2 py-1 rounded-md text-[12px] bg-red-600 text-white hover:bg-red-700" onClick={() => removeTask(i.id)}>Remover</button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center gap-2">
        <input
          className="flex-1 rounded-md bg-dark-300 border border-dark-400 px-3 py-1.5 text-sm text-white outline-none focus:border-primary-500"
          placeholder="Nova tarefa"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
        />
        <button className="px-3 py-1.5 rounded-md bg-primary-600 text-white text-sm hover:bg-primary-700" onClick={addTask}>Adicionar</button>
      </div>
    </div>
  )
}

function exportTripsCSV(list, vehicles) {
  const rows = []
  rows.push(['ID', 'Título', 'Veículo', 'Destino', 'Início', 'Fim', 'Distância planejada (km)', 'Orçamento (R$)', 'Concluída'].join(','))
  list.forEach((t) => {
    const v = vehicles.find((x) => x.vehicleId === t.vehicleId)
    const cols = [
      t.tripId,
      (t.title || '').replace(/"/g, '"'),
      v ? `${v.model} ${v.plate}` : '',
      (t.destination || '').replace(/"/g, '"'),
      t.startDate ? new Date(t.startDate).toLocaleDateString() : '',
      t.endDate ? new Date(t.endDate).toLocaleDateString() : '',
      t.plannedDistance != null ? String(t.plannedDistance) : '',
      t.budget != null ? String(t.budget) : '',
      t.isCompleted ? 'Sim' : 'Não',
    ]
    rows.push(cols.map((c) => (/[,\n"]/.test(c) ? `"${c}"` : c)).join(','))
  })
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `viagens_${new Date().toISOString().slice(0,10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportTripsPDF(list, vehicles) {
  const w = window.open('', '_blank')
  if (!w) return
  const css = `
    body { font-family: Arial, sans-serif; padding: 16px; }
    h1 { font-size: 18px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
    th { background: #f5f5f5; }
  `
  const rows = list.map((t) => {
    const v = vehicles.find((x) => x.vehicleId === t.vehicleId)
    return `<tr>
      <td>${t.title || ''}</td>
      <td>${v ? `${v.model} ${v.plate}` : ''}</td>
      <td>${t.destination || ''}</td>
      <td>${t.startDate ? new Date(t.startDate).toLocaleDateString() : ''}</td>
      <td>${t.endDate ? new Date(t.endDate).toLocaleDateString() : ''}</td>
      <td>${t.plannedDistance != null ? t.plannedDistance : ''}</td>
      <td>${t.budget != null ? t.budget : ''}</td>
      <td>${t.isCompleted ? 'Sim' : 'Não'}</td>
    </tr>`
  }).join('')
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Viagens</title><style>${css}</style></head><body>`)
  w.document.write(`<h1>Relatório de Viagens</h1>`)
  w.document.write(`<table><thead><tr><th>Título</th><th>Veículo</th><th>Destino</th><th>Início</th><th>Fim</th><th>Distância</th><th>Orçamento</th><th>Concluída</th></tr></thead><tbody>${rows}</tbody></table>`)
  w.document.write(`</body></html>`)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); w.close() }, 200)
}