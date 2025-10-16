import { Link } from 'react-router-dom'

export default function EmptyState({ icon = 'info', title, description, actionText, to, onAction }) {
  return (
    <div className="card py-10 px-6 text-center flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-dark-200 border border-dark-100 flex items-center justify-center">
        <span className="material-icons text-secondary-300 text-xl">{icon}</span>
      </div>
      {title && <div className="text-white font-semibold text-lg mt-1">{title}</div>}
      {description && <p className="text-sm text-secondary-300 max-w-md">{description}</p>}
      {actionText && (
        to ? (
          <Link to={to} className="mt-2 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm flex items-center gap-1">
            <span className="material-icons text-sm">add</span>
            <span>{actionText}</span>
          </Link>
        ) : (
          <button onClick={onAction} className="mt-2 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm flex items-center gap-1">
            <span className="material-icons text-sm">add</span>
            <span>{actionText}</span>
          </button>
        )
      )}
    </div>
  )
}