import { Link, NavLink, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import { auth, isFirebaseConfigured } from './firebase'
import { signOut } from 'firebase/auth'
import { Suspense, lazy, useEffect, useMemo, useState, useRef } from 'react'
import { useAppStore } from './store/appStore'
import Toaster from './components/Toaster'

// Code splitting por rota (lazy)
const Vehicles = lazy(() => import('./pages/Vehicles.jsx'))
const Fuelings = lazy(() => import('./pages/Fuelings.jsx'))
const Maintenances = lazy(() => import('./pages/Maintenances.jsx'))
const Trips = lazy(() => import('./pages/Trips.jsx'))
const Family = lazy(() => import('./pages/Family.jsx'))
const Documents = lazy(() => import('./pages/Documents.jsx'))
const Fines = lazy(() => import('./pages/Fines.jsx'))
const Notifications = lazy(() => import('./pages/Notifications.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const lastSyncAt = useAppStore((s) => s.lastSyncAt)
  const realtimeSubscribed = useAppStore((s) => s.realtimeSubscribed)
  const syncEnabled = useAppStore((s) => s.syncEnabled)
  const addToast = useAppStore((s) => s.addToast)
  const themeColor = useAppStore((s) => s.themeColor)
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [clock, setClock] = useState(new Date())
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef(null)
  const pageTitleMap = {
    '/': 'Dashboard',
    '/vehicles': 'Veículos',
    '/fuelings': 'Abastecimentos',
    '/maintenances': 'Manutenções',
    '/trips': 'Viagens',
    '/documents': 'Documentos',
    '/fines': 'Multas',
    '/notifications': 'Notificações',
    '/settings': 'Configurações',
  }
  const currentTitle = pageTitleMap[location.pathname] || 'ControlCar'
  
  useEffect(() => {
    function update() { setOnline(navigator.onLine) }
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  
  // Toasts de conectividade
  useEffect(() => {
    addToast({ type: online ? 'success' : 'error', message: online ? 'Conexão restaurada' : 'Sem conexão — modo offline' })
  }, [online, addToast])
  
  // Relógio no cabeçalho
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  
  // Fecha o menu do usuário ao clicar fora
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Atalhos de teclado Ctrl+1..4
  useEffect(() => {
    function onKey(e) {
      if (!e.ctrlKey) return
      const key = e.key
      if (key === '1') navigate('/')
      else if (key === '2') navigate('/vehicles')
      else if (key === '3') navigate('/fuelings')
      else if (key === '4') navigate('/maintenances')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
  
  return (
    <div className="flex min-h-screen bg-dark-400 text-secondary-100 font-sans">
      <aside className="sidebar hidden sm:flex flex-col items-start">
        <div className="mb-10 flex items-center">
          <span className="material-icons text-3xl mr-2" style={{ color: themeColor }}>directions_car</span>
          <span className="text-2xl font-extrabold tracking-tight text-white">ControlCar</span>
        </div>
        <nav className="flex flex-col gap-3 w-full">
          <NavLink className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} to="/">
            <span className="material-icons text-lg">home</span> Dashboard
          </NavLink>
          <NavLink className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} to="/vehicles">
            <span className="material-icons text-lg">directions_car</span> Veículos
          </NavLink>
          <NavLink className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} to="/fuelings">
            <span className="material-icons text-lg">local_gas_station</span> Abastecimentos
          </NavLink>
          <NavLink className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} to="/maintenances">
            <span className="material-icons text-lg">build</span> Manutenções
          </NavLink>
          <NavLink className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} to="/documents">
            <span className="material-icons text-lg">assignment</span> Documentos
          </NavLink>
          <NavLink className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} to="/fines">
            <span className="material-icons text-lg">gavel</span> Multas
          </NavLink>
          <NavLink className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} to="/trips">
            <span className="material-icons text-lg">map</span> Viagens
          </NavLink>
          <NavLink className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} to="/family">
            <span className="material-icons text-lg">group</span> Família
          </NavLink>
        </nav>
        
        <div className="mt-auto pt-6 border-t border-dark-100 w-full text-left">
          <div className="w-full px-0">
            {isFirebaseConfigured && auth?.currentUser && (auth.currentUser.displayName || auth.currentUser.email) && (
              <div className="flex items-center gap-2 mb-4 justify-start">
                <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-[12px]">
                  {(auth.currentUser.displayName || auth.currentUser.email).charAt(0).toUpperCase()}
                </div>
                <div className="text-sm text-secondary-300">{auth.currentUser.displayName || auth.currentUser.email}</div>
              </div>
            )}
            <div className="w-full">
              <StatusBadge online={online} syncEnabled={syncEnabled} realtimeSubscribed={realtimeSubscribed} lastSyncAt={lastSyncAt} />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-secondary-400 justify-start">
              <div className="w-6 h-6 flex items-center justify-center">
                <span className="material-icons text-[16px]">schedule</span>
              </div>
              <span>{clock.toLocaleDateString()} {clock.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </aside>
      
      <div className="flex-1 flex flex-col">
        <header className="bg-dark-200 shadow-nav px-6 py-4 flex items-center justify-between sticky top-0 z-30 topbar-solid-mobile">
          <div className="flex items-center">
            <h1 className="text-xl font-bold tracking-tight text-white sm:hidden">ControlCar</h1>
            <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">{currentTitle}</h1>
          </div>
          <div className="flex items-center gap-4">
            {isFirebaseConfigured ? (
              <>
                <div className="hidden sm:flex items-center">
                  <div className="px-2 py-1 rounded-lg bg-dark-100 border border-dark-100">
                    <StatusBadge 
                      online={online} 
                      syncEnabled={syncEnabled} 
                      realtimeSubscribed={realtimeSubscribed} 
                      lastSyncAt={lastSyncAt}
                      variant="inline"
                    />
                  </div>
                </div>
                {auth?.currentUser && (auth.currentUser.displayName || auth.currentUser.email) && (
                  <div className="hidden sm:flex items-center gap-3 relative" ref={userMenuRef}>
                    <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs" title={auth.currentUser.displayName || auth.currentUser.email}>
                      {(auth.currentUser.displayName || auth.currentUser.email).charAt(0).toUpperCase()}
                    </div>
                    <button
                      className="text-xs text-secondary-400 hover:text-white transition-colors flex items-center gap-1"
                      aria-haspopup="menu"
                      aria-expanded={userMenuOpen}
                      onClick={() => setUserMenuOpen((v) => !v)}
                      title={auth.currentUser.displayName || auth.currentUser.email}
                    >
                      <span>{auth.currentUser.displayName || auth.currentUser.email}</span>
                      <span className="material-icons text-[14px]">expand_more</span>
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 top-9 min-w-[180px] rounded-lg bg-dark-100 border border-dark-200 shadow-lg p-1 z-50 user-menu-dropdown">
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-200 hover:bg-dark-300 rounded-md"
                          onClick={() => { setUserMenuOpen(false); navigate('/settings') }}
                        >
                          <span className="material-icons text-sm">settings</span>
                          <span>Configurações</span>
                        </button>
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-200 hover:bg-dark-300 rounded-md"
                          onClick={() => { setUserMenuOpen(false); navigate('/notifications') }}
                        >
                          <span className="material-icons text-sm">notifications</span>
                          <span>Notificações</span>
                        </button>
                        <div className="border-t border-dark-200 my-1"></div>
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-200 hover:bg-dark-300 rounded-md"
                          onClick={() => { setUserMenuOpen(false); signOut(auth) }}
                        >
                          <span className="material-icons text-sm">logout</span>
                          <span>Sair</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="sm:hidden relative" ref={mobileMenuRef}>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-dark-100"
                    aria-haspopup="menu"
                    aria-expanded={mobileMenuOpen}
                    onClick={() => setMobileMenuOpen((v) => !v)}
                    title={auth?.currentUser?.displayName || auth?.currentUser?.email || 'Menu'}
                  >
                    <span className="material-icons text-sm">account_circle</span>
                  </button>
                  {mobileMenuOpen && (
                    <div className="absolute right-0 top-10 min-w-[160px] rounded-lg bg-dark-100 border border-dark-200 shadow-lg p-1 z-50 mobile-menu-dropdown">
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-200 hover:bg-dark-300 rounded-md" onClick={() => { setMobileMenuOpen(false); navigate('/settings') }}>
                        <span className="material-icons text-sm">settings</span>
                        <span>Configurações</span>
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-200 hover:bg-dark-300 rounded-md" onClick={() => { setMobileMenuOpen(false); navigate('/notifications') }}>
                        <span className="material-icons text-sm">notifications</span>
                        <span>Notificações</span>
                      </button>
                      <div className="border-t border-dark-200 my-1"></div>
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-200 hover:bg-dark-300 rounded-md" onClick={() => { setMobileMenuOpen(false); signOut(auth) }}>
                        <span className="material-icons text-sm">logout</span>
                        <span>Sair</span>
                      </button>
                    </div>
                  )}
                </div>
                {/* Seletor de tema e relógio removidos do cabeçalho */}
              </>
            ) : (
              <span className="px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-800 text-xs font-medium flex items-center gap-1">
                <span className="material-icons text-sm">wifi_off</span>
                <span>Modo offline</span>
              </span>
            )}
          </div>
        </header>
        
        {!online && (
          <div className="mx-4 sm:mx-6 mt-3 p-2 rounded-lg offline-banner text-xs text-secondary-200 flex items-center gap-2">
            <span className="material-icons text-sm text-red-400">signal_wifi_bad</span>
            <span>Sem conexão — alterações serão salvas localmente</span>
          </div>
        )}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
          <Suspense fallback={<div className="glass-card p-4 rounded-xl text-sm text-secondary-200">Carregando página…</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/vehicles" element={<Vehicles />} />
              <Route path="/fuelings" element={<Fuelings />} />
              <Route path="/maintenances" element={<Maintenances />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/fines" element={<Fines />} />
              <Route path="/trips" element={<Trips />} />
              <Route path="/family" element={<Family />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Suspense>
        </main>
        
        <nav className="bottom-nav sm:hidden">
          <NavLink className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} to="/">
            <span className="material-icons text-lg">home</span>
            <span className="text-xs">Início</span>
          </NavLink>
          <NavLink className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} to="/vehicles">
            <span className="material-icons text-lg">directions_car</span>
            <span className="text-xs">Veículos</span>
          </NavLink>
          <NavLink className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} to="/fuelings">
            <span className="material-icons text-lg">local_gas_station</span>
            <span className="text-xs">Abastecer</span>
          </NavLink>
          <NavLink className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} to="/maintenances">
            <span className="material-icons text-lg">build</span>
            <span className="text-xs">Manutenções</span>
          </NavLink>
          <NavLink className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} to="/documents">
            <span className="material-icons text-lg">assignment</span>
            <span className="text-xs">Documentos</span>
          </NavLink>
          <NavLink className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} to="/fines">
            <span className="material-icons text-lg">gavel</span>
            <span className="text-xs">Multas</span>
          </NavLink>
          <NavLink className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} to="/trips">
            <span className="material-icons text-lg">map</span>
            <span className="text-xs">Viagens</span>
          </NavLink>
          <NavLink className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'} to="/family">
            <span className="material-icons text-lg">group</span>
            <span className="text-xs">Família</span>
          </NavLink>
        </nav>
        
        <Toaster />
      </div>
    </div>
  )
}

function Home() {
  const vehicles = useAppStore((s) => s.vehicles)
  const fuelings = useAppStore((s) => s.fuelings)
  const reminders = useAppStore((s) => s.reminders)
  const trips = useAppStore((s) => s.trips)
  const avgForVehicle = useAppStore((s) => s.averageConsumptionForVehicle)
  const themeColor = useAppStore((s) => s.themeColor)
  const userEmail = auth?.currentUser?.email
  const userName = useMemo(() => {
    if (!userEmail) return 'Usuário'
    const namePart = userEmail.split('@')[0]
    return namePart.charAt(0).toUpperCase() + namePart.slice(1)
  }, [userEmail])
  const pendingReminders = reminders.filter((r) => !r.isCompleted).length
  const plannedTrips = trips.filter((t) => !t.isCompleted).length
  const avgPricePerLiter = fuelings.length
    ? Number((fuelings.reduce((sum, f) => sum + (f.pricePerLiter ?? 0), 0) / fuelings.length).toFixed(2))
    : 0
  const [loading, setLoading] = useState(true)
  const tips = [
    '💡 Dica: Cadastre manutenções por data, como troca de óleo.',
    '💡 Dica: Mantenha os abastecimentos atualizados para estatísticas precisas.',
    '💡 Dica: Adicione fotos aos veículos para identificá-los melhor.',
    '💡 Dica: Use filtros de veículo para analisar consumo.',
  ]
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600)
    const rot = setInterval(() => setTipIndex((i) => (i + 1) % tips.length), 5000)
    return () => { clearTimeout(t); clearInterval(rot) }
  }, [])

  // ===== Dashboard métricas adicionais =====
  function sameMonth(dateA, dateB) {
    const a = new Date(dateA || 0)
    const b = new Date(dateB || 0)
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
  }

  const today = new Date()
  const costThisMonth = fuelings
    .filter((f) => sameMonth(f.date, today))
    .reduce((sum, f) => sum + Number(f.totalCost || 0), 0)

  // Consumo médio geral (km/L) baseado na evolução do odômetro
  function computeAverageKmPerLiterAll(list) {
    if (!list || list.length < 2) return 0
    let totalDistance = 0
    let totalLiters = 0
    const sorted = [...list].sort((a, b) => (Number(a.odometer || 0) - Number(b.odometer || 0)))
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      const distance = Number(curr.odometer || 0) - Number(prev.odometer || 0)
      if (distance > 0 && Number(curr.liters || 0) > 0) {
        totalDistance += distance
        totalLiters += Number(curr.liters || 0)
      }
    }
    if (totalLiters === 0) return 0
    return Number((totalDistance / totalLiters).toFixed(2))
  }
  const avgConsumptionAll = computeAverageKmPerLiterAll(fuelings)

  // Próximas manutenções (3 próximas)
  const upcomingReminders = reminders
    .filter((r) => !r.isCompleted)
    .filter((r) => !!r.dueDate)
    .slice()
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3)

  // Últimos abastecimentos (5 últimos)
  const latestFuelings = fuelings
    .slice()
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 5)

  // Gráfico simples: custo por veículo (últimos 30 dias)
  const last30DaysTs = Date.now() - 30 * 24 * 60 * 60 * 1000
  const costPerVehicle = vehicles.map((v) => {
    const total = fuelings
      .filter((f) => f.vehicleId === v.vehicleId)
      .filter((f) => new Date(f.date || 0).getTime() >= last30DaysTs)
      .reduce((sum, f) => sum + Number(f.totalCost || 0), 0)
    return { label: `${v.model} ${v.plate}`, total }
  })
  const maxCost = Math.max(1, ...costPerVehicle.map((x) => x.total))

  // Gráfico simples: consumo médio por veículo (km/L)
  const consumptionPerVehicle = vehicles.map((v) => {
    const kmPerL = Number(avgForVehicle(v.vehicleId) || 0)
    return { label: `${v.model} ${v.plate}`, value: kmPerL }
  })
  const maxKmPerL = Math.max(1, ...consumptionPerVehicle.map((x) => x.value))

  // Tendência semanal simples: média dos últimos 3 vs anteriores 3
  const prices = fuelings.map((f) => f.pricePerLiter ?? 0)
  const trendUp = useMemo(() => {
    if (prices.length < 4) return null
    const last3 = prices.slice(-3)
    const prev3 = prices.slice(-6, -3)
    const avgLast = last3.reduce((a,b)=>a+b,0)/last3.length
    const avgPrev = prev3.reduce((a,b)=>a+b,0)/prev3.length
    return avgLast >= avgPrev
  }, [prices])

  // Gráfico mensal de desempenho (gasto total por mês)
  const monthly = useMemo(() => {
    const map = new Map()
    fuelings.forEach((f)=>{
      const d = new Date(f.date || Date.now())
      const k = `${d.getFullYear()}-${d.getMonth()+1}`
      map.set(k, (map.get(k)||0) + (f.totalCost ?? 0))
    })
    const entries = Array.from(map.entries()).sort()
    const last6 = entries.slice(-6)
    return last6.map(([k,v])=>{
      const [y,m] = k.split('-')
      const monthName = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][Number(m)-1]
      return { label: `${monthName}/${y.slice(-2)}`, value: Number(v.toFixed(2)) }
    })
  }, [fuelings])

  return (
    <div className="space-y-6 animate-fadeIn animate-slideUp">
      <div className="glass-card p-4 sm:p-6 rounded-2xl mb-6 sm:mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Olá, {userName} 👋</h2>
        <p className="text-secondary-300">Pronto para gerenciar seus veículos hoje?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
        <Summary title="Veículos" value={vehicles.length} icon="garage" color="from-blue-500 to-blue-700" loading={loading} />
        <Summary title="Abastecimentos" value={fuelings.length} icon="local_gas_station" color="from-green-500 to-green-700" loading={loading} />
        <Summary title="Manutenções pendentes" value={pendingReminders} icon="event" color="from-purple-500 to-purple-700" loading={loading} />
        {/* Secundários: escondidos no mobile */}
        <div className="hidden sm:block">
          <Summary title="Preço médio/L" value={`R$ ${avgPricePerLiter.toFixed(2)}`} icon="attach_money" color="from-amber-500 to-amber-700" loading={loading} trend={trendUp} />
        </div>
        <div className="hidden sm:block">
          <Summary title="Viagens" value={plannedTrips} icon="map" color="from-indigo-500 to-indigo-700" loading={loading} />
        </div>
      </div>

      <h3 className="text-lg font-medium text-secondary-200 mb-4">Acesso rápido</h3>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <Card 
          title="Veículos" 
          to="/vehicles" 
          icon="directions_car"
          description="Cadastre e gerencie seus veículos"
          color="bg-gradient-to-br from-blue-500 to-blue-700"
          titleAttr="Ir para tela de veículos"
          loading={loading}
        />
        <Card 
          title="Abastecimentos" 
          to="/fuelings" 
          icon="local_gas_station"
          description="Registre e acompanhe seus abastecimentos"
          color="bg-gradient-to-br from-green-500 to-green-700"
          titleAttr="Ir para tela de abastecimentos"
          loading={loading}
        />
        <Card 
          title="Manutenções"
          to="/maintenances"
          icon="build"
          description="Cadastre manutenções e receba avisos por data"
          color="bg-gradient-to-br from-purple-500 to-purple-700"
          titleAttr="Ir para tela de manutenções"
          loading={loading}
        />
        <div className="hidden sm:block">
          <Card 
            title="Viagens" 
            to="/trips" 
            icon="map"
            description="Planeje e acompanhe custos das viagens"
            color="bg-gradient-to-br from-amber-500 to-amber-700"
            titleAttr="Ir para tela de viagens"
            loading={loading}
          />
        </div>
      </div>

      <div className="mt-8 p-4 rounded-xl tip-banner hidden sm:block">
        <h3 className="text-sm font-medium text-secondary-200 mb-2 flex items-center gap-2">
          <span className="material-icons text-primary-400 text-base">tips_and_updates</span>
          <span>Dica</span>
        </h3>
        <p className="text-xs text-secondary-200">{tips[tipIndex]}</p>
      </div>

      <div className="hidden sm:grid sm:grid-cols-2 gap-5">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-icons text-primary-400">trending_up</span>
            <h3 className="text-sm font-medium text-secondary-200">Custo do mês</h3>
          </div>
          <div className="text-2xl font-bold text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(costThisMonth)}</div>
          <div className="text-xs text-secondary-300 mt-1">Soma dos abastecimentos no mês atual</div>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-icons text-primary-400">speed</span>
            <h3 className="text-sm font-medium text-secondary-200">Consumo médio (km/L)</h3>
          </div>
          <div className="text-2xl font-bold text-white">{avgConsumptionAll.toFixed(2)}</div>
          <div className="text-xs text-secondary-300 mt-1">Baseado na evolução do odômetro</div>
        </div>
      </div>

      <div className="hidden sm:grid sm:grid-cols-2 gap-5">
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-medium text-secondary-200 mb-3 flex items-center gap-2"><span className="material-icons text-base text-secondary-300">event_upcoming</span> Próximas manutenções</h3>
          {upcomingReminders.length === 0 ? (
            <div className="text-xs text-secondary-400">Nenhuma manutenção agendada.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcomingReminders.map((r) => {
                const v = vehicles.find((vv) => vv.vehicleId === r.vehicleId)
                return (
                  <li key={r.reminderId} className="flex items-center justify-between">
                    <div className="text-secondary-200">{r.description}</div>
                    <div className="text-xs text-secondary-300">{v ? `${v.model} ${v.plate}` : ''} • {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}</div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-medium text-secondary-200 mb-3 flex items-center gap-2"><span className="material-icons text-base text-secondary-300">local_gas_station</span> Últimos abastecimentos</h3>
          {latestFuelings.length === 0 ? (
            <div className="text-xs text-secondary-400">Nenhum abastecimento registrado.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {latestFuelings.map((f) => {
                const v = vehicles.find((vv) => vv.vehicleId === f.vehicleId)
                const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                return (
                  <li key={f.fuelingId} className="flex items-center justify-between">
                    <div className="text-secondary-200">{v ? `${v.model} ${v.plate}` : ''}</div>
                    <div className="text-xs text-secondary-300">{new Date(f.date).toLocaleDateString()} • {Number(f.liters || 0).toFixed(1)} L • {currency.format(Number(f.totalCost || 0))}</div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {!!vehicles.length && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-medium text-secondary-200 mb-3">Custo por veículo (30 dias)</h3>
            <div className="space-y-2">
              {costPerVehicle.map((it, idx) => (
                <div key={`cost-${idx}`} className="flex items-center gap-3">
                  <div className="text-xs text-secondary-300 w-40 truncate">{it.label}</div>
                  <div className="flex-1 h-3 rounded bg-dark-300 overflow-hidden">
                    <div
                      className="h-3 rounded bg-primary-500"
                      style={{ width: `${Math.max(8, (it.total / maxCost) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-secondary-300 w-20 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.total)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-medium text-secondary-200 mb-3">Consumo médio (km/L) por veículo</h3>
            <div className="space-y-2">
              {consumptionPerVehicle.map((it, idx) => (
                <div key={`cons-${idx}`} className="flex items-center gap-3">
                  <div className="text-xs text-secondary-300 w-40 truncate">{it.label}</div>
                  <div className="flex-1 h-3 rounded bg-dark-300 overflow-hidden">
                    <div
                      className="h-3 rounded bg-emerald-500"
                      style={{ width: `${Math.max(8, (it.value / maxKmPerL) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-secondary-300 w-20 text-right">{it.value.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {monthly.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-secondary-300">Desempenho mensal (gasto total)</div>
            <div className="flex items-center gap-1 text-secondary-400 text-xs">
              <span className="material-icons text-sm">bar_chart</span>
              <span>Últimos {monthly.length} meses</span>
            </div>
          </div>
          <div className="flex items-end gap-3 h-28">
            {monthly.map((m, idx) => {
              const max = Math.max(...monthly.map(x=>x.value)) || 1
              const h = Math.round((m.value / max) * 100)
              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div className="w-8 rounded-t bg-primary-500" style={{ height: `${h}%`, backgroundColor: themeColor }}></div>
                  <div className="text-[11px] text-secondary-400">{m.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Summary({ title, value, icon, color, loading, trend }) {
  return (
    <div className={`card flex items-center gap-4 ${loading ? 'loading' : ''}`}>
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
        <span className="material-icons text-white text-base">{icon}</span>
      </div>
      <div>
        <div className="text-xs text-secondary-300">{title}</div>
        <div className="text-xl font-semibold text-white leading-tight flex items-center gap-2">
          <span>{value}</span>
          {typeof trend === 'boolean' && (
            <span className={`material-icons text-sm ${trend ? 'text-green-400' : 'text-red-400'}`}>{trend ? 'trending_up' : 'trending_down'}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function Card({ title, to, icon, description, color, titleAttr, loading }) {
  return (
    <Link 
      to={to} 
      className={`card flex flex-col h-full transition-all duration-300 hover:scale-[1.03] quick-link group ${loading ? 'loading' : ''}`}
      title={titleAttr}
    >
      <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center mb-4`}>
        <span className="material-icons text-white text-xl">{icon}</span>
      </div>
      <div className="font-semibold text-lg text-white mb-1">{title}</div>
      <div className="text-sm text-secondary-300 mt-1 flex-grow">{description}</div>
      <div className="flex items-center mt-4 text-primary-400 text-sm font-medium">
        <span>Acessar</span>
        <span className="material-icons text-sm ml-1 arrow">arrow_forward</span>
      </div>
    </Link>
  )
}

function StatusBadge({ online, syncEnabled, realtimeSubscribed, lastSyncAt, variant = 'stacked' }) {
  const statusColor = online ? 'bg-green-500' : 'bg-red-500'
  const syncStatusColor = syncEnabled 
    ? (realtimeSubscribed ? 'bg-primary-500' : 'bg-yellow-500') 
    : 'bg-secondary-500'
  
  const time = lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : '—'
  
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 text-xs text-secondary-300 justify-start text-left">
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`}></span>
          <span className="material-icons text-[14px] text-secondary-400">{online ? 'wifi' : 'wifi_off'}</span>
          <span>{online ? 'Online' : 'Offline'}</span>
        </span>
        <span className="text-secondary-700">|</span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className={`w-2 h-2 rounded-full ${syncStatusColor} ${realtimeSubscribed ? 'animate-pulse' : ''}`}></span>
          <span className={`material-icons text-[14px] ${syncEnabled ? (realtimeSubscribed ? 'text-primary-400' : 'text-yellow-400') : 'text-secondary-500'}`}>cloud</span>
          <span>{syncEnabled ? (realtimeSubscribed ? `Sincronizado (${time})` : 'Sincronizando...') : 'Sincronizão desativada'}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 w-full items-start text-left">
      <div className="flex items-center gap-2">
        <div className="relative w-6 h-6 flex items-center justify-center">
          <span className={`absolute left-0 top-0 w-2 h-2 rounded-full ${statusColor} animate-pulse`}></span>
          <span className="material-icons text-[16px] text-secondary-400">{online ? 'wifi' : 'wifi_off'}</span>
        </div>
        <span className="text-xs text-secondary-300">{online ? 'Online' : 'Offline'}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 flex items-center justify-center">
          <span className={`material-icons text-[16px] ${syncEnabled ? (realtimeSubscribed ? 'text-primary-400' : 'text-yellow-400') : 'text-secondary-500'}`}>cloud</span>
        </div>
        <span className="text-xs text-secondary-300">
          {syncEnabled 
            ? (realtimeSubscribed 
                ? <span className="flex items-center gap-1">
                    <span>Sincronizado</span>
                    <span className="text-secondary-400 text-[10px]">{time}</span>
                  </span> 
                : 'Sincronizando...')
            : 'Sincronizão desativada'}
        </span>
      </div>
    </div>
  )
}
