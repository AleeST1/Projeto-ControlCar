import { useEffect, useState } from 'react'
import { auth, isFirebaseConfigured } from '../firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from 'firebase/auth'
import { useAppStore } from '../store/appStore'
import { isFirestoreEnabled, loadAllForScope, subscribeScopeCollections, getUserFamily } from '../services/firestore'
import { getNotificationStatus, enableNotifications, registerServiceWorker } from '../services/messaging'

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const setCurrentUser = useAppStore((s) => s.setCurrentUser)
  const resetAll = useAppStore((s) => s.resetAll)
  const setAllData = useAppStore((s) => s.setAllData)
  const setVehicles = useAppStore((s) => s.setVehicles)
  const setFuelings = useAppStore((s) => s.setFuelings)
  const setReminders = useAppStore((s) => s.setReminders)
  const setTrips = useAppStore((s) => s.setTrips)
  const setDocuments = useAppStore((s) => s.setDocuments)
  const setFines = useAppStore((s) => s.setFines)
  const setSyncEnabled = useAppStore((s) => s.setSyncEnabled)
  const setRealtimeSubscribed = useAppStore((s) => s.setRealtimeSubscribed)
  const setLastSyncAt = useAppStore((s) => s.setLastSyncAt)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Sem Firebase, não força login. Usuário pode entrar em modo offline.
      setLoading(false)
      return () => {}
    }
    let unsubscribeRealtime = null
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setCurrentUser(u)
      if (!u) {
        resetAll()
        setSyncEnabled(false)
        setRealtimeSubscribed(false)
        useAppStore.getState().setCurrentFamilyId(null)
        if (unsubscribeRealtime) {
          unsubscribeRealtime()
          unsubscribeRealtime = null
        }
      } else if (isFirestoreEnabled) {
        try {
          // Detecta família do usuário (se houver)
          const family = await getUserFamily(u.uid)
          useAppStore.getState().setCurrentFamilyId(family?.familyId || null)

          const data = await loadAllForScope({ userId: u.uid, familyId: family?.familyId })
          setAllData(data)
          setSyncEnabled(true)
          setLastSyncAt(Date.now())

          unsubscribeRealtime = subscribeScopeCollections({ userId: u.uid, familyId: family?.familyId }, {
            onVehicles: setVehicles,
            onFuelings: setFuelings,
            onReminders: setReminders,
            onTrips: setTrips,
            onDocuments: setDocuments,
            onFines: setFines,
            onSync: () => setLastSyncAt(Date.now()),
          })
          setRealtimeSubscribed(true)
          // Inicialização opcional de mensagens: somente garante SW ativo se já houver token
          try {
            if (typeof Notification !== 'undefined') {
              const status = getNotificationStatus()
              if (status.permission === 'granted' && status.hasToken) {
                // Apenas garante que o SW está ativo para tokens existentes
                await registerServiceWorker().catch(() => {})
              }
            }
          } catch (e) {
            console.warn('FCM init warning:', e)
          }
        } catch (err) {
          console.error('Falha ao carregar dados do Firestore:', err)
        }
      }
      setLoading(false)
    })
    return () => {
      unsub()
      if (unsubscribeRealtime) unsubscribeRealtime()
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        if (password !== confirmPassword) {
          setError('As senhas não coincidem.')
          return
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        try {
          await updateProfile(cred.user, { displayName })
        } catch (err) {
          console.error('Falha ao atualizar perfil:', err)
          setInfo('Conta criada, mas não foi possível salvar o nome.')
        }
      }
    } catch (err) {
      setError(err.message || 'Falha na autenticação')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPassword() {
    setError('')
    setInfo('')
    if (!isFirebaseConfigured) return
    if (!email) {
      setError('Informe seu email para recuperar a senha.')
      return
    }
    try {
      await sendPasswordResetEmail(auth, email)
      setInfo('Enviamos um email com instruções para redefinir sua senha.')
    } catch (err) {
      setError(err.message || 'Não foi possível enviar o email de recuperação.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-400 text-secondary-100">
        <div className="glass-card rounded-2xl p-6 flex items-center gap-3">
          <span className="material-icons text-primary-400">sync</span>
          <span>Carregando…</span>
        </div>
      </div>
    )
  }

  if (!isFirebaseConfigured && !user) {
    // Modo offline: opção para seguir sem autenticação
    return (
      <div className="min-h-screen flex items-center justify-center login-gradient">
        <div className="glass-card w-full max-w-sm rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="material-icons text-sky-400">directions_car</span>
            <h1 className="text-2xl font-bold text-white">ControlCar</h1>
          </div>
          <p className="text-sm text-secondary-300">Login desabilitado (Firebase não configurado)</p>
          <button
            className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-600 text-white hover:from-sky-600 hover:to-sky-700 shadow-lg"
            onClick={() => { setCurrentUser({ uid: 'offline' }); setUser({ uid: 'offline' }) }}
          >
            Entrar em modo offline
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center login-gradient px-4">
        <form
          onSubmit={handleSubmit}
          className="glass-card w-full max-w-sm rounded-2xl p-7 space-y-5 shadow-2xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="material-icons text-sky-400">directions_car</span>
            <h1 className="text-2xl font-bold text-white">ControlCar</h1>
          </div>
          <p className="text-sm text-secondary-300 text-center">{mode === 'signin' ? 'Entrar' : 'Criar conta'}</p>
          {error && (
            <div className="text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 px-3 py-2">
              {error}
            </div>
          )}
          {info && (
            <div className="text-xs rounded-lg bg-green-500/10 border border-green-500/30 text-green-200 px-3 py-2">
              {info}
            </div>
          )}
          {mode === 'signup' && (
            <label htmlFor="displayName" className="flex flex-col gap-1 text-sm">
              <span className="text-secondary-200">Nome</span>
              <input
                className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100 placeholder-secondary-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20"
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </label>
          )}
          <label htmlFor="email" className="flex flex-col gap-1 text-sm">
            <span className="text-secondary-200">Email</span>
            <input
              className="rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 text-secondary-100 placeholder-secondary-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20"
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label htmlFor="password" className="flex flex-col gap-1 text-sm">
            <span className="text-secondary-200">Senha</span>
            <div className="relative w-full overflow-visible">
              <input
                className="w-full rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 pr-14 text-secondary-100 placeholder-secondary-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="z-10 flex items-center justify-center px-2 rounded-md text-secondary-300 hover:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-400/20"
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setShowPassword((v) => !v)}
              >
                <span className="material-icons text-xl leading-none">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </label>
          {mode === 'signup' && (
            <label htmlFor="confirmPassword" className="flex flex-col gap-1 text-sm">
              <span className="text-secondary-200">Confirmar senha</span>
              <div className="relative w-full overflow-visible">
                <input
                  className="w-full rounded-lg border border-dark-100 bg-dark-500 px-3 py-2 pr-14 text-secondary-100 placeholder-secondary-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="z-10 flex items-center justify-center px-2 rounded-md text-secondary-300 hover:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-400/20"
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <span className="material-icons text-xl leading-none">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </label>
          )}
          {mode === 'signin' && isFirebaseConfigured && (
            <button
              type="button"
              onClick={handleResetPassword}
              className="text-xs text-sky-400 hover:text-sky-300"
            >
              Esqueci a senha
            </button>
          )}
          <button
            className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-600 text-white hover:from-sky-600 hover:to-sky-700 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            type="submit"
            disabled={submitting}
          >
            <span className="inline-flex items-center gap-2">
              {submitting && <span className="material-icons animate-pulse text-sm">sync</span>}
              {mode === 'signin' ? 'Entrar' : 'Criar conta'}
            </span>
          </button>
          <button
            type="button"
            className="w-full px-4 py-2.5 rounded-lg border border-sky-400 text-sky-400 hover:bg-sky-500/10"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin' ? 'Criar conta' : 'Já tenho conta'}
          </button>
        </form>
      </div>
    )
  }

  return children
}