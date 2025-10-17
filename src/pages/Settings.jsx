import PageHeader from '../components/PageHeader'

export default function Settings() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" subtitle="Ajustes gerais do aplicativo." />
      <div className="glass-card rounded-2xl p-5 text-sm text-secondary-200">
        Em breve: preferências de tema, sincronização e conta.
      </div>
    </div>
  )
}