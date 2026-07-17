import { getItems } from './actions'
import ItemList from './ItemList'

export default async function InventoryPage() {
  const items = await getItems()

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Inventory Items</h1>
          <p className="text-sm text-zinc-500">Manage your products, services, and prices.</p>
        </div>
      </div>

      <ItemList initialItems={items} />
    </div>
  )
}
