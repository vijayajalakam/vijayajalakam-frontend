/**
 * Totals for rows from GET /api/invoices (service Invoice + product SalesInvoice merged).
 */

export function getUnifiedInvoiceRoundOff(row) {
  if (!row) return 0;
  const ro = Number(row.roundOffAmount);
  return Number.isFinite(ro) ? ro : 0;
}

export function getUnifiedInvoicePayableTotal(row) {
  if (!row) return 0;
  if (row.itemType === "Product") {
    const t = Number(row.totalAmount);
    if (Number.isFinite(t)) return Math.round(t * 100) / 100;
  }
  const base =
    Number(row.amount || 0) +
    Number(row.taxAmount || 0) -
    Number(row.discount || 0);
  const total = base + getUnifiedInvoiceRoundOff(row);
  return Math.round(total * 100) / 100;
}

export function getUnifiedInvoicePreRoundTotal(row) {
  const total = getUnifiedInvoicePayableTotal(row) - getUnifiedInvoiceRoundOff(row);
  return Math.round(total * 100) / 100;
}
