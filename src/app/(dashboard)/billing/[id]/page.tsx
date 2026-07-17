import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintButton from './PrintButton'

export default async function InvoicePrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const tx = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      payments: true,
      branch: true,
    }
  })
  if (!tx) return notFound()

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { company: true }
  })

  const company = dbUser?.company
  const client = tx.party_id ? await prisma.client.findUnique({ where: { id: tx.party_id } }) : null

  const isHeadOffice = tx.branch?.name?.toLowerCase() === 'head office'
  const useBranchDetails = company?.invoice_use_branch_name
  
  const displayName = useBranchDetails
    ? (tx.branch?.name || company?.name)
    : (isHeadOffice ? (company?.name || tx.branch?.name) : (tx.branch?.name || company?.name))
    
  const displayAddress = useBranchDetails
    ? (tx.branch?.address || company?.address)
    : (isHeadOffice ? (company?.address || tx.branch?.address) : (tx.branch?.address || company?.address))
    
  const displayGstin = useBranchDetails
    ? (tx.branch?.gstin || company?.gstin)
    : (isHeadOffice ? (company?.gstin || tx.branch?.gstin) : (tx.branch?.gstin || company?.gstin))

  // Check if notes contains a DC number
  let dcNumber = null
  if (tx.notes && tx.notes.startsWith('DC No:')) {
    dcNumber = tx.notes.replace('DC No:', '').trim()
  }

  // Function to format paise to rupees string
  const formatRupees = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100)
  }

  const subtotal = tx.subtotal
  const discount = tx.discount
  const taxAmount = tx.tax_amount
  const total = tx.total
  const amountPaid = tx.amount_paid
  const balance = total - amountPaid

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-zinc-50 dark:bg-zinc-950/20 py-6">
      {/* Print actions header (hidden during printing) */}
      <PrintButton id={tx.id} transactionNo={tx.transaction_no} />

      {/* A4 Invoice Container */}
      <div className="max-w-3xl mx-auto p-8 my-6 bg-white border border-zinc-200 shadow rounded-xl print:shadow-none print:border-none print:my-0 text-zinc-900" id="invoice">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-start gap-4">
            {company?.logo_url && (
              <img src={company.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-zinc-200 bg-zinc-50 p-1" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{displayName}</h1>
              <p className="text-sm text-zinc-500 mt-1 max-w-sm whitespace-pre-line">{displayAddress}</p>
              {displayGstin && <p className="text-sm text-zinc-500 font-semibold mt-1">GSTIN: {displayGstin}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-blue-600 tracking-wider">
              {tx.tax_amount > 0 ? 'TAX INVOICE' : 'BILL'}
            </p>
            <p className="text-lg font-mono font-bold text-zinc-900 mt-1">{tx.transaction_no}</p>
            <p className="text-sm text-zinc-500">Date: {new Date(tx.date).toLocaleDateString('en-IN')}</p>
            {dcNumber && <p className="text-sm text-zinc-700 font-bold mt-1">DC No: {dcNumber}</p>}
          </div>
        </div>

        {/* Bill To & Payment Info */}
        <div className="grid grid-cols-2 gap-8 mb-8 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">Bill To</p>
            <p className="font-bold text-zinc-900 text-base">{tx.party_name || 'Walk-in Customer'}</p>
            {client?.phone && <p className="text-sm text-zinc-500">{client.phone}</p>}
            {client?.gstin && <p className="text-sm text-zinc-500 font-semibold">GSTIN: {client.gstin}</p>}
            {client?.address && <p className="text-sm text-zinc-500 mt-1">{client.address}</p>}
          </div>
          <div className="flex flex-col justify-between items-end text-right">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">Payment Method</p>
              <p className="text-sm text-zinc-900 font-bold">{tx.payments?.[0]?.mode || 'CASH'}</p>
            </div>
            <div className="mt-4">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${balance <= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {balance <= 0 ? 'FULLY PAID' : `UNPAID BALANCE: ${formatRupees(balance)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-hidden border border-zinc-200 rounded-xl mb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-900 text-white text-xs">
                <th className="px-4 py-3 text-left font-semibold">#</th>
                <th className="px-4 py-3 text-left font-semibold">Description</th>
                <th className="px-4 py-3 text-center font-semibold">Qty</th>
                <th className="px-4 py-3 text-right font-semibold">Rate</th>
                {tx.tax_amount > 0 && <th className="px-4 py-3 text-right font-semibold">Tax%</th>}
                {tx.tax_amount > 0 && <th className="px-4 py-3 text-right font-semibold">Tax Amt</th>}
                <th className="px-4 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {tx.items.map((item, i) => (
                <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900">{item.item_name}</td>
                  <td className="px-4 py-3 text-center font-mono">{item.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatRupees(item.rate)}</td>
                  {tx.tax_amount > 0 && <td className="px-4 py-3 text-right font-mono">{item.tax_rate}%</td>}
                  {tx.tax_amount > 0 && <td className="px-4 py-3 text-right font-mono text-zinc-500">{formatRupees(item.tax_amount)}</td>}
                  <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900">{formatRupees(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Bank Details Row */}
        <div className="grid grid-cols-2 gap-8 mb-8 pt-4 border-t border-zinc-100">
          {/* Left: Bank Details */}
          <div>
            {tx.branch?.bank_name ? (
              <div className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/10 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
                <p className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-1.5 text-[10px]">Bank Account Details</p>
                <p><span className="font-semibold text-zinc-600 dark:text-zinc-400">Bank:</span> {tx.branch.bank_name}</p>
                <p><span className="font-semibold text-zinc-600 dark:text-zinc-400">A/C No:</span> <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{tx.branch.bank_account_no}</span></p>
                {tx.branch.bank_ifsc && <p><span className="font-semibold text-zinc-600 dark:text-zinc-400">IFSC:</span> <span className="font-mono text-zinc-800 dark:text-zinc-200">{tx.branch.bank_ifsc}</span></p>}
                {tx.branch.bank_branch && <p><span className="font-semibold text-zinc-600 dark:text-zinc-400">Branch:</span> {tx.branch.bank_branch}</p>}
              </div>
            ) : (
              <div className="text-xs text-zinc-400 italic">
                No bank account details configured for this branch.
              </div>
            )}
          </div>

          {/* Right: Totals summary */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-zinc-500">
              <span>Subtotal (Pre-tax)</span>
              <span className="font-mono">{formatRupees(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-red-600 font-semibold">
                <span>Discount</span>
                <span className="font-mono">-{formatRupees(discount)}</span>
              </div>
            )}
            {tx.tax_amount > 0 && (
              <>
                <div className="flex justify-between text-zinc-500">
                  <span>CGST (Central Tax)</span>
                  <span className="font-mono">{formatRupees(Math.round(taxAmount / 2))}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>SGST (State Tax)</span>
                  <span className="font-mono">{formatRupees(Math.round(taxAmount / 2))}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-zinc-900 text-zinc-900 dark:text-zinc-100">
              <span>Grand Total</span>
              <span className="font-mono text-blue-600">{formatRupees(total)}</span>
            </div>
          </div>
        </div>

        {/* Signature Area */}
        <div className="grid grid-cols-2 gap-8 mt-12 mb-6 pt-6 text-xs text-zinc-700 font-semibold">
          <div className="text-left space-y-12">
            <div className="border-t border-zinc-200 w-48 pt-1.5 text-center font-semibold">
              Customer&apos;s Signature
            </div>
          </div>
          <div className="text-right flex flex-col items-end space-y-2">
            <div>
              FOR <span className="font-bold uppercase">{displayName}</span>
            </div>
            <div className="h-12 flex items-center justify-center">
              {tx.branch?.digital_sign_url ? (
                <img src={tx.branch.digital_sign_url} alt="Signature" className="h-12 object-contain" />
              ) : (
                <div className="h-8" />
              )}
            </div>
            <div className="border-t border-zinc-200 w-48 pt-1.5 text-center font-semibold">
              Authorised Signatory
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 pt-6 text-center text-xs text-zinc-400">
          <p className="font-semibold text-zinc-500">Thank you for your business!</p>
          <p className="mt-1">This is a computer-generated tax invoice and does not require a physical signature.</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #invoice, #invoice * { visibility: visible; }
          #invoice { position: absolute; left: 0; top: 0; width: 100%; margin: 0; border: none; padding: 0; }
        }
      ` }} />
    </div>
  )
}
