import React, { useState, useEffect, useMemo } from "react";
import api from "../../../api/axiosInstance";
import {
  useGetInvoicesQuery,
  useGetInvoiceMetadataQuery,
  useCancelInvoiceMutation,
} from "../../../store/api/tenantEndpoints";
import {
  Download,
  Package,
  Edit3,
  XCircle,
  Eye,
  Loader2,
  FileText,
  Search,
  Filter,
  Calendar,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import CustomTable from "../../../components/shared/CustomTable";
import InvoiceFilterModal from "../../../components/shared/InvoiceFilterModal";
import InvoicePreviewSheet from "../../../components/shared/InvoicePreviewSheet";
import ReportLayout from "../../../components/shared/ReportLayout";
import ReportSummaryCard from "../../../components/shared/ReportSummaryCard";
import Snackbar from "../../../components/shared/Snackbar";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { usePagination } from "../../../hooks/usePagination";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  getUnifiedInvoicePayableTotal,
} from "../../../utils/unifiedInvoiceTotals";

const InvoiceReport = () => {
  const { user, currencySymbol, hasPermission } = useAuth();
  const { formatDisplayNumber } = useCurrency();
  const navigate = useNavigate();
  const { shopSlug } = useParams();
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const { data: metaData } = useGetInvoiceMetadataQuery();
  const [cancelInvoiceMutation] = useCancelInvoiceMutation();

  const allServices = metaData?.services || [];
  const allProducts = metaData?.products || [];
  const allBranches = metaData?.branches || [];
  const allCustomers = metaData?.customers || [];
  const paymentMethods = metaData?.paymentMethods || [];

  const allStaff = useMemo(() => {
    if (!metaData?.staff) return [];
    if (user?.role === "staff") {
      return [{ _id: user._id || user.id, name: user.name }];
    } else {
      return [
        { _id: "ADMIN", name: user?.name || "Owner" },
        ...metaData.staff,
      ];
    }
  }, [metaData?.staff, user]);

  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });


  const todayDate = new Date();
  const today = todayDate.toLocaleDateString("en-CA");

  const [filters, setFilters] = useState({
    services: [],
    products: [],
    branches: [],
    staff: [],
    customers: [],
    paymentMethod: [],
    startDate: today,
    endDate: today,
  });

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append("page", pagination.page);
    params.append("limit", pagination.limit);
    if (searchTerm) params.append("search", searchTerm);

    if (activeTab !== "all") {
      if (
        activeTab === "Due" ||
        activeTab === "Partial" ||
        activeTab === "due-info"
      ) {
        params.append("paymentStatus", "Partial,Pending");
      } else if (activeTab === "Paid") {
        params.append("paymentStatus", "Paid");
      } else if (activeTab === "tax-info") {
        params.append("hasTax", "true");
      } else if (activeTab === "discount-info") {
        params.append("hasDiscount", "true");
      } else {
        params.append("paymentMethod", activeTab); 
      }
    }

    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
    if (filters.paymentMethod.length > 0) {
      const methods = filters.paymentMethod.filter((m) => m !== "Due");
      if (methods.length > 0)
        params.append("paymentMethod", methods.join(","));
      if (filters.paymentMethod.includes("Due"))
        params.append("paymentStatus", "Partial,Pending");
    }
    if (filters.services.length > 0)
      params.append("services", filters.services.join(","));
    if (filters.products?.length > 0)
      params.append("products", filters.products.join(","));
    if (filters.branches?.length > 0)
      params.append("shops", filters.branches.join(","));
    if (filters.staff?.length > 0)
      params.append("staffId", filters.staff.join(","));
    if (filters.customers?.length > 0)
      params.append("customerId", filters.customers.join(","));

    return params.toString();
  }, [pagination.page, pagination.limit, searchTerm, activeTab, filters]);

  const { data: invoicesData, isFetching: loading, refetch: fetchInvoices } = useGetInvoicesQuery(queryParams);
  const invoices = useMemo(() => invoicesData?.data || [], [invoicesData]);
  const reportSummary = invoicesData?.summary || null;

  useEffect(() => {
    if (invoicesData?.pagination) {
      updatePagination(invoicesData.pagination);
    }
  }, [invoicesData, updatePagination]);

  useEffect(() => {
    resetPagination();
  }, [activeTab, searchTerm, filters, resetPagination]);

  const handleDownload = async (id, invoiceNumber, date) => {
    setActionLoadingId(id);
    try {
      const res = await api.get(`/invoices/${id}/download`, {
        responseType: "blob",
      });
      const dateStr = date ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
      const filename = `${invoiceNumber || id}${dateStr ? `-${dateStr}` : ""}.pdf`;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      showSnack("Failed to download invoice", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleShare = async (id, invoiceNumber, date) => {
    setActionLoadingId(id);
    try {
      const res = await api.get(`/invoices/${id}/download`, {
        responseType: "blob",
      });
      const dateStr = date ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
      const filename = `${invoiceNumber || id}${dateStr ? `-${dateStr}` : ""}.pdf`;
      const blob = new Blob([res.data], { type: "application/pdf" });
      const file = new File([blob], filename, {
        type: "application/pdf",
      });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice #${invoiceNumber || id}`,
          text: `Invoice #${invoiceNumber || id} from ${dateStr || ""}`,
        });
      } else if (navigator.share) {
        await navigator.share({
          title: `Invoice #${invoiceNumber || id}`,
          text: `Invoice #${invoiceNumber || id} from ${dateStr || ""}`,
          url: window.location.origin + `/api/invoices/${id}/download`,
        });
      } else {
        showSnack("Sharing not supported on this browser", "error");
      }
    } catch (err) {
      console.error("Sharing failed", err);
      showSnack("Failed to share invoice", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEdit = (invoiceId) => {
    const basePath = shopSlug ? `/${shopSlug}` : "";
    const portalRole = window.location.pathname.includes('/shop-admin') ? 'shop-admin' : 'staff';
    navigate(`${basePath}/${portalRole}/invoice?edit=${invoiceId}`);
  };

  const handleCancelInvoice = async (id) => {
    try {
      await cancelInvoiceMutation(id).unwrap();
      setCancelConfirm(null);
    } catch (err) {
      showSnack(
        err.data?.message || err.message || "Failed to cancel invoice",
        "error",
      );
    }
  };

  const getPaymentMethodDisplay = (row) => {
    let methods = [];
    if (row.payments && row.payments.length > 0) {
      methods = [...new Set(row.payments.filter(p => p.amount > 0).map((p) => p.method))];
    } else if (row.paymentMethod) {
      methods = [row.paymentMethod];
    }

    if (row.dueAmount > 0) {
      methods.push("DUE");
    }

    if (methods.length > 0) {
      return methods.join(" + ");
    }
    
    return "N/A";
  };

    const getStaffNames = (row) => {
      if (!row) return [];
      const names = new Set();
      const adminName = row.createdBy?.name || "Owner";
  
      const addName = (name) => {
      if (!name) return;
      if (typeof name === 'string' && name.toLowerCase() === 'admin') {
        names.add(adminName);
      } else {
        names.add(name);
      }
    };

    // 1. Check direct items
    if (row.items && row.items.length > 0) {
      row.items.forEach(item => {
        if (item.staffId && item.staffId.name) {
          addName(item.staffId.name);
        } else if (typeof item.staffId === 'string') {
          addName(item.staffId);
        } else if (item.staffName) {
          addName(item.staffName);
        } else if (typeof item.staff === 'string') {
          addName(item.staff);
        } else if (!item.staffId && !item.staffName && !item.staff) {
          addName(adminName);
        }
      });
    }

    // 2. Check appointment services (for services vs products)
    if (row.appointment && row.appointment.services && row.appointment.services.length > 0) {
      row.appointment.services.forEach(service => {
        if (service.staffId && service.staffId.name) {
          addName(service.staffId.name);
        } else if (service.staffName) {
          addName(service.staffName);
        }
      });
    }

    // 3. Check staffCommissions (fallback for manual overrides or older structures)
    if (names.size === 0 && row.staffCommissions && row.staffCommissions.length > 0) {
      row.staffCommissions.forEach(sc => addName(sc.staffName));
    }

    // 4. Fallback to top-level staff/creator
    if (names.size === 0) {
      names.add(adminName);
    }

    return Array.from(names);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", 1);
      params.append("limit", 100000); // Fetch all for export
      if (searchTerm) params.append("search", searchTerm);

      if (activeTab !== "all") {
        if (activeTab === "Due/Unpaid") {
          params.append("paymentStatus", "Partial,Pending");
        } else if (["Paid", "Partial", "Pending"].includes(activeTab)) {
          params.append("paymentStatus", activeTab);
        } else {
          params.append("paymentMethod", activeTab);
        }
      }

      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.paymentMethod.length > 0)
        params.append("paymentMethod", filters.paymentMethod.join(","));
      if (filters.services.length > 0)
        params.append("services", filters.services.join(","));
      if (filters.products?.length > 0)
        params.append("products", filters.products.join(","));
      if (filters.branches?.length > 0)
        params.append("shops", filters.branches.join(","));
      if (filters.staff?.length > 0)
        params.append("staffId", filters.staff.join(","));
      if (filters.customers?.length > 0)
        params.append("customerId", filters.customers.join(","));

      const res = await api.get(`/invoices?${params.toString()}`);
      if (res.data.success) {
        const exportData = res.data.data || [];
        
        let totalTaxable = 0;
        let totalDiscount = 0;
        let totalTax = 0;
        let totalReturn = 0;
        let totalRoundOff = 0;
        let totalAmount = 0;
        
        exportData.forEach((inv, idx) => {
           inv.slNo = idx + 1;
           const tax = Number(inv.taxAmount || 0);
           const disc = Number(inv.discount || 0);
           const roundOff = Number(inv.roundOff || 0);
           
           const payable = getUnifiedInvoicePayableTotal(inv);
           const taxable = payable + disc - tax - roundOff;
           
           totalTaxable += taxable;
           totalDiscount += disc;
           totalTax += tax;
           totalRoundOff += roundOff;
           totalAmount += payable;
           totalReturn += Number(inv.returnAmount || 0);
        });

        const customSummary = {
           "Total Taxable": `${currencySymbol} ${formatDisplayNumber(totalTaxable)}`,
           "Total Discount": `${currencySymbol} ${formatDisplayNumber(totalDiscount)}`,
           "Total Tax": `${currencySymbol} ${formatDisplayNumber(totalTax)}`,
           "Total Invoice": String(exportData.length),
           "Total Return": String(totalReturn),
           "Round Off": `${currencySymbol} ${formatDisplayNumber(totalRoundOff)}`,
           "Total Amount": `${currencySymbol} ${formatDisplayNumber(totalAmount)}`,
           "TOTAL SALES": `${currencySymbol} ${formatDisplayNumber(totalAmount)}`
        };

        return { data: exportData, summaryDataOverride: customSummary };
      }
      return [];
    } catch (err) {
      console.error("Export fetch failed", err);
      return [];
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.map((inv, index) => ({
      ...inv,
      slNo: (pagination.page - 1) * pagination.limit + index + 1,
    }));
  }, [invoices, pagination.page, pagination.limit]);

  const summaryData = useMemo(() => {
    const methodColors = [
      "#3b82f6",
      "#8b5cf6",
      "#ec4899",
      "#14b8a6",
      "#f97316",
    ];

    if (reportSummary) {
      const extraSegments = [];
      const baseSegments = (reportSummary.segments || []).map((s, idx) => ({
        ...s,
        color: methodColors[idx % methodColors.length],
        inProgressBar: true,
      }));

      // Add Due segment
      if (reportSummary.due > 0) {
        extraSegments.push({
          id: "due-info",
          label: "Due",
          value: reportSummary.due,
          count:
            (reportSummary.counts?.partial || 0) +
            (reportSummary.counts?.pending || 0),
          color: "#e11d48", // Rose 600
          inProgressBar: false,
        });
      }

      // Add Tax and Discount as informative segments (not in progress bar)
      if (reportSummary.tax > 0) {
        extraSegments.push({
          id: "tax-info",
          label: "Tax",
          value: reportSummary.tax,
          count: reportSummary.counts?.tax || 0,
          color: "#10b981", // Emerald
          inProgressBar: false,
        });
      }
      if (reportSummary.discount > 0) {
        extraSegments.push({
          id: "discount-info",
          label: "Discount",
          value: reportSummary.discount,
          count: reportSummary.counts?.all || 0,
          color: "#f43f5e", // Rose
          inProgressBar: false,
        });
      }

      return {
        total: reportSummary.total,
        paid: reportSummary.paid,
        due: reportSummary.due,
        count: reportSummary.counts?.all || pagination.total,
        segments: [...baseSegments, ...extraSegments],
      };
    }

    const total = invoices.reduce(
      (acc, curr) => acc + getUnifiedInvoicePayableTotal(curr),
      0,
    );
    const paid = invoices.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
    const due = Math.max(0, total - paid);

    const methodsMap = {};
    invoices.forEach((inv) => {
      let invMethods = new Set();
      if (inv.payments && inv.payments.length > 0) {
        inv.payments.forEach((p) => {
          if (!methodsMap[p.method])
            methodsMap[p.method] = { count: 0, value: 0 };
          methodsMap[p.method].value += p.amount || 0;
          invMethods.add(p.method);
        });
      } else if (
        inv.paymentMethod &&
        inv.paymentMethod !== "Split" &&
        inv.paidAmount > 0
      ) {
        if (!methodsMap[inv.paymentMethod])
          methodsMap[inv.paymentMethod] = { count: 0, value: 0 };
        methodsMap[inv.paymentMethod].value += inv.paidAmount || 0;
        invMethods.add(inv.paymentMethod);
      }

      invMethods.forEach((m) => {
        methodsMap[m].count += 1;
      });
    });

    const methodSegments = Object.keys(methodsMap).map((method, idx) => ({
      id: method,
      label: method,
      count: methodsMap[method].count,
      value: methodsMap[method].value,
      color: methodColors[idx % methodColors.length],
      textColor: "text-gray-900 dark:text-white",
      inProgressBar: true,
    }));

    return {
      total,
      segments: [
        {
          id: "Paid",
          label: "Paid",
          count: invoices.filter((i) => i.paymentStatus === "Paid").length,
          value: paid,
          color: "#10b981",
          textColor: "text-gray-900 dark:text-white",
          inProgressBar: true,
        },
        {
          id: "Due",
          label: "Due",
          count: invoices.filter((i) => i.paymentStatus !== "Paid").length,
          value: due,
          color: "#f59e0b",
          textColor: "text-gray-900 dark:text-white",
          inProgressBar: true,
        },
        ...methodSegments,
      ],
    };
  }, [reportSummary, invoices, pagination.total]);

  const getItemTaxPercent = (item) => {
    if (item.taxPercent) return item.taxPercent;
    if (item.taxPercentage) return item.taxPercentage;
    const baseAmt = item.amount || (item.price * (item.quantity || 1)) || 0;
    if (item.taxAmount > 0 && baseAmt > 0) {
      return item.isTaxInclusive
        ? Math.round((item.taxAmount / (baseAmt - item.taxAmount)) * 100)
        : Math.round((item.taxAmount / baseAmt) * 100);
    }
    return 0;
  };

  const renderExpandedRow = (row) => {
    return (
      <div className="bg-gray-50/50 dark:bg-dark-card/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-100/50 dark:bg-dark-border/50 border-y border-gray-200/50 dark:border-dark-border/80 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-6">Item/Service</th>
                <th className="py-3 px-6 text-right">Qty</th>
                <th className="py-3 px-6 text-right">Price</th>
                <th className="py-3 px-6 text-right">Discount</th>
                <th className="py-3 px-6 text-right">Taxable</th>
                <th className="py-3 px-6 text-right">Tax %</th>
                <th className="py-3 px-6 text-right">Tax Amt</th>
                <th className="py-3 px-6 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              {(row.items || []).map((item, idx) => {
                const qty = item.quantity || item.qty || 1;
                const price = item.price || 0;
                const amount = item.amount || (price * qty);
                const discount = item.discount || 0;
                
                const tPct = getItemTaxPercent(item);
                let taxableAmount = amount;
                if (item.isTaxInclusive) {
                  taxableAmount = amount / (1 + tPct / 100);
                }
                taxableAmount = taxableAmount - discount;
                
                const taxAmount = item.taxAmount || 0;
                const totalItemAmount = taxableAmount + taxAmount;

                const adminName = row.createdBy?.name || "Owner";
                let itemStaffName = "";
                if (item.staffName) itemStaffName = item.staffName.toLowerCase() === 'admin' ? adminName : item.staffName;
                else if (item.staff && item.staff.name) itemStaffName = item.staff.name;
                else if (typeof item.staff === 'string') itemStaffName = item.staff.toLowerCase() === 'admin' ? adminName : item.staff;
                else if (item.staffId && item.staffId.name) itemStaffName = item.staffId.name;
                else if (typeof item.staffId === 'string') itemStaffName = item.staffId.toLowerCase() === 'admin' ? adminName : item.staffId;
                else if (!item.staffId && !item.staffName && !item.staff) itemStaffName = adminName;

                return (
                  <tr key={idx} className="border-b border-gray-100/50 dark:border-dark-border/30 last:border-0 hover:bg-gray-50 dark:hover:bg-dark-border/20 transition-colors">
                    <td className="py-3 px-6">
                      <div className="text-gray-900 dark:text-white font-semibold">
                        {item.productName || item.serviceName || item.product?.name || item.name || "Item"}
                      </div>
                      {itemStaffName && itemStaffName !== "admin" && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                          Staff: {itemStaffName}
                        </div>
                      )}
                      {item.hsnCode && (
                        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase">
                          HSN: {item.hsnCode}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-6 text-right text-gray-500">x{qty}</td>
                    <td className="py-3 px-6 text-right text-gray-600 dark:text-gray-400 notranslate">{currencySymbol}{formatDisplayNumber(price)}</td>
                    <td className="py-3 px-6 text-right text-red-500 notranslate">{discount > 0 ? `-${currencySymbol}${formatDisplayNumber(discount)}` : "-"}</td>
                    <td className="py-3 px-6 text-right text-gray-700 dark:text-gray-300 notranslate">{currencySymbol}{formatDisplayNumber(taxableAmount)}</td>
                    <td className="py-3 px-6 text-right">
                      <span className="text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-500/10 px-2 py-0.5 rounded font-bold text-xs">
                        {tPct}%
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right text-amber-600 dark:text-amber-500 font-bold notranslate">{currencySymbol}{formatDisplayNumber(taxAmount)}</td>
                    <td className="py-3 px-6 text-right text-emerald-600 dark:text-emerald-400 font-black notranslate">{currencySymbol}{formatDisplayNumber(totalItemAmount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const columns = [
    {
      header: "Sl No",
      exportValue: (row) => row.slNo,
      render: (row) => (
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{row.slNo}</span>
      ),
    },
    {
      header: "Date",
      exportValue: (row) => new Date(row.createdAt).toLocaleDateString(),
      render: (row) => (
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Invoice No",
      exportValue: (row) => `#${row.invoiceNumber}`,
      render: (row) => (
        <span className="font-mono text-xs text-brand-primary dark:text-blue-400 uppercase tracking-tight">
          #{row.invoiceNumber}
        </span>
      ),
    },
    {
      header: "Customer",
      exportValue: (row) => row.customer?.name || "LOCAL CUSTOMER",
      render: (row) => (
        <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
          {row.customer?.name || "LOCAL CUSTOMER"}
        </span>
      ),
    },
    {
      header: "Staff",
      exportValue: (row) => getStaffNames(row).join(", "),
      render: (row) => {
        const staffNames = getStaffNames(row);
        if (staffNames.length > 1) {
          return (
            <div className="flex flex-col gap-0.5">
              {staffNames.map((name, idx) => (
                <span key={idx} className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
                  • {name}
                </span>
              ))}
            </div>
          );
        }
        return (
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
            {staffNames[0]}
          </span>
        );
      },
    },
    {
      header: "Method",
      exportValue: (row) => getPaymentMethodDisplay(row),
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-[120px]">
          {getPaymentMethodDisplay(row).split(' + ').map((m, idx) => {
            const method = m.trim().toUpperCase();
            const colorClass = 
              method === 'UPI' ? 'bg-purple-50 text-purple-600' :
              method === 'CARD' ? 'bg-orange-50 text-orange-600' :
              method === 'BANK TRANSFER' ? 'bg-blue-50 text-blue-600' :
              method === 'CASH' ? 'bg-emerald-50 text-emerald-600' :
              method === 'DUE' ? 'bg-rose-50 text-rose-600' :
              method === 'WALLET' ? 'bg-indigo-50 text-indigo-600' :
              'bg-violet-50 text-violet-600';
            return (
              <span key={idx} className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${colorClass}`}>
                {method}
              </span>
            );
          })}
        </div>
      ),
    },
    {
      header: "Amount",
      exportValue: (row) =>
        formatDisplayNumber(getUnifiedInvoicePayableTotal(row)),
      render: (row) => {
        const totalPayable = getUnifiedInvoicePayableTotal(row);
        const taxVal = Number(row.taxAmount || 0);
        const discVal = Number(row.discount || 0);
        return (
          <div className="flex flex-col">
            <span className="text-sm font-black text-gray-900 dark:text-white notranslate">
              {currencySymbol}
              {formatDisplayNumber(totalPayable)}
            </span>
            {taxVal > 0 && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 notranslate mt-0.5">
                Tax: {currencySymbol}{formatDisplayNumber(taxVal)}
              </span>
            )}
            {discVal > 0 && (
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 notranslate">
                Disc: {currencySymbol}{formatDisplayNumber(discVal)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Paid Amt",
      exportValue: (row) => row.paidAmount || 0,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 notranslate">
            {currencySymbol}
            {formatDisplayNumber(row.paidAmount || 0)}
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      exportValue: (row) => {
        const finalAmt = getUnifiedInvoicePayableTotal(row);
        const paid = row.paidAmount || 0;
        const isFullyWallet = row.payments && row.payments.length > 0 && row.payments.every(p => p.method === 'WALLET');
        if (paid > finalAmt) return "OVER PAID";
        if (isFullyWallet && paid >= finalAmt) return "WALLET";
        if (paid >= finalAmt) return "PAID";
        if (paid > 0) return "PARTIAL";
        return "PENDING";
      },
      render: (row) => {
        const finalAmt = getUnifiedInvoicePayableTotal(row);
        const paid = row.paidAmount || 0;
        const isFullyWallet = row.payments && row.payments.length > 0 && row.payments.every(p => p.method === 'WALLET');

        let status;
        const methodStr = String(row.paymentMethod || "").toUpperCase();

        if (paid > finalAmt) {
          status = "OVER PAID";
        } else if (isFullyWallet && paid >= finalAmt) {
          status = "WALLET";
        } else if (methodStr === "DUE") {
          status = "DUE";
        } else if (paid >= finalAmt) {
          status = "PAID";
        } else if (paid > 0) {
          status = "PARTIAL";
        } else {
          status = "DUE";
        }

        const colorMap = {
          "PAID": "bg-emerald-50 text-emerald-600 border border-emerald-100",
          "OVER PAID": "bg-yellow-50 text-yellow-600 border border-yellow-100",
          "WALLET": "bg-indigo-50 text-indigo-600 border border-indigo-100",
          "PARTIAL": "bg-amber-50 text-amber-600 border border-amber-100",
          "DUE": "bg-rose-50 text-rose-600 border border-rose-100",
          "PENDING": "bg-gray-50 dark:bg-dark-card text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-dark-border",
        };

        return (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${colorMap[status] || colorMap["PENDING"]}`}>
            {status}
          </span>
        );
      },
    },
    {
      header: "Action",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setPreviewInvoiceId(row._id)}
            title="Preview Invoice"
            className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
          >
            <Eye size={14} />
          </button>
          {hasPermission('reports:sales:invoice_report:edit') && (
            <button
              onClick={() => handleEdit(row._id)}
              title="Edit Invoice"
              className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all active:scale-95"
            >
              <Edit3 size={14} />
            </button>
          )}
          {hasPermission('reports:sales:invoice_report:cancel') && (
            <button
              onClick={() => setCancelConfirm(row)}
              title="Cancel Invoice"
              className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-95"
            >
              <XCircle size={14} />
            </button>
          )}
          {hasPermission('reports:sales:invoice_report:download') && (
            <button
              onClick={() => handleDownload(row._id, row.invoiceNumber, row.createdAt)}
              disabled={actionLoadingId === row._id}
              title="Download PDF"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${
                actionLoadingId === row._id
                  ? "bg-gray-100 dark:bg-dark-card text-brand-primary dark:text-blue-400"
                  : "bg-gray-50 dark:bg-dark-card text-gray-400 dark:text-gray-500 hover:bg-brand-primary hover:text-white"
              }`}
            >
              {actionLoadingId === row._id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <ReportLayout title="Invoices Report" subtitle="Analyze sales and payments">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      <ReportSummaryCard
        title="Revenue Analysis"
        totalValue={summaryData.paid}
        totalLabel="Total paid value"
        totalCount={summaryData.count}
        segments={summaryData.segments}
        loading={loading}
        currencySymbol={currencySymbol}
        onSegmentClick={(id) => {
          setActiveTab((prev) => (prev === id ? "all" : id));
        }}
        activeSegment={activeTab === "all" ? null : activeTab}
        hideCountLabel={true}
      />

      <CustomTable
        columns={columns}
        data={filteredInvoices}
        loading={loading}
        onRefresh={fetchInvoices}
        isRefreshing={loading}
        onExport={hasPermission('reports:sales:invoice_report:export') ? handleExport : undefined}
        pagination={{
          ...pagination,
          onPageChange,
        }}
        onTabChange={setActiveTab}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
        onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
        expandable={true}
        expandedContent={renderExpandedRow}
        flushExpandedContent={true}
        onFilterClick={() => setIsFilterModalOpen(true)}
        filterCount={
          Object.entries(filters).filter(([k, v]) =>
            k !== "startDate" && k !== "endDate" && (Array.isArray(v) ? v.length > 0 : !!v),
          ).length
        }
        mobileMapper={{
          leading: (row) => (
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-400 border border-blue-100 font-bold text-lg">
              {row.slNo}
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.invoiceNumber}
            </div>
          ),
          subtitle: (row) => {
            const staffDisplay = getStaffNames(row).join(", ");
            return (
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                {staffDisplay} •{" "}
                {new Date(row.createdAt).toLocaleDateString()}
              </div>
            );
          },
          trailing: (row) => {
            const mobileTotal = getUnifiedInvoicePayableTotal(row);
            const isFullyWallet = row.payments?.length > 0 && row.payments.every(p => p.method === "WALLET");
            let status = row.paymentStatus || "PENDING";
            const methodStr = String(row.paymentMethod || "").toUpperCase();
            if (row.paidAmount > mobileTotal) status = "OVER PAID";
            else if (methodStr === "DUE") status = "DUE";
            else if ((row.dueAmount || 0) > 0 || row.paidAmount === 0) status = "DUE";
            else if (isFullyWallet && row.paidAmount >= mobileTotal) status = "WALLET";
            else if (row.paidAmount >= mobileTotal) status = "PAID";
            else if (row.paidAmount > 0) status = "PARTIAL";
            const statusColor = {
              "PAID": "text-emerald-500",
              "WALLET": "text-indigo-500",
              "DUE": "text-rose-500",
              "OVER PAID": "text-amber-500",
              "Partial": "text-amber-500",
              "PENDING": "text-gray-400 dark:text-gray-500",
            };
            return (
              <div className="text-right">
                <div className="text-sm font-black text-gray-900 dark:text-white notranslate">
                  {currencySymbol}{formatDisplayNumber(mobileTotal)}
                </div>
                <span className={`text-[8px] font-black uppercase tracking-wider ${statusColor[status] || "text-gray-400 dark:text-gray-500"}`}>
                  {status}
                </span>
              </div>
            );
          },
          actions: (row) => (
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={(e) => { e.stopPropagation(); setPreviewInvoiceId(row._id); }}
                className="flex-1 flex items-center justify-center gap-2 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[11px] font-bold hover:bg-emerald-500 hover:text-white transition-all active:scale-95 border border-emerald-100"
              >
                <Eye size={14} /> Preview
              </button>
              {hasPermission('reports:sales:invoice_report:edit') && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(row._id); }}
                  className="flex-1 flex items-center justify-center gap-2 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl text-[11px] font-bold hover:bg-blue-500 hover:text-white transition-all active:scale-95 border border-blue-100"
                >
                  <Edit3 size={14} /> Edit
                </button>
              )}
              {hasPermission('reports:sales:invoice_report:cancel') && (
                <button
                  onClick={(e) => { e.stopPropagation(); setCancelConfirm(row); }}
                  className="flex-1 flex items-center justify-center gap-2 h-10 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-[11px] font-bold hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-100"
                >
                  <XCircle size={14} /> Cancel
                </button>
              )}
              {hasPermission('reports:sales:invoice_report:download') && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(row._id, row.invoiceNumber, row.createdAt); }}
                  disabled={actionLoadingId === row._id}
                  className="flex-1 flex items-center justify-center gap-2 h-10 bg-gray-900 text-white rounded-xl text-[11px] font-bold hover:bg-black transition-all active:scale-95 disabled:bg-gray-400"
                >
                  {actionLoadingId === row._id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Download
                </button>
              )}
            </div>
          ),
        }}
      />

      <InvoiceFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={setFilters}
        services={allServices}
        products={allProducts}
        branches={allBranches}
        staff={allStaff}
        customers={allCustomers}
        paymentMethods={paymentMethods}
        initialFilters={filters}
      />
      {/* Cancel Confirmation Dialog */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                <XCircle size={20} className="text-rose-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Cancel Invoice
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Are you sure you want to cancel invoice{" "}
              <span className="font-bold text-gray-900 dark:text-white">
                #{cancelConfirm.invoiceNumber}
              </span>
              ?
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
              Amount: {currencySymbol}
              {cancelConfirm.amount?.toLocaleString()} •{" "}
              {cancelConfirm.customer?.name || "LOCAL CUSTOMER"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card transition-colors"
              >
                Keep it
              </button>
              <button
                onClick={() => handleCancelInvoice(cancelConfirm._id)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors active:scale-95"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <InvoicePreviewSheet
        invoiceId={previewInvoiceId}
        isOpen={!!previewInvoiceId}
        onClose={() => setPreviewInvoiceId(null)}
        onDownload={handleDownload}
        onShare={handleShare}
        isActionLoading={actionLoadingId === previewInvoiceId}
      />
    </ReportLayout>
  );
};

export default InvoiceReport;
