import { useState, useEffect } from 'react'
import EmptyState from '../components/EmptyState'
import { useAppStore } from '../store/appStore'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'

export default function Fuelings() {
  const vehicles = useAppStore((s) => s.vehicles)
  const addFueling = useAppStore((s) => s.addFueling)
  const updateFueling = useAppStore((s) => s.updateFueling)
  const removeFueling = useAppStore((s) => s.removeFueling)
  const addToast = useAppStore((s) => s.addToast)
  const [form, setForm] = useState({ vehicleId: '', date: '', odometer: '', liters: '', totalCost: '', station: '' })
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.vehicleId || !form.date || !form.liters || !form.totalCost) {
      addToast({ type: 'error', message: 'Preencha os campos obrigatórios' })
      return
    }
    setSubmitting(true)
    try {
      addFueling({
        vehicleId: form.vehicleId,
        date: new Date(form.date).toISOString(),
        odometer: Number(form.odometer || 0),
        liters: Number(form.liters),
        totalCost: Number(form.totalCost),
        station: form.station.trim(),
      })
      setForm({ vehicleId: '', date: '', odometer: '', liters: '', totalCost: '', station: '' })
      addToast({ type: 'success', message: 'Abastecimento registrado com sucesso' })
    } catch (err) {
      console.error('Erro ao registrar abastecimento:', err)
      addToast({ type: 'error', message: 'Erro ao registrar abastecimento' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Abastecimentos" subtitle="Registre abastecimentos e acompanhe consumo e custos." />

      <form id="add-fueling" onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Veículo"
          value={form.vehicleId}
          onChange={(v) => setForm({ ...form, vehicleId: v })}
          options={vehicles.map((v) => ({ value: v.vehicleId, label: `${v.model} ${v.year} — ${v.plate}` }))}
          required
        />
        <Input label="Data" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} required />
        <Input label="Odômetro" type="number" value={form.odometer} onChange={(v) => setForm({ ...form, odometer: v })} />
        <Input label="Litros" type="number" value={form.liters} onChange={(v) => setForm({ ...form, liters: v })} required />
        <Input label="Custo total (R$)" type="number" value={form.totalCost} onChange={(v) => setForm({ ...form, totalCost: v })} required />
        <Input label="Posto" value={form.station} onChange={(v) => setForm({ ...form, station: v })} />
        <div className="sm:col-span-2">
          <button className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60" disabled={submitting}>{submitting ? 'Salvando…' : 'Registrar abastecimento'}</button>
        </div>
      </form>

      <FuelingList />
    </div>
  )
}

function FuelingList() {
  const vehicles = useAppStore((s) => s.vehicles)
  const fuelings = useAppStore((s) => s.fuelings)
  const updateFueling = useAppStore((s) => s.updateFueling)
  const removeFueling = useAppStore((s) => s.removeFueling)
  const addToast = useAppStore((s) => s.addToast)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ date: '', odometer: '', liters: '', totalCost: '', station: '' })
  const [filterVehicleId, setFilterVehicleId] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [searchStation, setSearchStation] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(id)
  }, [])

  function startEdit(f) {
    const dateStr = new Date(f.date).toISOString().slice(0, 10)
    setEditForm({
      date: dateStr,
      odometer: String(f.odometer ?? ''),
      liters: String(f.liters ?? ''),
      totalCost: String(f.totalCost ?? ''),
      station: f.station ?? '',
    })
    setEditingId(f.fuelingId)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({ date: '', odometer: '', liters: '', totalCost: '', station: '' })
  }

  function saveEdit(fuelingId) {
    if (!editForm.date || !editForm.liters || !editForm.totalCost) return
    setEditSaving(true)
    try {
      updateFueling(fuelingId, {
        date: new Date(editForm.date).toISOString(),
        odometer: Number(editForm.odometer || 0),
        liters: Number(editForm.liters),
        totalCost: Number(editForm.totalCost),
        station: editForm.station.trim(),
      })
      addToast({ type: 'success', message: 'Abastecimento atualizado' })
      cancelEdit()
    } catch (err) {
      console.error('Erro ao atualizar abastecimento:', err)
      addToast({ type: 'error', message: 'Erro ao atualizar abastecimento' })
    } finally {
      setEditSaving(false)
    }
  }
  const list = (filterVehicleId ? fuelings.filter((x) => x.vehicleId === filterVehicleId) : fuelings)
    .filter((f) => (searchStation ? (f.station || '').toLowerCase().includes(searchStation.toLowerCase()) : true))
    .filter((f) => {
      const t = new Date(f.date || 0).getTime()
      const fromT = fromDate ? new Date(fromDate).getTime() : -Infinity
      const toT = toDate ? new Date(toDate).getTime() : Infinity
      return t >= fromT && t <= toT
    })
    .slice()
    .sort((a, b) => {
      const getDate = (d) => new Date(d || 0).getTime()
      const pick = (obj) => {
        switch (sortBy) {
          case 'date': return getDate(obj.date)
          case 'liters': return Number(obj.liters || 0)
          case 'totalCost': return Number(obj.totalCost || 0)
          case 'pricePerLiter': return Number(obj.pricePerLiter || 0)
          default: return getDate(obj.date)
        }
      }
      const A = pick(a)
      const B = pick(b)
      const cmp = A < B ? -1 : A > B ? 1 : 0
      return sortOrder === 'asc' ? cmp : -cmp
    })
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium">Registros</h3>
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Filtrar por veículo"
            value={filterVehicleId}
            onChange={(v) => setFilterVehicleId(v)}
            options={[{ value: '', label: 'Todos' }, ...vehicles.map((v) => ({ value: v.vehicleId, label: `${v.model} ${v.plate}` }))]}
          />
          <Input
            label="Buscar posto"
            value={searchStation}
            onChange={(v) => setSearchStation(v)}
          />
          <button
            className="px-3 py-2 rounded-lg text-sm bg-dark-200 border border-dark-300 hover:bg-dark-300"
            type="button"
            onClick={() => setShowAdvancedFilters((s) => !s)}
          >
            {showAdvancedFilters ? 'Ocultar filtros avançados' : 'Mostrar filtros avançados'}
          </button>
        </div>
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Select
              label="Ordenar por"
              value={sortBy}
              onChange={(v) => setSortBy(v)}
              options={[
                { value: 'date', label: 'Data' },
                { value: 'liters', label: 'Litros' },
                { value: 'totalCost', label: 'Custo total' },
                { value: 'pricePerLiter', label: 'Preço/L' },
              ]}
            />
            <Select
              label="Ordem"
              value={sortOrder}
              onChange={(v) => setSortOrder(v)}
              options={[
                { value: 'desc', label: 'Descendente' },
                { value: 'asc', label: 'Ascendente' },
              ]}
            />
            <Input label="De (data)" type="date" value={fromDate} onChange={setFromDate} />
            <Input label="Até (data)" type="date" value={toDate} onChange={setToDate} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <button className="px-3 py-1.5 rounded-lg bg-dark-200 border border-dark-300 text-xs hover:bg-dark-300" onClick={() => exportFuelingsCSV(list, vehicles)}>Exportar CSV</button>
        <button className="px-3 py-1.5 rounded-lg bg-dark-200 border border-dark-300 text-xs hover:bg-dark-300" onClick={() => exportFuelingsXLS(list, vehicles)}>Exportar Excel</button>
      </div>
      {list.length === 0 && (
        <EmptyState 
          icon="local_gas_station" 
          title="Nenhum abastecimento encontrado"
          description="Registre seu primeiro abastecimento para acompanhar consumo e custos."
          actionText="Registrar abastecimento"
          to="#add-fueling"
        />
      )}
      {loading ? (
        [1,2,3].map((i) => (
          <div key={`skeleton-${i}`} className="glass-card loading p-4 rounded-2xl">
            <div className="flex items-start justify-between">
              <div className="h-5 bg-dark-300 rounded w-40" />
              <div className="flex items-center gap-2">
                <div className="h-8 bg-dark-300 rounded w-20" />
                <div className="h-8 bg-dark-300 rounded w-20" />
              </div>
            </div>
            <div className="h-3 bg-dark-300 rounded w-3/4 mt-2" />
            <div className="h-3 bg-dark-300 rounded w-2/3 mt-2" />
            <div className="h-3 bg-dark-300 rounded w-1/3 mt-2" />
          </div>
        ))
      ) : list.map((f) => {
        const v = vehicles.find((v) => v.vehicleId === f.vehicleId)
        return (
          <div key={f.fuelingId} className="glass-card rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="font-medium">{v ? `${v.model} ${v.plate}` : 'Veículo'}</div>
              <div className="flex items-center gap-2">
                {editingId === f.fuelingId ? (
                  <>
                    <button className="px-3 py-1.5 rounded-lg text-sm bg-green-600 text-white hover:bg-green-700 shadow-sm disabled:opacity-60" disabled={editSaving} onClick={() => saveEdit(f.fuelingId)}>{editSaving ? 'Salvando…' : 'Salvar'}</button>
                    <button className="px-3 py-1.5 rounded-lg text-sm bg-dark-200 text-white hover:bg-dark-300 border border-dark-300" onClick={cancelEdit}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button className="px-3 py-1.5 rounded-lg text-sm bg-primary-600 text-white hover:bg-primary-700 shadow-sm" onClick={() => startEdit(f)}>Editar</button>
                    <button className="px-3 py-1.5 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm" onClick={() => setConfirmDeleteId(f.fuelingId)}>Excluir</button>
                  </>
                )}
              </div>
            </div>

            {editingId === f.fuelingId ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Data" type="date" value={editForm.date} onChange={(v) => setEditForm({ ...editForm, date: v })} required />
                <Input label="Odômetro" type="number" value={editForm.odometer} onChange={(v) => setEditForm({ ...editForm, odometer: v })} />
                <Input label="Litros" type="number" value={editForm.liters} onChange={(v) => setEditForm({ ...editForm, liters: v })} required />
                <Input label="Custo total (R$)" type="number" value={editForm.totalCost} onChange={(v) => setEditForm({ ...editForm, totalCost: v })} required />
                <Input label="Posto" value={editForm.station} onChange={(v) => setEditForm({ ...editForm, station: v })} />
              </div>
            ) : (
              <>
                <div className="text-xs text-secondary-300">{new Date(f.date).toLocaleDateString()} • {f.station || 'Posto'}</div>
                <div className="text-sm text-secondary-200">Litros: {f.liters} • Custo: R$ {f.totalCost.toFixed(2)} • Preço/L: R$ {f.pricePerLiter.toFixed(2)}</div>
                {f.odometer > 0 && <div className="text-xs text-secondary-400">Odômetro: {f.odometer} km</div>}
              </>
            )}
          </div>
        )
      })}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Confirmar exclusão"
        message="Tem certeza que deseja excluir este abastecimento? Esta ação é irreversível."
        confirmText="Excluir"
        cancelText="Cancelar"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (!confirmDeleteId) return
          removeFueling(confirmDeleteId)
          addToast({ type: 'success', message: 'Abastecimento removido' })
          setConfirmDeleteId(null)
        }}
      />
    </div>
  )
}

function exportFuelingsCSV(list, vehicles) {
  const rows = []
  rows.push(['ID', 'Veículo', 'Data', 'Odômetro (km)', 'Litros', 'Custo total (R$)', 'Preço/L (R$)', 'Posto'].join(','))
  list.forEach((f) => {
    const v = vehicles.find((x) => x.vehicleId === f.vehicleId)
    const pricePerLiter = f.pricePerLiter != null ? Number(f.pricePerLiter) : (Number(f.liters || 0) > 0 ? Number(f.totalCost || 0) / Number(f.liters || 1) : '')
    const cols = [
      f.fuelingId,
      v ? `${v.model} ${v.plate}` : '',
      f.date ? new Date(f.date).toLocaleDateString('pt-BR') : '',
      f.odometer != null ? String(f.odometer) : '',
      f.liters != null ? String(f.liters) : '',
      f.totalCost != null ? String(f.totalCost) : '',
      pricePerLiter !== '' ? String(Number(pricePerLiter).toFixed(3)) : '',
      (f.station || '').replace(/"/g, '"'),
    ]
    rows.push(cols.map((c) => (/[\,\n\"]/.test(c) ? `"${c}"` : c)).join(','))
  })
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `abastecimentos_${new Date().toISOString().slice(0,10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportFuelingsXLS(list, vehicles) {
  const css = `
    table { border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 4px; }
  `
  const rowsHtml = list.map((f) => {
    const v = vehicles.find((x) => x.vehicleId === f.vehicleId)
    const pricePerLiter = f.pricePerLiter != null ? Number(f.pricePerLiter) : (Number(f.liters || 0) > 0 ? Number(f.totalCost || 0) / Number(f.liters || 1) : '')
    return `<tr>
      <td>${v ? `${v.model} ${v.plate}` : ''}</td>
      <td>${f.date ? new Date(f.date).toLocaleDateString('pt-BR') : ''}</td>
      <td>${f.odometer != null ? f.odometer : ''}</td>
      <td>${f.liters != null ? f.liters : ''}</td>
      <td>${f.totalCost != null ? f.totalCost : ''}</td>
      <td>${pricePerLiter !== '' ? Number(pricePerLiter).toFixed(3) : ''}</td>
      <td>${f.station || ''}</td>
    </tr>`
  }).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${css}</style></head><body>
    <table>
      <thead><tr><th>Veículo</th><th>Data</th><th>Odômetro (km)</th><th>Litros</th><th>Custo total (R$)</th><th>Preço/L (R$)</th><th>Posto</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </body></html>`
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `abastecimentos_${new Date().toISOString().slice(0,10)}.xls`
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
        className="rounded-lg border border-dark-100 bg-dark-700 px-3 py-2 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecione...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  )
}