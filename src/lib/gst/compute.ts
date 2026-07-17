export function computeLineGST(
  taxableAmountPaise: number,
  taxRatePct: number,
  sellerState: string,
  buyerState: string
) {
  const intraState = !buyerState || sellerState === buyerState
  if (intraState) {
    const cgst = Math.round(taxableAmountPaise * taxRatePct / 2) / 100
    const sgst = cgst
    return { cgst, sgst, igst: 0, total: cgst + sgst }
  } else {
    const igst = Math.round(taxableAmountPaise * taxRatePct) / 100
    return { cgst: 0, sgst: 0, igst, total: igst }
  }
}
