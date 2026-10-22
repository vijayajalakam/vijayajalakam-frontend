import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axiosInstance";
import CustomTable from "../../../components/shared/CustomTable";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import { Trash2, Edit3, Plus, Loader2, RotateCcw } from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import Snackbar from "../../../components/shared/Snackbar";

const PurchaseReturnPage = () => {
  const { currencySymbol, user, hasPermission } = useAuth();
  const isAdmin = user?.role === "SUPER_ADMIN";
  const canAdd = isAdmin || hasPermission("stock:purchase_returns:add");
  const canEdit = isAdmin || hasPermission("stock:purchase_returns:edit");
  const canDelete = isAdmin || hasPermission("stock:purchase_returns:delete");

  const navigate = useNavigate();
  const { shopSlug } = useParams();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState(null);

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

      const res = await api.get(`/purchases/returns?${params.toString()}`);
      if (res.data.success) setReturns(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const confirmDelete = (ret) => {
    setReturnToDelete(ret);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!returnToDelete) return;
    try {
      await api.delete(`/purchases/returns/${returnToDelete._id}`);
      fetchData();
      setIsDeleteModalOpen(false);
      setReturnToDelete(null);
    } catch {
      showSnack("Error deleting return", "error");
    }
  };

  const filtered = returns.filter(
    (r) =>
      !searchTerm ||
      r.returnNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const columns = [
    {
      header: "Return #",
      render: (r) => (
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
          {r.returnNumber}
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
        <span className="text-sm font-medium">{r.supplier?.name || "N/A"}</span>
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
      header: "Reason",
      render: (r) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">{r.reason || "—"}</span>
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
                navigate(getPath(`/admin/stock/purchase-return/edit/${r._id}`))
              }
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Edit Return"
            >
              <Edit3 size={16} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => confirmDelete(r)}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Delete Return"
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
      <CustomTable
          columns={columns}
          data={filtered}
          loading={loading}
          onRefresh={fetchData}
          isRefreshing={loading}
          searchQuery={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search returns..."
          startDate={filters.startDate}
          endDate={filters.endDate}
          onStartDateChange={(val) => setFilters((prev) => ({ ...prev, startDate: val }))}
          onEndDateChange={(val) => setFilters((prev) => ({ ...prev, endDate: val }))}
          headerActions={
            canAdd ? (
              <button
                onClick={() =>
                  navigate(getPath("/admin/stock/purchase-return/new"))
                }
                className="h-10 w-10 md:w-auto md:px-4 flex items-center justify-center gap-2 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-brand-secondary transition-all active:scale-95 shadow-sm"
              >
                <Plus size={18} strokeWidth={2.5} />
                <span className="hidden md:inline">New Return</span>
              </button>
            ) : null
          }
          emptyMessage="No purchase returns yet."
          mobileMapper={{
            leading: () => (
              <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-400 border border-orange-100">
                <span className="text-[10px] uppercase">R</span>
              </div>
            ),
            title: (row) => (
              <h4 className="font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight">
                {row.returnNumber}
              </h4>
            ),
            subtitle: (row) => (
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mt-0.5">
                {row.supplier?.name || "Local Return"} •{" "}
                {new Date(row.date).toLocaleDateString()}
              </p>
            ),
            trailing: (row) => (
              <div className="text-right">
                <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">
                  Amount
                </p>
                <p className="text-[13px] font-black text-gray-900 dark:text-white notranslate">
                  {currencySymbol}
                  {row.totalAmount.toLocaleString()}
                </p>
              </div>
            ),
            actions: (row) => (
              <div className="flex gap-2 pt-2">
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(
                        getPath(`/admin/stock/purchase-return/edit/${row._id}`),
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
                      confirmDelete(row);
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
        title="Delete Purchase Return"
        message="Are you sure you want to delete this return? Stock levels will be updated automatically."
      />
    </div>
  );
};

export default PurchaseReturnPage;
