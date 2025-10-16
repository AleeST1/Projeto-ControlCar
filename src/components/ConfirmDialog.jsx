export default function ConfirmDialog({ open, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onCancel }) {
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      
      <div 
        className="relative glass-card rounded-xl border border-dark-100 shadow-lg max-w-sm w-full p-6"
        style={{
          animation: 'fadeIn 0.3s ease-out'
        }}
      >
        {title && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
              <span className="material-icons text-white">warning</span>
            </div>
            <div className="text-lg font-semibold text-white">{title}</div>
          </div>
        )}
        
        {message && (
          <div className="text-secondary-200 mb-6 pl-2">{message}</div>
        )}
        
        <div className="flex items-center justify-end gap-3 mt-2">
          <button 
            className="px-4 py-2 rounded-lg text-sm bg-dark-100 text-secondary-200 hover:bg-dark-300 transition-all duration-200" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          
          <button 
            className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 transition-all duration-200 flex items-center gap-1" 
            onClick={onConfirm}
          >
            <span className="material-icons text-sm">delete</span>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}