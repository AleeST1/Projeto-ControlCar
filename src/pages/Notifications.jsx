import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useAppStore } from '../store/appStore'
import { enableNotifications, disableNotifications, getNotificationStatus } from '../services/messaging'

export default function Notifications() {
  const addToast = useAppStore((s) => s.addToast)
  const currentUserId = useAppStore((s) => s.currentUserId)
  const [status, setStatus] = useState(getNotificationStatus())
  const { permission, hasToken } = status

  useEffect(() => {
    setStatus(getNotificationStatus())
  }, [])

  async function toggleNotifications() {
    try {
      if (hasToken) {
        await disableNotifications()
        setStatus(getNotificationStatus())
        addToast({ type: 'success', message: 'Notificações desativadas' })
      } else {
        await enableNotifications(currentUserId)
        setStatus(getNotificationStatus())
        addToast({ type: 'success', message: 'Notificações ativadas' })
      }
    } catch (e) {
      addToast({ type: 'error', message: e?.message || 'Falha ao atualizar notificações' })
    }
  }

  async function copyToken() {
    try {
      const token = localStorage.getItem('fcmToken')
      if (!token) {
        addToast({ type: 'error', message: 'Nenhum token ativo encontrado' })
        return
      }
      await navigator.clipboard.writeText(token)
      addToast({ type: 'success', message: 'Token copiado para a área de transferência' })
    } catch (e) {
      addToast({ type: 'error', message: 'Falha ao copiar o token' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Notificações" subtitle="Gerencie suas notificações por push.">
        <button
          className={`px-3 py-1.5 rounded-lg text-sm shadow-sm ${hasToken ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
          onClick={toggleNotifications}
        >
          {hasToken ? 'Desativar notificações' : 'Ativar notificações'}
        </button>
        {hasToken && (
          <button
            className="px-3 py-1.5 rounded-lg text-sm bg-dark-200 border border-dark-300 text-white hover:bg-dark-300 shadow-sm ml-2"
            onClick={copyToken}
            title="Copiar token FCM para testes"
          >
            Copiar token
          </button>
        )}
      </PageHeader>

      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="text-sm text-secondary-200">
          Permissão do navegador: <span className="font-medium text-white">{permission}</span>
        </div>
        <div className="text-sm text-secondary-200">
          Token FCM: <span className="font-medium text-white">{hasToken ? 'Ativo' : 'Inativo'}</span>
        </div>
        {permission === 'denied' && (
          <div className="rounded-lg bg-red-600/20 border border-red-600/40 p-3 text-sm text-red-200">
            Permissão negada. Ative notificações nas configurações do navegador.
          </div>
        )}
      </div>
    </div>
  )
}