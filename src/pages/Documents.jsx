import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '../store/appStore'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { uploadDocumentAttachment } from '../services/storage'
import PageHeader from '../components/PageHeader'
import FilterBar from '../components/FilterBar'

export default function Documents() {
  const vehicles = useAppStore((s) => s.vehicles)
  const documents = useAppStore((s) => s.documents)
  const addDocument = useAppStore((s) => s.addDocument)
  const updateDocument = useAppStore((s) => s.updateDocument)
  const removeDocument = useAppStore((s) => s.removeDocument)
  const addToast = useAppStore((s) => s.addToast)
  const currentUserId = useAppStore((s) => s.currentUserId)

  const [form, setForm] = useState({ vehicleId: '', type: 'IPVA', title: '', dueDate: '', notes: '', file: null })
  const [submitting, setSubmitting] = useState(false)

  const types = ['IPVA', 'CNH', 'CRLV', 'Seguro', 'Licenciamento', 'Outro']

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const documentId = crypto.randomUUID()
      let attachmentUrl = undefined
      if (form.file) {
        attachmentUrl = await uploadDocumentAttachment(currentUserId || 'offline', documentId, form.file)
      }
      const item = {
        documentId,
        vehicleId: form.vehicleId || null,
        type: form.type,
        title: form.title || form.type,
        dueDate: form.dueDate || null,
        attachmentUrl,
        notes: form.notes || '',
      }
      addDocument(item)
      setForm({ vehicleId: '', type: 'IPVA', title: '', dueDate: '', notes: '', file: null })
      addToast({ type: 'success', message: 'Documento adicionado.' })
    } catch (err) {
      console.error(err)
      addToast({ type: 'error', message: 'Falha ao adicionar documento.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader title="Documentos" subtitle="Organize IPVA, CNH, seguro e vencimentos em um só lugar." />
      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="text-sm text-secondary-200 flex flex-col gap-1">
          <span>Tipo</span>
          <select className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-secondary-200 flex flex-col gap-1">
          <span>Título</span>
          <input className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100" type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex.: IPVA 2025" />
        </label>
        <label className="text-sm text-secondary-200 flex flex-col gap-1">
          <span>Veículo (opcional)</span>
          <select className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100" value={form.vehicleId} onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}>
            <option value="">—</option>
            {vehicles.map((v) => (
              <option key={v.vehicleId} value={v.vehicleId}>{v.name || v.model || v.plate || v.vehicleId}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-secondary-200 flex flex-col gap-1">
          <span>Vencimento</span>
          <input className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </label>
        <label className="text-sm text-secondary-200 flex flex-col gap-1 sm:col-span-2">
          <span>Anexo (opcional)</span>
          <input className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100" type="file" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] || null }))} />
        </label>
        <label className="text-sm text-secondary-200 flex flex-col gap-1 sm:col-span-2">
          <span>Notas</span>
          <textarea className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </label>
        <div className="sm:col-span-2">
          <button className="px-4 py-2.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60" type="submit" disabled={submitting}>
            {submitting ? 'Salvando…' : 'Adicionar documento'}
          </button>
        </div>
      </form>

      <DocumentList />
    </div>
  )
}

function DocumentList() {
  const vehicles = useAppStore((s) => s.vehicles)
  const documents = useAppStore((s) => s.documents)
  const updateDocument = useAppStore((s) => s.updateDocument)
  const removeDocument = useAppStore((s) => s.removeDocument)
  const addToast = useAppStore((s) => s.addToast)

  const [filterVehicleId, setFilterVehicleId] = useState('')
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const list = useMemo(() => {
    let arr = filterVehicleId ? documents.filter((d) => d.vehicleId === filterVehicleId) : documents
    if (search) {
      const q = search.toLowerCase()
      arr = arr.filter((d) => (d.title || '').toLowerCase().includes(q) || (d.type || '').toLowerCase().includes(q))
    }
    return arr.sort((a, b) => {
      const ta = a.dueDate ? new Date(a.dueDate).getTime() : 0
      const tb = b.dueDate ? new Date(b.dueDate).getTime() : 0
      return tb - ta
    })
  }, [documents, filterVehicleId, search])

  if (!documents.length) return <EmptyState title="Nenhum documento" description="Adicione documentos como IPVA e CNH." icon="description" />

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
        {list.map((d) => {
          const dueText = d.dueDate ? new Date(d.dueDate).toLocaleDateString() : '—'
          const overdue = d.dueDate ? new Date(d.dueDate).getTime() < Date.now() : false
          return (
            <li key={d.documentId} className="py-3 flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${overdue ? 'bg-red-500' : 'bg-primary-500'} flex items-center justify-center text-white`}>
                  <span className="material-icons text-sm">description</span>
                </div>
                <div>
                  <div className="text-sm text-white font-medium">{d.title || d.type}</div>
                  <div className="text-xs text-secondary-300">Tipo: {d.type} · Vencimento: {dueText}</div>
                  {d.attachmentUrl && (
                    <a className="text-xs text-sky-400 underline" href={d.attachmentUrl} target="_blank" rel="noreferrer">Ver anexo</a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 rounded-md text-xs bg-dark-100 text-secondary-200 hover:bg-dark-200" onClick={() => updateDocument(d.documentId, { notes: (d.notes || '') + '' })}>Editar</button>
                <button className="px-2 py-1 rounded-md text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30" onClick={() => setConfirmDeleteId(d.documentId)}>Remover</button>
              </div>
            </li>
          )
        })}
      </ul>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Remover documento"
        description="Essa ação não pode ser desfeita."
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          removeDocument(confirmDeleteId)
          setConfirmDeleteId(null)
          addToast({ type: 'success', message: 'Documento removido.' })
        }}
      />
    </div>
  )
}