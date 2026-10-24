import React from "react";
import moment from "moment";
import { QRCodeSVG } from "qrcode.react";
import { useCurrency } from "../../../hooks/useCurrency";

const InvoicePrintLayout = ({
  shopInfo = {},
  staffName,
  invoiceNumber,
  cart,
  items,
  subTotal,
  discount,
  taxAmount,
  finalTotal,
  /** When set with showRoundOffInReceipt, shows a Round-off line before Total */
  roundOffAmount = 0,
  showRoundOffInReceipt = false,
  payments = [],
  // Extra payment info
  dueAmount = 0,
  overpaidAmount = 0,
  paymentStatus = "",
  paperSize = "80mm",
  fontSize = "small",
  // The invoice date/time to display – falls back to current time
  invoiceDate,
  // Toggles
  showLogo = true,
  showShopName = true,
  showLocation = true,
  showGSTNumber = true,
  showPhoneNumber = true,
  showBillerName = true,
  showCustomer = true,
  showItemCode = true,
  showItemName = true,
  showQuantity = true,
  showPrice = true,
  showTaxColumn = true,
  showItemDiscount = true,
  showSubTotal = true,
  showDiscount = true,
  showTaxSummary = true,
  showCGST = false,
  showSGST = false,
  showUPIID = false,
  showGreetingMessage = true,
  showPaymentBreakdown = true,
  showHSNCode = true,
  // Custom Dynamic Values
  customGST = "",
  customLocation = "",
  upiId = "",
  greetingMessage = "Thank you for your visit!",
  logoUrl = "",
  customerName = "",
  customerPhone = "",
}) => {
  const { formatDisplayNumber } = useCurrency();

  const widthClass =
    paperSize === "58mm"
      ? "w-[58mm]"
      : paperSize === "72mm"
        ? "w-[72mm]"
        : "w-[80mm]";

  // Font size mapping
  const fontSizeClass =
    fontSize === "large"
      ? "text-[17px]"
      : fontSize === "medium"
        ? "text-[15px]"
        : "text-[13px]";

  const hasItemColumns =
    showItemCode || showItemName || showQuantity || showPrice || showTaxColumn || showItemDiscount;

  const displayItems = cart || items || [];

  const isPreCalculated = staffName && staffName.includes(',');

  const itemStaffNames = isPreCalculated ? [] : Array.from(new Set(
    displayItems
      .map(i => {
        if (i.staffName) return i.staffName.toLowerCase() === 'admin' ? staffName : i.staffName;
        if (i.staff && i.staff.name) return i.staff.name;
        if (typeof i.staff === 'string') return i.staff.toLowerCase() === 'admin' ? staffName : i.staff;
        if (i.staffId && i.staffId.name) return i.staffId.name;
        if (typeof i.staffId === 'string') return i.staffId.toLowerCase() === 'admin' ? staffName : i.staffId;
        if (!i.staffId && !i.staffName && !i.staff) return staffName;
        return null;
      })
      .filter(name => name && name.trim() !== "")
  ));
  
  const finalStaffName = isPreCalculated 
    ? staffName 
    : (itemStaffNames.length > 0 ? itemStaffNames.join(", ") : staffName);

  // Use invoiceDate prop if available, otherwise fall back to current time
  const displayDate = invoiceDate
    ? moment(invoiceDate).format("DD/MM/YY hh:mm A")
    : moment().format("DD/MM/YY hh:mm A");

  // Check if any item has tax or discount to show those columns
  const hasTaxColumn = showTaxColumn && displayItems.some(i => i.taxName || i.taxRate || i.taxPercent || i.taxPercentage || i.tax > 0);
  const hasDiscColumn = showItemDiscount && displayItems.some(i => (Number(i.discount) || 0) > 0);

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              margin: 0;
              size: auto;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            #invoice-print-layout {
              margin: 0 auto !important;
              padding: 2mm !important;
              width: ${paperSize} !important;
              max-width: ${paperSize} !important;
              box-shadow: none !important;
              border: none !important;
              display: block !important;
              visibility: visible !important;
            }
            #invoice-print-layout-container {
              width: 100% !important;
              display: block !important;
              visibility: visible !important;
            }
          }
          /* Force table layout for reliable thermal printing */
          #invoice-print-layout table.receipt-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          #invoice-print-layout table.receipt-table td,
          #invoice-print-layout table.receipt-table th {
            padding: 1px 2px;
            vertical-align: top;
            word-break: break-word;
            overflow-wrap: break-word;
          }
          #invoice-print-layout .receipt-row {
            display: flex;
            justify-content: space-between;
            width: 100%;
          }
          #invoice-print-layout .receipt-row span {
            display: inline-block;
          }
        `}
      </style>
      <div id="invoice-print-layout-container">
        <div
          id="invoice-print-layout"
          className={`${widthClass} bg-white dark:bg-dark-surface p-2 font-mono text-black dark:text-white font-bold ${fontSizeClass} leading-tight mx-auto`}
        >
          {/* Header */}
          {(showLogo ||
            showShopName ||
            showLocation ||
            showPhoneNumber ||
            showGSTNumber) && (
              <div className="text-center space-y-1 mb-1">
                {showLogo && (
                  <div className="flex justify-center mb-1">
                    <div className="w-[90%] flex items-center justify-center bg-white dark:bg-dark-surface mx-auto overflow-hidden">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Logo"
                          className="w-full h-[140px] object-cover object-center bg-white dark:bg-dark-surface scale-[1.05]"
                          style={{ filter: "grayscale(100%) brightness(60%) contrast(1000%)" }}
                        />
                      ) : (
                        <img
                          src="https://png.pngtree.com/png-vector/ourmid/pngtree-crossed-camera-icon-image-is-not-available-message-restriction-forbidden-vector-png-image_44027682.jpg"
                          alt="No Image"
                          className="w-8 h-8 "
                        />
                      )}
                    </div>
                  </div>
                )}
                {showShopName && (
                  <h1 className="text-xl font-bold uppercase tracking-tight">
                    {shopInfo.name}
                  </h1>
                )}
                {showLocation && (
                  <p className="whitespace-pre-wrap  text-[12px]">
                    {customLocation || shopInfo.address}
                  </p>
                )}
                {showPhoneNumber && (
                  <p className="font-bold">Ph: {shopInfo.phone}</p>
                )}
                {showGSTNumber && (customGST || shopInfo.gstin) && (
                  <p className="text-[11px] uppercase tracking-wider ">
                    GSTIN: {customGST || shopInfo.gstin}
                  </p>
                )}
              </div>
            )}

          <div className="border-t border-dotted border-black my-2"></div>

          {/* Invoice Info - using table for reliable alignment */}
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
            <tbody>
              <tr>
                <td style={{ textAlign: 'left', padding: '1px 0', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>Invoice No:</td>
                <td style={{ textAlign: 'right', padding: '1px 0', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>{String(invoiceNumber || '').includes('#') ? invoiceNumber : `#${invoiceNumber}`}</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'left', padding: '1px 0', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>Date:</td>
                <td style={{ textAlign: 'right', padding: '1px 0', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>{displayDate}</td>
              </tr>
              {showBillerName && (
                <tr>
                  <td style={{ textAlign: 'left', padding: '1px 0', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>Staff:</td>
                  <td style={{ textAlign: 'right', padding: '1px 0', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>{finalStaffName}</td>
                </tr>
              )}
              {showCustomer && customerName && customerName.toUpperCase() !== "LOCAL CUSTOMER" && (
                <>
                  <tr>
                    <td style={{ textAlign: 'left', padding: '1px 0', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>Customer:</td>
                    <td style={{ textAlign: 'right', padding: '1px 0', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>{customerName}</td>
                  </tr>
                  {customerPhone && (
                    <tr>
                      <td style={{ textAlign: 'left', padding: '1px 0', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>Phone:</td>
                      <td style={{ textAlign: 'right', padding: '1px 0', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>{customerPhone}</td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>

          <div className="border-t border-dotted border-black my-2" style={{ margin: '6px 0' }}></div>

          {/* Items Table - using HTML table for reliable thermal printing */}
          {hasItemColumns && (
            <table className="receipt-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1px dotted black', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>
                  <th style={{ textAlign: 'left', padding: '0 1px 4px 0', width: showQuantity || showPrice || hasTaxColumn || hasDiscColumn ? '30%' : '50%' }}>ITEM</th>
                  {showQuantity && <th style={{ textAlign: 'right', padding: '0 1px 4px', width: '12%' }}>QTY</th>}
                  {showPrice && <th style={{ textAlign: 'right', padding: '0 1px 4px', width: '18%' }}>PRICE</th>}
                  {hasTaxColumn && <th style={{ textAlign: 'right', padding: '0 1px 4px', width: '12%' }}>TAX</th>}
                  {hasDiscColumn && <th style={{ textAlign: 'right', padding: '0 1px 4px', width: '14%' }}>DISC</th>}
                  <th style={{ textAlign: 'right', padding: '0 0 4px 1px', width: '20%' }}>AMT</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item, index) => {
                  const itemName = item.name || item.productName || "Item";
                  const itemQty = item.quantity || item.qty || 0;
                  const itemPrice = item.price || 0;
                  const itemDisc = Number(item.discount) || 0;
                  const itemTotal =
                    item.total || item.amount || (itemQty * itemPrice - itemDisc);

                  return (
                    <React.Fragment key={index}>
                      {/* Item name row */}
                      <tr>
                        <td colSpan={
                          1 +
                          (showQuantity ? 1 : 0) +
                          (showPrice ? 1 : 0) +
                          (hasTaxColumn ? 1 : 0) +
                          (hasDiscColumn ? 1 : 0) +
                          1
                        } style={{ padding: '4px 0 0 0', fontWeight: 'bold', fontSize: '13px', lineHeight: '1.2' }}>
                          {showItemCode && (
                            <span style={{ marginRight: '4px' }}>{index + 1}.</span>
                          )}
                          {showItemName && itemName}
                          {item.variantName &&
                            !String(itemName || "").includes(item.variantName) && (
                              <span style={{ fontSize: '11px', marginLeft: '4px', color: '#333' }}>
                                - {item.variantName}
                              </span>
                            )}
                          {showHSNCode && item.hsnCode && (
                            <div style={{ fontSize: '10px', color: '#666', marginTop: '1px' }}>
                              (HSN: {item.hsnCode})
                            </div>
                          )}
                        </td>
                      </tr>
                      {/* Item values row */}
                      <tr style={{ borderBottom: index === displayItems.length - 1 ? 'none' : '1px dotted black' }}>
                        <td style={{ padding: '0 0 4px 0' }}></td>
                        {showQuantity && (
                          <td style={{ textAlign: 'right', padding: '0 1px 4px', fontWeight: 'bold', fontSize: '12px' }}>
                            {itemQty}
                          </td>
                        )}
                        {showPrice && (
                          <td style={{ textAlign: 'right', padding: '0 1px 4px', fontSize: '12px' }}>
                            {formatDisplayNumber(itemPrice)}
                          </td>
                        )}
                        {hasTaxColumn && (
                          <td style={{ textAlign: 'right', padding: '0 1px 4px', fontSize: '12px' }}>
                            {(item.taxPercent || item.taxPercentage)
                              ? `${item.taxPercent || item.taxPercentage}%`
                              : item.taxRate
                                ? `${item.taxRate}%`
                                : item.tax > 0
                                  ? `${Math.round((item.tax / (itemPrice * itemQty)) * 100)}%`
                                  : "-"}
                          </td>
                        )}
                        {hasDiscColumn && (
                          <td style={{ textAlign: 'right', padding: '0 1px 4px', fontSize: '12px', fontWeight: itemDisc > 0 ? 'bold' : 'normal' }}>
                            {itemDisc > 0 ? `-${formatDisplayNumber(itemDisc)}` : "-"}
                          </td>
                        )}
                        <td style={{ textAlign: 'right', padding: '0 0 4px 1px', fontWeight: 'bold', fontSize: '13px' }}>
                          {formatDisplayNumber(itemTotal)}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="border-t border-dotted border-black" style={{ margin: '8px 0 6px' }}></div>

          {/* Totals - using table for reliable alignment */}
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <tbody>
              {showSubTotal && (
                <tr>
                  <td style={{ textAlign: 'left', padding: '2px 0', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>SUB TOTAL</td>
                  <td style={{ textAlign: 'right', padding: '2px 0', fontSize: '14px', fontWeight: 'bold' }}>{formatDisplayNumber(subTotal)}</td>
                </tr>
              )}
              {showCGST && taxAmount > 0 && (
                <tr>
                  <td style={{ textAlign: 'left', padding: '2px 0', fontSize: '14px', fontWeight: 'bold' }}>CGST</td>
                  <td style={{ textAlign: 'right', padding: '2px 0', fontSize: '14px', fontWeight: 'bold' }}>+{formatDisplayNumber(taxAmount / 2)}</td>
                </tr>
              )}
              {showSGST && taxAmount > 0 && (
                <tr>
                  <td style={{ textAlign: 'left', padding: '2px 0', fontSize: '14px', fontWeight: 'bold' }}>SGST</td>
                  <td style={{ textAlign: 'right', padding: '2px 0', fontSize: '14px', fontWeight: 'bold' }}>+{formatDisplayNumber(taxAmount / 2)}</td>
                </tr>
              )}
              {showTaxSummary && taxAmount > 0 && (
                <tr>
                  <td style={{ textAlign: 'left', padding: '2px 0', fontSize: '14px', fontWeight: 'bold' }}>Tax</td>
                  <td style={{ textAlign: 'right', padding: '2px 0', fontSize: '14px', fontWeight: 'bold' }}>+{formatDisplayNumber(taxAmount)}</td>
                </tr>
              )}
              {showDiscount && (() => {
                const itemDiscTotal = displayItems.reduce((s, i) => s + (Number(i.discount) || 0), 0);
                const totalDisc = itemDiscTotal + (Number(discount) || 0);
                if (totalDisc > 0) {
                  return (
                    <tr>
                      <td style={{ textAlign: 'left', padding: '2px 0', fontSize: '14px', fontWeight: 'bold' }}>Total Discount</td>
                      <td style={{ textAlign: 'right', padding: '2px 0', fontSize: '14px', fontWeight: 'bold' }}>-{formatDisplayNumber(totalDisc)}</td>
                    </tr>
                  );
                }
                return null;
              })()}
              {showRoundOffInReceipt &&
                Math.abs(Number(roundOffAmount) || 0) > 0.0001 && (
                  <tr>
                    <td style={{ textAlign: 'left', padding: '2px 0', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>Round-off</td>
                    <td style={{ textAlign: 'right', padding: '2px 0', fontSize: '14px', fontWeight: 'bold' }}>
                      {(Number(roundOffAmount) || 0) > 0 ? "+" : ""}
                      {formatDisplayNumber(roundOffAmount)}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>

          {/* TOTAL row */}
          <div style={{ borderTop: '1px dotted black', paddingTop: '6px', marginTop: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'left', fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.025em' }}>Total</td>
                  <td style={{ textAlign: 'right', fontSize: '18px', fontWeight: '900' }}>{formatDisplayNumber(finalTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* --- Payment Breakdown --- */}
          {showPaymentBreakdown && (() => {
            const paymentsList = Array.isArray(payments) ? payments : [];
            const totalPaidAmount = Number(paymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2));
            const numericTotal = Number(Number(finalTotal).toFixed(2)) || 0;
            const safeDueAmount = Number(Number(dueAmount || 0).toFixed(2));
            const computedDue = safeDueAmount > 0 ? safeDueAmount : Math.max(0, Number((numericTotal - totalPaidAmount).toFixed(2)));
            const safeOverpaid = Number(Number(overpaidAmount || 0).toFixed(2));
            const computedOverpaid = safeOverpaid > 0 ? safeOverpaid : Math.max(0, Number((totalPaidAmount - numericTotal).toFixed(2)));

            if (paymentsList.length === 0 && computedDue === 0 && computedOverpaid === 0) return null;

            // Group by method
            const methodMap = {};
            paymentsList.forEach((p) => {
              const m = p.method || "Cash";
              if (!methodMap[m]) methodMap[m] = 0;
              methodMap[m] += Number(p.amount) || 0;
            });

            return (
              <div style={{ borderTop: '1px dotted black', paddingTop: '5px', marginTop: '5px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                  Payment Details
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <tbody>
                    {Object.entries(methodMap).map(([method, amount], idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'left', padding: '1px 0', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>
                          {method === "WALLET"
                            ? "Wallet"
                            : method === "UPI"
                              ? "UPI"
                              : method === "CASH"
                                ? "Cash"
                                : method}
                        </td>
                        <td style={{ textAlign: 'right', padding: '1px 0', fontSize: '14px', fontWeight: 'bold' }}>{formatDisplayNumber(amount)}</td>
                      </tr>
                    ))}
                    {paymentsList.length === 0 && totalPaidAmount === 0 && (
                      <tr>
                        <td style={{ textAlign: 'left', padding: '1px 0', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>Paid</td>
                        <td style={{ textAlign: 'right', padding: '1px 0', fontSize: '14px', fontWeight: 'bold' }}>{formatDisplayNumber(numericTotal)}</td>
                      </tr>
                    )}
                    {computedDue > 0 && (
                      <tr style={{ borderTop: '1px dotted black' }}>
                        <td style={{ textAlign: 'left', padding: '3px 0 1px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>Balance Due</td>
                        <td style={{ textAlign: 'right', padding: '3px 0 1px', fontSize: '14px', fontWeight: 'bold' }}>{formatDisplayNumber(computedDue)}</td>
                      </tr>
                    )}
                    {computedOverpaid > 0 && (
                      <tr style={{ borderTop: '1px dotted black' }}>
                        <td style={{ textAlign: 'left', padding: '3px 0 1px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>Overpaid (Wallet Credit)</td>
                        <td style={{ textAlign: 'right', padding: '3px 0 1px', fontSize: '14px', fontWeight: 'bold' }}>{formatDisplayNumber(computedOverpaid)}</td>
                      </tr>
                    )}
                    {paymentStatus && (
                      <tr>
                        <td style={{ textAlign: 'left', padding: '3px 0 1px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</td>
                        <td style={{ textAlign: 'right', padding: '3px 0 1px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>{paymentStatus}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {showUPIID && upiId && (
            <div className="mt-4 flex flex-col items-center">
              <div className="p-1 border border-dotted border-black rounded-lg mb-1 bg-white dark:bg-dark-surface">
                <QRCodeSVG
                  value={`upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopInfo?.name || "Shop")}&am=${finalTotal > 0 ? finalTotal : ""}&cu=INR`}
                  size={80}
                  level="M"
                />
              </div>
              <span className="text-[10px] font-bold text-black dark:text-white uppercase tracking-widest mt-1">
                Scan to Pay
              </span>
              <span className="text-[9px] font-medium text-gray-800 dark:text-gray-100 uppercase tracking-widest mt-0.5">
                {upiId}
              </span>
            </div>
          )}

          <div className="border-t border-dotted border-black my-3"></div>

          {/* Footer */}
          <div className="text-center space-y-1 ">
            {showGreetingMessage && (
              <p className="text-[13px] font-bold whitespace-pre-wrap">
                {greetingMessage || "Thank you for your visit!"}
              </p>
            )}
            <p className="text-[10.5px] font-black tracking-[0.3em]  mt-3">
              powered by vijayajalakam.com
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoicePrintLayout;
