export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header mb-4">
      <div className="flex flex-col">
        <h2 className="page-title">{title}</h2>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  )}