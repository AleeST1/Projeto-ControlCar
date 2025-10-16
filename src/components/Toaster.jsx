import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'

export default function Toaster() {
  const toasts = useAppStore((s) => s.toasts)
  const dismissToast = useAppStore((s) => s.dismissToast)
  const scheduled = useRef(new Set())

  useEffect(() => {
    toasts.forEach((t) => {
      if (!scheduled.current.has(t.id)) {
        scheduled.current.add(t.id)
        const ms = t.timeoutMs ?? 4000
        const timer = setTimeout(() => {
          dismissToast(t.id)
          scheduled.current.delete(t.id)
        }, ms)
        // Cleanup if component unmounts
        return () => clearTimeout(timer)
      }
    })
  }, [toasts, dismissToast])

  if (!toasts || toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-xs sm:max-w-sm w-full">
      {toasts.map((t) => {
        const bgColor = t.type === 'success' 
          ? 'bg-green-500' 
          : t.type === 'error' 
            ? 'bg-red-500' 
            : t.type === 'info' 
              ? 'bg-primary-500' 
              : 'bg-blue-500';
        
        const icon = t.type === 'success' 
          ? 'check_circle' 
          : t.type === 'error' 
            ? 'error' 
            : t.type === 'info' 
              ? 'info' 
              : 'notifications';
        
        return (
          <div 
            key={t.id} 
            className="glass-card rounded-xl p-4 flex items-start gap-3 shadow-lg animate-fadeIn border border-dark-100"
            style={{
              animation: 'fadeIn 0.3s ease-out'
            }}
          >
            <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}>
              <span className="material-icons text-white text-sm">{icon}</span>
            </div>
            <div className="flex-1">
              <div className="text-sm text-white font-medium mb-0.5">
                {t.type === 'success' ? 'Sucesso' : t.type === 'error' ? 'Erro' : t.type === 'info' ? 'Informação' : 'Notificação'}
              </div>
              <div className="text-sm text-secondary-200">{t.message}</div>
            </div>
            <button 
              className="text-secondary-400 hover:text-white transition-colors p-1 rounded-full hover:bg-dark-300 flex-shrink-0" 
              onClick={() => dismissToast(t.id)}
            >
              <span className="material-icons text-sm">close</span>
            </button>
          </div>
        );
      })}
    </div>
  )
}