import { useState } from 'react'

export default function FilterBar({
  searchValue,
  onSearchChange,
  vehicleOptions,
  vehicleValue,
  onVehicleChange,
  advancedChildren,
  actions,
}) {
  const hasAdvanced = !!advancedChildren
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {vehicleOptions && onVehicleChange != null && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-secondary-300">Filtrar por veículo</span>
            <select
              className="rounded-lg border border-dark-100 bg-dark-300 px-3 py-2 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              value={vehicleValue ?? ''}
              onChange={(e) => onVehicleChange(e.target.value)}
            >
              {vehicleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        )}

        {onSearchChange && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-secondary-300">Buscar</span>
            <input
              className="rounded-lg border border-dark-100 bg-dark-300 px-3 py-2 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
              type="text"
              placeholder="Buscar…"
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </label>
        )}

        {hasAdvanced && (
          <div className="flex items-end">
            <button
              className="w-full px-3 py-2 rounded-lg bg-dark-200 border border-dark-300 text-sm hover:bg-dark-300"
              onClick={() => setShowAdvanced((s) => !s)}
            >
              {showAdvanced ? 'Ocultar filtros avançados' : 'Mostrar filtros avançados'}
            </button>
          </div>
        )}
      </div>

      {hasAdvanced && showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {advancedChildren}
        </div>
      )}

      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}