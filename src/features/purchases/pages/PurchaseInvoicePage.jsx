import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import StatsGrid from "../../../components/shared/StatsGrid";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import {
  FileText,
  DollarSign,
  Clock,
  Package,
  Trash2,
  Edit3,
  Plus,
} from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import Snackbar from "../../../components/shared/Snackbar";

const PurchaseInvoicePage = () => {
  const { currencySymbol, user, hasPermission } = useAuth();
  const isAdmin = user?.role === "SUPER_ADMIN";
  const canAdd = isAdmin || hasPermission("stock:purchase_invoices:add");
  const canEdit = isAdmin || hasPermission("stock:purchase_invoices:edit");
  const canDelete = isAdmin || hasPermission("stock:purchase_invoices:delete");

  const navigate = useNavigate();
  const { shopSlug } = useParams();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

  const today = new Date().toLocaleDateString("en-CA");
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
  });

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const getPath = (path) => (shopSlug ? `/${shopSlug}${path}` : path);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await api.get(`/purchases/invoices?${params.toString()}`);
      if (res.data.success) setInvoices(res.data.data);
    } catch (_err) {
      console.error(_err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const confirmDelete = (inv) => {
    setInvoiceToDelete(inv);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!invoiceToDelete) return;
    try {
      await api.delete(`/purchases/invoices/${invoiceToDelete._id}`);
      fetchData();
      setIsDeleteModalOpen(false);
      setInvoiceToDelete(null);
    } catch {
      showSnack("Error deleting", "error");
    }
  };

  const totalAmount = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const filtered = invoices.filter((inv) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber?.toLowerCase().includes(s) ||
      inv.supplier?.name?.toLowerCase().includes(s)
    );
  });

  const stats = [
    {
      label: "Total Invoices",
      value: invoices.length,
      icon: FileText,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total Amount",
      value: (
        <span className="notranslate">
          {currencySymbol}
          {totalAmount.toLocaleString()}
        </span>
      ),
      icon: DollarSign,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Total Paid",
      value: (
        <span className="notranslate">
          {currencySymbol}
          {totalPaid.toLocaleString()}
        </span>
      ),
      icon: Package,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Due Amount",
      value: (
        <span className="notranslate">
          {currencySymbol}
          {(totalAmount - totalPaid).toLocaleString()}
        </span>
      ),
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  const columns = [
    {
      header: "Invoice #",
      render: (r) => (
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
          {r.invoiceNumber}
        </span>
      ),
    },
    {
      header: "Date",
      render: (r) => (
        <span className="text-sm">{new Date(r.date).toLocaleDateString()}</span>
      ),
    },
    {
      header: "Supplier",
      render: (r) => (
        <span className="text-sm font-medium">
          {r.supplier?.name || "LOCAL PURCHASE"}
        </span>
      ),
    },
    {
      header: "Items",
      render: (r) => (
        <span className="text-sm">{r.items?.length || 0} items</span>
      ),
    },
    {
      header: "Amount",
      render: (r) => (
        <span className="text-sm font-bold notranslate">
          {currencySymbol}
          {r.totalAmount}
        </span>
      ),
    },
    {
      header: "Paid",
      render: (r) => (
        <span className="text-sm notranslate">
          {currencySymbol}
          {r.paidAmount}
        </span>
      ),
    },
    {
      header: "Pay Method",
      render: (r) => (
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {r.paymentMethod || "CASH"}
        </span>
      ),
    },
    {
      header: "Status",
      render: (r) => (
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${r.status === "paid" ? "bg-green-50 text-green-700" : r.status === "partial" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}
        >
          {r.status}
        </span>
      ),
    },
    ...(canEdit || canDelete ? [{
      header: "Action",
      align: "right",
      render: (r) => (
        <div className="flex items-center gap-1.5 justify-end">
          {canEdit && (
            <button
              onClick={() =>
                navigate(getPath(`/admin/stock/purchase-invoice/edit/${r._id}`))
              }
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Edit Invoice"
            >
              <Edit3 size={16} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => confirmDelete(r)}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Delete Invoice"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-3 md:space-y-6">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      <StatsGrid stats={stats} />
      <CustomTable
          columns={columns}
          data={filtered}
          loading={loading}
          searchQuery={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search invoices..."
          startDate={filters.startDate}
          endDate={filters.endDate}
          onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
          onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
          headerActions={
            canAdd ? (
              <button
                onClick={() =>
                  navigate(getPath("/admin/stock/purchase-invoice/new"))
                }
                className="h-10 w-10 md:w-auto md:px-4 flex items-center justify-center gap-2 bg-brand-primary text-white font-bold rounded-xl transition-all hover:bg-brand-secondary active:scale-95 text-xs shrink-0 shadow-sm"
              >
                <Plus size={14} />
                <span className="hidden md:inline">New Purchase</span>
              </button>
            ) : null
          }
          emptyMessage="No purchase invoices yet."
          mobileMapper={{
            leading: () => (
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-400 border border-blue-100">
                <FileText size={22} />
              </div>
            ),
            title: (r) => (
              <h4 className="font-bold text-gray-900 dark:text-white text-[14px] leading-tight">
                {r.invoiceNumber}
              </h4>
            ),
            subtitle: (r) => (
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-0.5 break-words leading-snug">
                {r.supplier?.name || "Local Purchase"} •{" "}
                {new Date(r.date).toLocaleDateString()}
              </p>
            ),
            trailing: (r) => (
              <div className="text-right shrink-0 ml-2">
                <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">
                  Total
                </p>
                <p className="text-[13px] font-black text-gray-900 dark:text-white notranslate whitespace-nowrap">
                  {currencySymbol}
                  {r.totalAmount.toLocaleString()}
                </p>
              </div>
            ),
            actions: (r) => (
              <div className="flex gap-2 pt-2">
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(
                        getPath(`/admin/stock/purchase-invoice/edit/${r._id}`),
                      );
                    }}
                    className="flex-1 flex items-center justify-center gap-2 h-10 bg-brand-primary/10 text-brand-primary dark:text-blue-400 rounded-xl text-[11px] font-bold hover:bg-brand-primary hover:text-white transition-all active:scale-95 shadow-sm"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(r);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 h-10 bg-red-50 text-red-600 rounded-xl text-[11px] font-bold hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-sm border border-red-100"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            ),
          }}
        />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Purchase Invoice"
        message="Are you sure you want to delete this purchase invoice? This action cannot be undone and stock will be adjusted."
      />
    </div>
  );
};

export default PurchaseInvoicePage;
