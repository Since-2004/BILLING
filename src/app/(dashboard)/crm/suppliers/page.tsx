import { getSuppliers } from '../actions'
import SupplierList from './SupplierList'

export default async function SuppliersPage() {
  const suppliers = await getSuppliers()

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Suppliers</h1>
          <p className="text-sm text-zinc-500">Manage your vendors and distributors.</p>
        </div>
      </div>

      <SupplierList initialSuppliers={suppliers} />
    </div>
  )
}
