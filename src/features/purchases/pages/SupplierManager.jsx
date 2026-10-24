import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  TableSkeleton,
  StatsSkeleton,
} from "../../../components/shared/Skeleton";
import StatsGrid from "../../../components/shared/StatsGrid";
import { useGetShopsQuery } from "../../../store/api/tenantEndpoints";
import {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useBulkDeleteSuppliersMutation,
} from "../../../store/api/tenantCrudEndpoints";
import { rtkErrorMessage } from "../../../store/api/rtkUtils";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  LayoutList,
  LayoutGrid,
  Filter,
  ChevronDown,
  Building2,
  MapPin,
  Receipt,
  Trash2,
  Edit3,
  X,
  Plus,
  RefreshCw,
  CreditCard,
  Briefcase,
  Clock,
  ShieldCheck,
  TrendingUp,
  Banknote,
  Smartphone,
  Check,
  FileText,
  Upload,
  Download,
} from "lucide-react";
import Modal from "../../../components/shared/Modal";
import CustomTextField from "../../../components/shared/CustomTextField";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import CustomTable from "../../../components/shared/CustomTable";
import Snackbar from "../../../components/shared/Snackbar";
import CustomMultiSelect from "../../../components/shared/CustomMultiSelect";
import UploadSuppliersModal from "../../../components/shared/UploadSuppliersModal";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import api from "../../../api/axiosInstance";
import * as XLSX from "xlsx";

const SupplierManager = () => {
  const { user, currencySymbol, hasPermission, isAdmin } = useAuth();
  const canAdd = isAdmin || hasPermission("srm:suppliers:add");
  const canEdit = isAdmin || hasPermission("srm:suppliers:edit");
  const canDelete = isAdmin || hasPermission("srm:suppliers:delete");

  const { data: suppliers = [], isLoading: loading, refetch } = useGetSuppliersQuery("");
  const { shopSlug, portalRole } = useParams();
  const navigate = useNavigate();
  const { data: branches = [] } = useGetShopsQuery(shopSlug);
  const [createSupplier] = useCreateSupplierMutation();
  const [updateSupplier] = useUpdateSupplierMutation();
  const [deleteSupplierMut] = useDeleteSupplierMutation();
  const [search, setSearch] = useState("");
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleExportSuppliers = () => {
    const dataToExport = suppliers.map((s) => ({
      "Supplier Name": s.name || "",
      "Email": s.email || "",
      "Phone": s.phone || "",
      "Contact Person": s.contactPerson || "",
      "GST Number": s.gstNumber || "",
      "Address": s.address || "",
      "Status": s.status || "active",
      "Balance": s.balance || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Suppliers");
    XLSX.writeFile(workbook, "supplier_export.xlsx");
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleteSuppliers] = useBulkDeleteSuppliersMutation();

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const res = await bulkDeleteSuppliers(selectedIds).unwrap();
      showSnack(`Successfully deleted ${selectedIds.length} suppliers`);
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
    } catch (err) {
      console.error("Bulk delete error:", err);
      showSnack(err.data?.error || err.data?.message || err.message || "Error deleting suppliers", "error");
    }
  };

  const CurrencyIcon = () => (
    <span className="text-sm font-bold text-gray-500 group-focus-within:text-brand-primary dark:text-blue-400 transition-colors notranslate">
      {currencySymbol}
    </span>
  );

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    gstNumber: "",
    contactPerson: "",
    branches: [],
  });

  const filteredSuppliers = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return suppliers.filter((s) => {
      const name = s.name?.toLowerCase() || "";
      const email = s.email?.toLowerCase() || "";
      const phone = s.phone || "";
      const contactPerson = s.contactPerson?.toLowerCase() || "";

      return (
        name.includes(lowerSearch) ||
        phone.includes(search) ||
        email.includes(lowerSearch) ||
        contactPerson.includes(lowerSearch)
      );
    });
  }, [search, suppliers]);

  const handleEdit = (supplier) => {
    setEditingId(supplier._id);
    setFormData({
      name: supplier.name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      gstNumber: supplier.gstNumber || "",
      contactPerson: supplier.contactPerson || "",
      branches: supplier.branches || [],
    });
    setIsModalOpen(true);
  };

  const confirmDelete = (supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;
    try {
      await deleteSupplierMut(supplierToDelete._id).unwrap();
    } catch (err) {
      showSnack(
        rtkErrorMessage(err, "Failed to delete supplier"),
        "error",
      );
    } finally {
      setSupplierToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingId) {
        await updateSupplier({ id: editingId, body: formData }).unwrap();
      } else {
        await createSupplier(formData).unwrap();
      }

      setIsModalOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        gstNumber: "",
        contactPerson: "",
        branches: [],
      });
      setEditingId(null);
    } catch (err) {
      showSnack(
        rtkErrorMessage(err, "Failed to save supplier"),
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const footerContent = (
    <div className="flex gap-3 w-full">
      <button
        type="button"
        onClick={() => {
          setIsModalOpen(false);
          setEditingId(null);
          setFormData({
            name: "",
            email: "",
            phone: "",
            address: "",
            gstNumber: "",
            contactPerson: "",
            branches: [],
          });
        }}
        className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-all cursor-pointer text-sm"
      >
        Cancel
      </button>
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl transition-all active:scale-95 text-sm cursor-pointer ${isSubmitting ? "bg-gray-400" : "bg-brand-primary hover:bg-brand-secondary"}`}
      >
        {isSubmitting
          ? "Processing..."
          : editingId
            ? "Update Supplier"
            : "Register Supplier"}
      </button>
    </div>
  );

  const stats = [
    {
      label: "Total Suppliers",
      value: suppliers.length,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Active",
      value: suppliers.filter((s) => s.status === "active").length,
      icon: ShieldCheck,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Total Balance",
      value: `${currencySymbol}${suppliers.reduce((acc, s) => acc + (s.balance || 0), 0).toLocaleString()}`,
      icon: TrendingUp,
      color: "bg-indigo-50 text-indigo-600",
    },
  ];

  const columns = [
    {
      header: "Company Profile",
      render: (supplier) => (
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-indigo-50 flex flex-col items-center justify-center border-2 border-white ring-2 ring-indigo-50 transition-transform duration-300 group-hover:scale-110 shrink-0">
            <span className="text-xl font-black text-indigo-500">
              {supplier.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 dark:text-white text-[15px] truncate">
              {supplier.name}
            </div>
            <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest opacity-70 flex items-center gap-1 mt-0.5">
              <Briefcase size={10} /> {supplier.contactPerson || "Individual"}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Contact",
      render: (supplier) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
            <Phone size={13} className="text-gray-400 dark:text-gray-500" />
            {supplier.phone || "N/A"}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
            <Mail size={13} className="text-gray-400 dark:text-gray-500" />
            {supplier.email || "N/A"}
          </div>
        </div>
      ),
    },
    {
      header: "Financials",
      render: (supplier) => (
        <div className="flex flex-col gap-1">
          <div className="text-sm font-black text-gray-900 dark:text-white leading-none">
            Bal:{" "}
            <span className="notranslate text-emerald-600 dark:text-emerald-400">
              {currencySymbol}
              {(supplier.balance || 0).toLocaleString()}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      render: (supplier) => (
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${supplier.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
        >
          {supplier.status}
        </span>
      ),
    },
    {
      header: "Action",
      align: "right",
      render: (supplier) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => navigate(`/${shopSlug}/${portalRole || "admin"}/reports/supplier-statement`, { state: { supplierId: supplier._id } })}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 dark:bg-emerald-900/20 rounded-lg transition-all active:scale-95 cursor-pointer"
            title="View Statement"
          >
            <FileText size={16} />
          </button>
          {canEdit && (
            <button
              onClick={() => handleEdit(supplier)}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Edit Supplier"
            >
              <Edit3 size={16} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => confirmDelete(supplier)}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Delete Supplier"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3 md:space-y-6">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      <StatsGrid stats={stats} loading={loading} />

      {loading ? (
        <div className="space-y-3 md:space-y-6">
          <TableSkeleton rows={8} cols={6} />
        </div>
      ) : (
        <CustomTable
          key="table-view"
          columns={columns}
          data={filteredSuppliers}
          loading={loading}
          emptyMessage="No suppliers found. Try adding one!"
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search supplier, contact, email..."
          showSelection={true}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkActions={
            selectedIds.length > 0 && canDelete && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
              >
                <Trash2 size={14} />
                Delete Selected ({selectedIds.length})
              </button>
            )
          }
          headerActions={
            <div className="flex items-center gap-2">
              {canAdd && (
                <button
                  onClick={() => setShowBulkUploadModal(true)}
                  className="h-10 px-2.5 md:px-4 flex items-center gap-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-dark-card active:scale-95 text-xs shrink-0"
                >
                  <Upload size={16} />
                  <span className="hidden md:inline">Bulk Upload</span>
                </button>
              )}
              <button
                onClick={handleExportSuppliers}
                className="h-10 px-2.5 md:px-4 flex items-center gap-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-dark-card active:scale-95 text-xs shrink-0"
              >
                <Download size={16} />
                <span className="hidden md:inline">Export</span>
              </button>
              {canAdd && (
                <button
                  onClick={() => {
                    const userBranchId = user?.branchId?._id || user?.branchId;
                    const isStaff = user?.role === "staff";

                    setEditingId(null);
                    setFormData({
                      name: "",
                      email: "",
                      phone: "",
                      address: "",
                      gstNumber: "",
                      contactPerson: "",
                      openingBalance: 0,
                      creditLimit: 0,
                      branches: isStaff && userBranchId ? [userBranchId] : [],
                    });
                    setIsModalOpen(true);
                  }}
                  className="h-10 flex items-center gap-2 px-2.5 md:px-4 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl transition-all active:scale-95 shadow-sm text-xs"
                >
                  <Plus size={16} />
                  <span className="hidden md:inline">Add Supplier</span>
                </button>
              )}
            </div>
          }
          mobileMapper={{
            leading: () => null,
            title: (supplier) => (
              <h4 className="font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight">
                {supplier.name}
              </h4>
            ),
            subtitle: (supplier) => (
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mt-0.5 flex items-center gap-1">
                <Briefcase size={10} />
                {supplier.contactPerson || "Individual"}
              </p>
            ),
            trailing: (supplier) => (
              <div className="text-right">
                <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">
                  Balance
                </p>
                <p className="text-[13px] font-black text-emerald-600 dark:text-emerald-400 notranslate">
                  {currencySymbol}
                  {(supplier.balance || 0).toLocaleString()}
                </p>
              </div>
            ),
            actions: (supplier) => (
              <div className="flex gap-2 pt-2 flex-wrap">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/${shopSlug}/${portalRole || "admin"}/reports/supplier-statement`, { state: { supplierId: supplier._id } });
                  }}
                  className="flex-1 flex items-center justify-center gap-2 h-10 bg-emerald-50 text-emerald-600 dark:text-emerald-400 rounded-xl text-[11px] font-bold hover:bg-emerald-500 hover:text-white transition-all active:scale-95 border border-emerald-100"
                >
                  <FileText size={14} /> Statement
                </button>
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(supplier);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 h-10 bg-brand-primary/10 text-brand-primary dark:text-blue-400 rounded-xl text-[11px] font-bold hover:bg-brand-primary hover:text-white transition-all active:scale-95"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(supplier);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 h-10 bg-red-50 text-red-600 rounded-xl text-[11px] font-bold hover:bg-red-500 hover:text-white transition-all active:scale-95 border border-red-100"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            ),
          }}
        />
      )}

      {/* Registration/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingId(null);
          setFormData({
            name: "",
            email: "",
            phone: "",
            address: "",
            gstNumber: "",
            contactPerson: "",
            branches: [],
          });
        }}
        title={editingId ? "Update Supplier Info" : "New Supplier Profile"}
        footer={footerContent}
        size="md"
        position="right"
      >
        <form className="space-y-4">
          <div>
            <CustomTextField
              label="Company / Supplier Name"
              icon={Briefcase}
              placeholder="Acme Corp"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomTextField
              label="Phone Number"
              icon={Phone}
              placeholder="+91 00000 00000"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
            <CustomTextField
              label="Email Address"
              icon={Mail}
              placeholder="supplier@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomTextField
              label="Contact Person"
              icon={Users}
              placeholder="John Doe"
              value={formData.contactPerson}
              onChange={(e) =>
                setFormData({ ...formData, contactPerson: e.target.value })
              }
            />
            <CustomTextField
              label="GST Number"
              icon={Receipt}
              placeholder="22AAAAA0000A1Z5"
              value={formData.gstNumber}
              onChange={(e) =>
                setFormData({ ...formData, gstNumber: e.target.value })
              }
            />
          </div>

          <CustomTextField
            label="Full Address (Optional)"
            icon={MapPin}
            placeholder="123 Industrial Park, Sector 4..."
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
          />
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSupplierToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Supplier"
        message={`Are you sure you want to delete ${supplierToDelete?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
      />

      <UploadSuppliersModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        showSnack={showSnack}
        onUploadSuccess={refetch}
      />

      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Suppliers"
        message={`Are you sure you want to delete ${selectedIds.length} suppliers? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.length} Suppliers`}
      />
    </div>
  );
};

export default SupplierManager;
