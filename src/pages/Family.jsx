import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { isFirebaseConfigured } from '../firebase'
import { createFamily, joinFamily, leaveFamily, subscribeFamilyMembers } from '../services/firestore'
import PageHeader from '../components/PageHeader'

export default function Family() {
  const currentUserId = useAppStore((s) => s.currentUserId)
  const currentFamilyId = useAppStore((s) => s.currentFamilyId)
  const setCurrentFamilyId = useAppStore((s) => s.setCurrentFamilyId)
  const addToast = useAppStore((s) => s.addToast)
  const [family, setFamily] = useState(null)
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isFirebaseConfigured || !currentFamilyId) {
      setFamily(null)
      return
    }
    const unsub = subscribeFamilyMembers(currentFamilyId, (f) => setFamily(f))
    return () => unsub()
  }, [currentFamilyId])

  if (!isFirebaseConfigured) {
    return <div className="text-secondary-300">Firebase não configurado — recurso de Família indisponível.</div>
  }
  if (!currentUserId) {
    return <div className="text-secondary-300">Faça login para gerenciar sua família.</div>
  }

  async function handleCreateFamily() {
    setSubmitting(true)
    try {
      const f = await createFamily(currentUserId, name.trim())
      setCurrentFamilyId(f.familyId)
      addToast({ type: 'success', message: 'Família criada!' })
    } catch (e) {
      console.error(e)
      addToast({ type: 'error', message: 'Erro ao criar família' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleJoinFamily() {
    setSubmitting(true)
    try {
      const f = await joinFamily(inviteCode.trim(), currentUserId)
      setCurrentFamilyId(f.familyId)
      addToast({ type: 'success', message: 'Você entrou na família!' })
    } catch (e) {
      console.error(e)
      addToast({ type: 'error', message: 'Erro ao entrar na família' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLeaveFamily() {
    if (!currentFamilyId) return
    setLoading(true)
    try {
      await leaveFamily(currentFamilyId, currentUserId)
      setCurrentFamilyId(null)
      addToast({ type: 'success', message: 'Você saiu da família.' })
    } catch (e) {
      console.error(e)
      addToast({ type: 'error', message: 'Erro ao sair da família' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Família" subtitle="Gerencie sua família e membros para compartilhar o controle." />

      {!currentFamilyId && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-white">Criar nova família</h3>
            <label className="text-sm text-secondary-200 flex flex-col gap-1">
              <span>Nome</span>
              <input
                className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100 placeholder-secondary-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Família João"
              />
            </label>
            <button
              className="px-4 py-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
              onClick={handleCreateFamily}
              disabled={submitting || !name.trim()}
            >
              {submitting ? 'Criando…' : 'Criar família'}
            </button>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-white">Entrar em uma família</h3>
            <label className="text-sm text-secondary-200 flex flex-col gap-1">
              <span>Código de convite</span>
              <input
                className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100 placeholder-secondary-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Ex.: ABCD234 (código curto)"
              />
            </label>
            <button
              className="px-4 py-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
              onClick={handleJoinFamily}
              disabled={submitting || !inviteCode.trim()}
            >
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>
          </div>
        </div>
      )}

      {currentFamilyId && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-white">Minha família</h3>
          <div className="text-sm text-secondary-200">Nome: <span className="text-white">{family?.name || '—'}</span></div>
          <div className="text-sm text-secondary-200">Código: <span className="text-white">{currentFamilyId}</span></div>
          <div className="text-sm text-secondary-200">Código de convite: <span className="text-white">{family?.inviteCode || '—'}</span></div>
          <div className="text-sm text-secondary-200">Membros:</div>
          <ul className="text-sm text-secondary-100 list-disc ml-5">
            {(family?.memberIds || []).map((m) => <li key={m}>{m}</li>)}
          </ul>
          <div className="flex gap-2 pt-2">
            <button
              className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              onClick={handleLeaveFamily}
              disabled={loading}
            >
              {loading ? 'Saindo…' : 'Sair da família'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}