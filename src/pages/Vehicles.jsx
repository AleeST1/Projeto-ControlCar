import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { uploadVehiclePhoto } from '../services/storage'
import { isFirebaseConfigured } from '../firebase'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'

export default function Vehicles() {
  const addVehicle = useAppStore((s) => s.addVehicle)
  const vehicles = useAppStore((s) => s.vehicles)
  const avgFor = useAppStore((s) => s.averageConsumptionForVehicle)
  const updateMileage = useAppStore((s) => s.updateVehicleMileage)
  const updateVehicle = useAppStore((s) => s.updateVehicle)
  const removeVehicle = useAppStore((s) => s.removeVehicle)
  const addToast = useAppStore((s) => s.addToast)
  const [form, setForm] = useState({ plate: '', model: '', year: '', nickname: '', photoUrl: '', currentMileage: '', photoFile: null })
  const [submitting, setSubmitting] = useState(false)
  const currentUserId = useAppStore((s) => s.currentUserId)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ plate: '', model: '', year: '', nickname: '', photoUrl: '', photoFile: null, currentMileage: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.plate || !form.model || !form.year) return
    setSubmitting(true)
    try {
      let finalPhotoUrl = form.photoUrl.trim()
      const isOnlineUser = isFirebaseConfigured && currentUserId && currentUserId !== 'offline'
      const newVehicleId = crypto.randomUUID()
      if (isOnlineUser && form.photoFile) {
        try {
          const url = await uploadVehiclePhoto(currentUserId, newVehicleId, form.photoFile)
          finalPhotoUrl = url
        } catch (err) {
          console.error('Falha no upload da foto:', err)
          addToast({ type: 'error', message: 'Falha no upload da foto' })
        }
      }
      addVehicle({
        vehicleId: newVehicleId,
        plate: form.plate.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        nickname: form.nickname.trim(),
        photoUrl: finalPhotoUrl,
        currentMileage: Number(form.currentMileage || 0),
      })
      setForm({ plate: '', model: '', year: '', nickname: '', photoUrl: '', currentMileage: '', photoFile: null })
      addToast({ type: 'success', message: 'Veículo cadastrado com sucesso' })
      setShowForm(false)
    } catch (err) {
      console.error('Erro ao cadastrar veículo:', err)
      addToast({ type: 'error', message: 'Erro ao cadastrar veículo' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader title="Veículos" subtitle="Cadastre e gerencie seus veículos.">
        <button 
          className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-all duration-300 flex items-center gap-2 shadow-md"
          onClick={() => setShowForm(!showForm)}
        >
          <span className="material-icons text-sm">{showForm ? 'remove' : 'add'}</span>
          <span>{showForm ? 'Cancelar' : 'Novo veículo'}</span>
        </button>
      </PageHeader>

      {showForm && (
        <div className="glass-card rounded-2xl p-6 animate-slideDown mb-8">
          <h3 className="text-lg font-medium text-white mb-4">Cadastrar novo veículo</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Placa" value={form.plate} onChange={(v) => setForm({ ...form, plate: v })} required />
            <Input label="Modelo" value={form.model} onChange={(v) => setForm({ ...form, model: v })} required />
            <Input label="Ano" type="number" value={form.year} onChange={(v) => setForm({ ...form, year: v })} required />
            <Input label="Apelido" value={form.nickname} onChange={(v) => setForm({ ...form, nickname: v })} />
            <Input label="Foto (URL)" value={form.photoUrl} onChange={(v) => setForm({ ...form, photoUrl: v })} />
            <FileInput label="Foto (arquivo)" onChange={(file) => setForm({ ...form, photoFile: file })} />
            <Input label="Quilometragem atual" type="number" value={form.currentMileage} onChange={(v) => setForm({ ...form, currentMileage: v })} />
            <div className="sm:col-span-2 flex justify-end mt-2">
              <button 
                className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-all duration-300 flex items-center gap-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={submitting || !(form.plate && form.model && form.year)}
              >
                {submitting ? (
                  <>
                    <span className="material-icons animate-spin text-sm">refresh</span>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-icons text-sm">save</span>
                    <span>Cadastrar veículo</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {vehicles.length === 0 && (
          <div className="glass-card rounded-2xl px-6 py-12 text-center">
            <span className="material-icons text-4xl text-secondary-400 mb-4">directions_car</span>
            <p className="text-secondary-300 mb-2">Nenhum veículo cadastrado.</p>
            <button 
              className="px-4 py-2 mt-4 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-all duration-300 flex items-center gap-2"
              onClick={() => setShowForm(true)}
            >
              <span className="material-icons text-sm">add</span>
              <span>Adicionar veículo</span>
            </button>
          </div>
        )}
        
        {vehicles.map((v, index) => (
          <div 
            key={v.vehicleId} 
            className="glass-card rounded-2xl p-5 transition-all duration-300 hover:shadow-lg"
            style={{
              animation: `fadeIn 0.3s ease-out forwards`,
              animationDelay: `${index * 0.1}s`,
              opacity: 0
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                {v.photoUrl ? (
                  <img 
                    src={v.photoUrl} 
                    alt={v.model} 
                    className="w-20 h-20 rounded-lg object-cover border border-dark-100 shadow-md" 
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-dark-100 flex items-center justify-center">
                    <span className="material-icons text-3xl text-secondary-400">directions_car</span>
                  </div>
                )}
                
                <div>
                  <div className="font-semibold text-lg text-white">{v.model} {v.year}</div>
                  <div className="text-sm text-primary-400 font-medium">{v.plate}</div>
                  {v.nickname && <div className="text-sm text-secondary-300 mt-1">{v.nickname}</div>}
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
                    <div className="flex items-center gap-1">
                      <span className="material-icons text-secondary-400 text-sm">speed</span>
                      <span className="text-xs text-secondary-300">{v.currentMileage ?? 0} km</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span className="material-icons text-secondary-400 text-sm">local_gas_station</span>
                      <span className="text-xs text-secondary-300">
                        <span className="font-medium text-primary-400">{avgFor(v.vehicleId)}</span> km/l
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                <button 
                  className="px-3 py-1.5 rounded-lg text-sm bg-dark-100 text-secondary-200 hover:bg-dark-300 transition-all duration-200 flex items-center gap-1" 
                  onClick={() => {
                    setEditingId(v.vehicleId)
                    setEditForm({ 
                      plate: v.plate || '', 
                      model: v.model || '', 
                      year: String(v.year || ''), 
                      nickname: v.nickname || '', 
                      photoUrl: v.photoUrl || '', 
                      photoFile: null, 
                      currentMileage: String(v.currentMileage ?? '') 
                    })
                  }}
                >
                  <span className="material-icons text-sm">edit</span>
                  <span>Editar</span>
                </button>
                
                <button 
                  className="px-3 py-1.5 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 transition-all duration-200 flex items-center gap-1" 
                  onClick={() => setConfirmDeleteId(v.vehicleId)}
                >
                  <span className="material-icons text-sm">delete</span>
                  <span>Excluir</span>
                </button>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-dark-100">
              <MileageEditor vehicleId={v.vehicleId} currentMileage={v.currentMileage ?? 0} onSave={(km) => updateMileage(v.vehicleId, km)} />
            </div>

            {editingId === v.vehicleId && (
              <div className="mt-6 pt-6 border-t border-dark-100 animate-fadeIn">
                <h4 className="text-white font-medium mb-4">Editar veículo</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Placa" value={editForm.plate} onChange={(val) => setEditForm({ ...editForm, plate: val })} required />
                  <Input label="Modelo" value={editForm.model} onChange={(val) => setEditForm({ ...editForm, model: val })} required />
                  <Input label="Ano" type="number" value={editForm.year} onChange={(val) => setEditForm({ ...editForm, year: val })} required />
                  <Input label="Apelido" value={editForm.nickname} onChange={(val) => setEditForm({ ...editForm, nickname: val })} />
                  <Input label="Foto (URL)" value={editForm.photoUrl} onChange={(val) => setEditForm({ ...editForm, photoUrl: val })} />
                  <FileInput label="Foto (arquivo)" onChange={(file) => setEditForm({ ...editForm, photoFile: file })} />
                  <Input label="Quilometragem atual" type="number" value={editForm.currentMileage} onChange={(val) => setEditForm({ ...editForm, currentMileage: val })} />
                  
                  <div className="sm:col-span-2 flex flex-wrap items-center justify-end gap-3 mt-2">
                    <button 
                      className="px-3 py-1.5 rounded-lg text-sm bg-dark-100 text-secondary-200 hover:bg-dark-300 transition-all duration-200 flex items-center gap-1" 
                      onClick={() => { 
                        setEditForm({ ...editForm, photoUrl: '', photoFile: null }); 
                        addToast({ type: 'info', message: 'Foto removida do veículo' }) 
                      }}
                    >
                      <span className="material-icons text-sm">image_not_supported</span>
                      <span>Remover foto</span>
                    </button>
                    
                    <button 
                      className="px-3 py-1.5 rounded-lg text-sm bg-dark-100 text-secondary-200 hover:bg-dark-300 transition-all duration-200 flex items-center gap-1" 
                      onClick={() => { 
                        setEditingId(null); 
                        setEditForm({ plate: '', model: '', year: '', nickname: '', photoUrl: '', photoFile: null, currentMileage: '' }) 
                      }}
                    >
                      <span className="material-icons text-sm">close</span>
                      <span>Cancelar</span>
                    </button>
                    
                    <button 
                      className="px-3 py-1.5 rounded-lg text-sm bg-primary-600 text-white hover:bg-primary-700 transition-all duration-200 flex items-center gap-1 disabled:opacity-60" 
                      disabled={editSaving || !(editForm.plate && editForm.model && editForm.year)} 
                      onClick={async () => {
                        setEditSaving(true)
                        try {
                          let finalUrl = (editForm.photoUrl || '').trim()
                          const isOnlineUser = isFirebaseConfigured && currentUserId && currentUserId !== 'offline'
                          if (isOnlineUser && editForm.photoFile) {
                            try {
                              finalUrl = await uploadVehiclePhoto(currentUserId, v.vehicleId, editForm.photoFile)
                            } catch (err) {
                              console.error('Falha no upload da foto:', err)
                              addToast({ type: 'error', message: 'Falha no upload da foto' })
                            }
                          }
                          updateVehicle(v.vehicleId, {
                            plate: editForm.plate.trim(),
                            model: editForm.model.trim(),
                            year: Number(editForm.year || 0),
                            nickname: editForm.nickname.trim(),
                            photoUrl: finalUrl,
                            currentMileage: Number(editForm.currentMileage || 0),
                          })
                          addToast({ type: 'success', message: 'Veículo atualizado com sucesso' })
                          setEditingId(null)
                          setEditForm({ plate: '', model: '', year: '', nickname: '', photoUrl: '', photoFile: null, currentMileage: '' })
                        } catch (err) {
                          console.error('Erro ao salvar veículo:', err)
                          addToast({ type: 'error', message: 'Erro ao salvar veículo' })
                        } finally {
                          setEditSaving(false)
                        }
                      }}
                    >
                      {editSaving ? (
                        <>
                          <span className="material-icons animate-spin text-sm">refresh</span>
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-icons text-sm">save</span>
                          <span>Salvar alterações</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Confirmar exclusão"
        message="Tem certeza que deseja excluir este veículo? Abastecimentos e manutenções vinculadas serão removidas."
        confirmText="Excluir"
        cancelText="Cancelar"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (!confirmDeleteId) return
          removeVehicle(confirmDeleteId)
          addToast({ type: 'success', message: 'Veículo removido' })
          setConfirmDeleteId(null)
        }}
      />
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', required }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-secondary-300">{label}</span>
      <input
        className="rounded-lg border border-dark-100 bg-dark-300 px-4 py-2.5 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all duration-200"
        value={value}
        type={type}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function MileageEditor({ vehicleId, currentMileage, onSave }) {
  const [km, setKm] = useState(String(currentMileage ?? 0))
  const [isUpdating, setIsUpdating] = useState(false)
  const addToast = useAppStore((s) => s.addToast)
  
  const handleSave = () => {
    setIsUpdating(true)
    setTimeout(() => {
      onSave(Number(km || 0))
      addToast({ type: 'success', message: 'Quilometragem atualizada' })
      setIsUpdating(false)
    }, 500)
  }
  
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center">
        <span className="material-icons text-secondary-400 mr-2">speed</span>
        <span className="text-sm text-secondary-300 mr-3">Atualizar quilometragem:</span>
      </div>
      
      <div className="flex items-center gap-2">
        <input 
          className="w-28 rounded-lg border border-dark-100 bg-dark-300 px-3 py-1.5 text-white focus:border-primary-500 outline-none transition-all duration-200" 
          type="number" 
          value={km} 
          onChange={(e) => setKm(e.target.value)} 
        />
        
        <button 
          className="px-3 py-1.5 rounded-lg text-sm bg-primary-600 text-white hover:bg-primary-700 transition-all duration-200 flex items-center gap-1 disabled:opacity-60" 
          onClick={handleSave}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <>
              <span className="material-icons animate-spin text-sm">refresh</span>
              <span>Atualizando...</span>
            </>
          ) : (
            <>
              <span className="material-icons text-sm">update</span>
              <span>Atualizar</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function FileInput({ label, onChange }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-secondary-300">{label}</span>
      <div className="relative">
        <input 
          className="rounded-lg border border-dark-100 bg-dark-300 px-4 py-2.5 text-white w-full file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-primary-600 file:text-white hover:file:bg-primary-700 file:cursor-pointer cursor-pointer transition-all duration-200" 
          type="file" 
          accept="image/*" 
          onChange={(e) => onChange(e.target.files?.[0] || null)} 
        />
      </div>
    </label>
  )
}