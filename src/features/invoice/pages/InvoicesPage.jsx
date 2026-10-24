import React, { useState, useMemo, useCallback } from "react";
import {
  Receipt,
  TrendingUp,
  Wallet,
  Download,
  Clock,
  Filter,
  Search,
} from "lucide-react";
import StatsGrid from "../../../components/shared/StatsGrid";
import CustomTable from "../../../components/shared/CustomTable";
import InvoiceFilterModal from "../../../components/shared/InvoiceFilterModal";
import Snackbar from "../../../components/shared/Snackbar";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import {
  useGetInvoiceListQuery,
  useGetInvoiceFilterMetaQuery,
  useDownloadInvoiceMutation,
} from "../../../store/api/invoiceEndpoints";

const InvoicesPage = () => {
  const { currencySymbol, user } = useAuth();

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    paymentMethod: [],
    services: [],
    staff: [],
    customers: [],
  });

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  // ── Build query string ────────────────────────────────────────────────────
  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.append("page", page);
    p.append("limit", limit);
    if (filters.startDate) p.append("startDate", filters.startDate);
    if (filters.endDate) p.append("endDate", filters.endDate);
    if (filters.paymentMethod.length) p.append("paymentMethod", filters.paymentMethod.join(","));
    if (filters.services.length) p.append("services", filters.services.join(","));
    if (filters.staff?.length) p.append("staffId", filters.staff.join(","));
    if (filters.customers?.length) p.append("customerId", filters.customers.join(","));
    return p.toString();
  }, [page, filters]);

  // ── RTK Query — invoice list (cached, auto-refetch on filter change) ──────
  const {
    data: invoiceRes,
    isFetching: loading,
    refetch,
  } = useGetInvoiceListQuery(queryString);

  const invoices = invoiceRes?.data ?? [];
  const pagination = invoiceRes?.pagination ?? { total: 0, totalPages: 1 };

  // ── RTK Query — filter metadata (cached 5 min) ────────────────────────────
  const { data: meta } = useGetInvoiceFilterMetaQuery();

  const allServices = meta?.services ?? [];
  const allCustomers = meta?.customers ?? [];
  const paymentMethods = meta?.paymentMethods ?? [];
  const allStaff = useMemo(() => {
    const staff = meta?.staff ?? [];
    if (user?.role === "staff") {
      return [{ _id: user._id || user.id, name: user.name }];
    }
    return [{ _id: "ADMIN", name: "Admin" }, ...staff];
  }, [meta?.staff, user]);

  // ── Download mutation ─────────────────────────────────────────────────────
  const [downloadInvoice] = useDownloadInvoiceMutation();

  const handleDownload = useCallback(async (id) => {
    try {
      const blob = await downloadInvoice(id).unwrap();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      showSnack("Failed to download invoice", "error");
    }
  }, [downloadInvoice]);

  // ── Apply filters ─────────────────────────────────────────────────────────
  const handleApplyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page on filter change
  }, []);

  // ── Client-side search (within current page) ──────────────────────────────
  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return invoices;
    const q = searchTerm.toLowerCase();
    return invoices.filter((inv) => {
      const invoiceNumber = inv.invoiceNumber?.toLowerCase() ?? "";
      const customerName = inv.user?.name?.toLowerCase() ?? "";
      const customerEmail = inv.user?.email?.toLowerCase() ?? "";
      const branchName = inv.shop?.name?.toLowerCase() ?? "";
      const serviceNames = inv.appointment?.services?.map((s) => s.name).join(" ").toLowerCase() ?? "";
      const paymentMethod = inv.paymentMethod?.toLowerCase() ?? "";
      const completedBy = (inv.createdBy?.name || inv.staff?.name || "Admin").toLowerCase();
      return (
        invoiceNumber.includes(q) ||
        customerName.includes(q) ||
        customerEmail.includes(q) ||
        branchName.includes(q) ||
        serviceNames.includes(q) ||
        paymentMethod.includes(q) ||
        completedBy.includes(q)
      );
    });
  }, [invoices, searchTerm]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalRevenue = useMemo(
    () => invoices.reduce((acc, inv) => acc + (inv.paidAmount ?? inv.amount ?? 0), 0),
    [invoices]
  );
  const cashPayments = useMemo(
    () => invoices.filter((inv) => inv.paymentMethod === "CASH").length,
    [invoices]
  );

  const stats = [
    {
      label: "Total Revenue",
      value: (
        <span className="notranslate">
          {currencySymbol}{totalRevenue.toLocaleString()}
        </span>
      ),
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Total Invoices",
      value: invoices?.length ?? 0,
      icon: Receipt,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Cash Payments",
      value: cashPayments,
      icon: Wallet,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Pending",
      value: "0",
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  const columns = [
    {
      header: "Invoice #",
      render: (invoice) => (
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
          {invoice.invoiceNumber}
        </span>
      ),
    },
    {
      header: "Date",
      render: (invoice) => (
        <span className="text-sm text-gray-900 dark:text-gray-200">
          {new Date(invoice.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Customer",
      render: (invoice) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">{invoice.user?.name || "Unknown"}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{invoice.user?.email || "N/A"}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{invoice.user?.phone || ""}</div>
        </div>
      ),
    },
    {
      header: "Service Details",
      render: (invoice) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
            {invoice.appointment?.services?.[0]?.serviceId?.name || "Product Sale"}
          </span>
          {invoice.appointment?.services?.length > 1 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              +{invoice.appointment.services.length - 1} more services
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Completed By",
      render: (invoice) => (
        <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
          {invoice.staff?.name || `Admin (${invoice.createdBy?.name || "Owner"})`}
        </span>
      ),
    },
    {
      header: "Method",
      render: (invoice) => {
        const payments = invoice.payments || [];
        const uniqueMethods = [...new Set(payments.map((p) => p.method))];
        const methodLabel =
          payments.length > 1 && uniqueMethods.length > 1
            ? "PARTIAL"
            : invoice.paymentMethod || uniqueMethods[0] || "CASH";
        const colorMap = {
          CASH: "bg-green-50 text-green-700 border-green-100",
          UPI: "bg-blue-50 text-blue-700 border-blue-100",
          CARD: "bg-purple-50 text-purple-700 border-purple-100",
          PARTIAL: "bg-amber-50 text-amber-700 border-amber-100",
        };
        return (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${colorMap[methodLabel] || "bg-gray-50 dark:bg-dark-card text-gray-600 dark:text-gray-400 border-gray-100 dark:border-dark-border"}`}>
            {methodLabel}
          </span>
        );
      },
    },
    {
      header: "Status",
      render: (invoice) => {
        let status = invoice.paymentStatus || "PENDING";
        const isFullyWallet =
          invoice.payments?.length > 0 &&
          invoice.payments.every((p) => p.method === "WALLET");
        
        const billTotal = Number((Number(invoice.amount || 0) + Number(invoice.taxAmount || 0) - Number(invoice.discount || 0) + Number(invoice.roundOffAmount || 0)).toFixed(2));
        const paidAmount = Number((invoice.paidAmount || 0).toFixed(2));
        
        if (paidAmount > billTotal) status = "OVER PAID";
        else if ((invoice.dueAmount || 0) > 0) status = "DUE";
        else if (isFullyWallet && paidAmount >= billTotal) status = "WALLET";
        else if (paidAmount >= billTotal) status = "PAID";

        const colorMap = {
          PAID: "bg-emerald-50 text-emerald-600 border-emerald-200",
          "OVER PAID": "bg-yellow-50 text-yellow-600 border-yellow-200",
          WALLET: "bg-indigo-50 text-indigo-600 border-indigo-200",
          DUE: "bg-rose-50 text-rose-600 border-rose-200",
          PENDING: "bg-gray-50 dark:bg-dark-card text-gray-500 dark:text-gray-400 border-gray-200 dark:border-dark-border",
        };
        return (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${colorMap[status] || colorMap["PENDING"]}`}>
            {status}
          </span>
        );
      },
    },
    {
      header: "Amount Details",
      render: (invoice) => {
        const hasSpecificPayments = invoice.payments?.length > 0;
        const dueAmt = invoice.dueAmount || 0;
        const billTotal = Number((Number(invoice.amount || 0) + Number(invoice.taxAmount || 0) - Number(invoice.discount || 0) + Number(invoice.roundOffAmount || 0)).toFixed(2));
        const paidAmount = Number((invoice.paidAmount || 0).toFixed(2));
        const isOverpaid = paidAmount > billTotal;
        const totalPaid = invoice.paidAmount ?? billTotal;
        return (
          <div className="space-y-1">
            <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1">
              Paid: <span className="notranslate">{currencySymbol}{totalPaid}</span>
            </span>
            <div className="space-y-0.5 pl-2 border-l-2 border-gray-100 dark:border-dark-border">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">
                Bill Total: <span className="notranslate">{currencySymbol}{billTotal}</span>
              </p>
              {hasSpecificPayments && invoice.payments.map((p, i) => (
                <p key={i} className={`text-[10px] font-bold uppercase tracking-wider ${p.method === "WALLET" ? "text-brand-primary" : "text-gray-600 dark:text-gray-400"}`}>
                  {p.method}: <span className="notranslate text-gray-900 dark:text-gray-200">{currencySymbol}{p.amount}</span>
                </p>
              ))}
              {dueAmt > 0 && (
                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">
                  DUE: <span className="notranslate">{currencySymbol}{dueAmt}</span>
                </p>
              )}
              {isOverpaid && (
                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                  OVERPAID: <span className="notranslate">{currencySymbol}{Number((paidAmount - billTotal).toFixed(2))}</span>
                </p>
              )}
              {invoice.taxAmount > 0 && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  TAX: <span className="notranslate">{currencySymbol}{invoice.taxAmount}</span>
                </p>
              )}
              {invoice.discount > 0 && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 line-through">
                  -<span className="notranslate">{currencySymbol}{invoice.discount}</span> (DISC)
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: "Action",
      align: "right",
      render: (invoice) => (
        <button
          onClick={() => handleDownload(invoice._id)}
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm cursor-pointer"
        >
          <Download size={16} /> Download
        </button>
      ),
    },
  ];

  const hasActiveFilters = Object.values(filters).some((f) =>
    Array.isArray(f) ? f.length > 0 : !!f
  );

  return (
    <div className="space-y-3 md:space-y-6">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />

      {/* Top Action Row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search invoices, customers, services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="flex-1 md:flex-none h-11 flex items-center justify-center gap-2 px-5 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-all duration-300 hover:border-brand-primary/30 hover:bg-blue-50/50 dark:hover:bg-dark-card active:scale-95 shadow-sm"
          >
            <Filter className="w-4 h-4 text-brand-primary dark:text-blue-400" />
            <span>Filter</span>
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-brand-primary" />}
          </button>
          <button
            onClick={refetch}
            className="flex-1 md:flex-none h-11 flex items-center justify-center gap-2 px-5 bg-brand-primary text-white font-bold rounded-2xl transition-all duration-300 hover:bg-brand-secondary active:scale-95 shadow-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      <StatsGrid stats={stats} loading={loading} />

      <CustomTable
        columns={columns}
        data={filteredInvoices}
        loading={loading}
        emptyMessage="No invoices generated yet."
        mobileMapper={{
          leading: (row) => (
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-400 border border-blue-100 font-bold">
              {row.invoiceNumber?.slice(-2) || "IN"}
            </div>
          ),
          title: (row) => (
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              {row.invoiceNumber}
            </div>
          ),
          subtitle: (row) => (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {row.user?.name || "Unknown"} •{" "}
              {new Date(row.createdAt).toLocaleDateString()}
            </div>
          ),
          trailing: (row) => {
            const billTotal = Number((Number(row.amount || 0) + Number(row.taxAmount || 0) - Number(row.discount || 0) + Number(row.roundOffAmount || 0)).toFixed(2));
            const paidAmount = Number((row.paidAmount || 0).toFixed(2));
            
            let status = row.paymentStatus || "PENDING";
            const isFullyWallet =
              row.payments?.length > 0 &&
              row.payments.every((p) => p.method === "WALLET");
            if (paidAmount > billTotal) status = "OVER PAID";
            else if ((row.dueAmount || 0) > 0) status = "DUE";
            else if (isFullyWallet && paidAmount >= billTotal) status = "WALLET";
            else if (paidAmount >= billTotal) status = "PAID";
            
            const statusColor = {
              PAID: "text-emerald-500",
              WALLET: "text-indigo-500",
              DUE: "text-rose-500",
              "OVER PAID": "text-amber-500",
              PENDING: "text-gray-400 dark:text-gray-500",
            };
            return (
              <div className="text-right">
                <div className="text-sm font-black text-gray-900 dark:text-white notranslate">
                  {currencySymbol}{row.paidAmount ?? billTotal}
                </div>
                <span className={`text-[8px] font-black uppercase tracking-wider ${statusColor[status] || "text-gray-400 dark:text-gray-500"}`}>
                  {status}
                </span>
              </div>
            );
          },
          actions: (row) => (
            <div className="flex gap-2 pt-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(row._id); }}
                className="flex-1 flex items-center justify-center gap-2 h-10 bg-brand-primary text-white rounded-xl text-[11px] font-bold hover:bg-brand-secondary transition-all active:scale-95"
              >
                <Download size={14} /> Download Invoice
              </button>
            </div>
          ),
        }}
      />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl shadow-sm mt-4">
          <span className="text-sm font-bold text-gray-400 dark:text-gray-500">
            Page {page} of {pagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-dark-card rounded-xl hover:bg-gray-100 dark:hover:bg-dark-border disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 text-sm font-bold text-white bg-brand-primary rounded-xl hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <InvoiceFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleApplyFilters}
        services={allServices}
        staff={allStaff}
        customers={allCustomers}
        paymentMethods={paymentMethods}
        initialFilters={filters}
      />
    </div>
  );
};

export default InvoicesPage;
