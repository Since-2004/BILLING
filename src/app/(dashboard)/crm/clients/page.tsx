import { getClients, getBranches, getItems } from '../actions'
import ClientList from './ClientList'

export default async function ClientsPage() {
  const clients = await getClients()
  const branches = await getBranches()
  const items = await getItems()

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Clients</h1>
          <p className="text-sm text-zinc-500">Manage your retail and wholesale customers.</p>
        </div>
      </div>

      <ClientList initialClients={clients} branches={branches} items={items} />
    </div>
  )
}
