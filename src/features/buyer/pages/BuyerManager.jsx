import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateAdminCustomerMutation } from "../../../store/api/tenantEndpoints";
import {
  useUpdateAdminCustomerMutation,
  useDeleteAdminCustomerMutation,
  useBulkDeleteAdminCustomersMutation,
} from "../../../store/api/tenantCrudEndpoints";
import { rtkErrorMessage } from "../../../store/api/rtkUtils";
import {
  TableSkeleton,
  StatsSkeleton,
} from "../../../components/shared/Skeleton";
import StatsGrid from "../../../components/shared/StatsGrid";
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  Filter,
  User,
  Camera,
  Trash2,
  Edit3,
  Clock,
  TrendingUp,
  Search,
  X,
  Calendar,
  Briefcase,
  FileText,
  Upload,
  File,
  Building2,
  MapPin,
  Globe,
  Hash,
  Tag,
  Plus,
  Download,
  Scissors,
} from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import CustomTextField from "../../../components/shared/CustomTextField";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import CustomDatePicker from "../../../components/shared/CustomDatePicker";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import Snackbar from "../../../components/shared/Snackbar";
import moment from "moment";
import CustomTable from "../../../components/shared/CustomTable";
import { useAuth } from "../../auth/hooks/useAuth";
import { validateFileSize, getFileSizeHint } from "../../../utils/fileUploadUtils";
import * as XLSX from "xlsx";
import UploadCustomersModal from "../../../components/shared/UploadCustomersModal";
import { usePagination } from "../../../hooks/usePagination";
import api from "../../../api/axiosInstance";
import CustomerStyleModal from "../components/CustomerStyleModal";
import CustomerStylesTab from "../components/CustomerStylesTab";

const BuyerManager = () => {
  const { hasPermission, isAdmin } = useAuth();
  const canAdd = isAdmin || hasPermission("crm:customers:add");
  const canEdit = isAdmin || hasPermission("crm:customers:edit");
  const canDelete = isAdmin || hasPermission("crm:customers:delete");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({ total: 0, registered: 0, newToday: 0 });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { pagination, onPageChange, updatePagination, resetPagination } =
    usePagination({ initialLimit: 20 });
  const navigate = useNavigate();
  const { shopSlug, portalRole } = useParams();
  const [createCustomer] = useCreateAdminCustomerMutation();
  const [updateCustomer] = useUpdateAdminCustomerMutation();
  const [deleteCustomerMut] = useDeleteAdminCustomerMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [styleModalCustomer, setStyleModalCustomer] = useState(null);
  const [styleModalEditingStyle, setStyleModalEditingStyle] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    countryCode: "+91",
    dateOfBirth: "",
    gender: "",
    customerType: "Individual",
    registrationDate: new Date().toISOString().split('T')[0],
    // Business fields
    companyName: "",
    businessType: "",
    taxId: "",
    licenseNumber: "",
    website: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    addresses: [],
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleteCustomers] = useBulkDeleteAdminCustomersMutation();

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      await bulkDeleteCustomers(selectedIds).unwrap();
      showSnack(`Successfully deleted ${selectedIds.length} customers`);
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
      fetchCustomers();
    } catch (err) {
      console.error("Bulk delete error:", err);
      showSnack(err.data?.error || err.data?.message || err.message || "Error deleting customers", "error");
    }
  };

  // Debounce search input so user typing doesn't spam the server
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagination when search term changes
  useEffect(() => {
    resetPagination();
  }, [debouncedSearch, resetPagination]);

  // Fetch customers with pagination and backend search
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", pagination.page);
      params.set("limit", pagination.limit);
      if (debouncedSearch && debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }

      const res = await api.get(`/admin/customers?${params.toString()}`);
      if (res?.data?.success) {
        setCustomers(res.data.data || []);
        if (res.data.pagination) {
          updatePagination(res.data.pagination);
        }
        if (res.data.summary) {
          setStatsData({
            total: res.data.summary.total ?? 0,
            registered: res.data.summary.registered ?? 0,
            newToday: res.data.summary.newToday ?? 0,
          });
        }
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
      showSnack("Error loading customers", "error");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, updatePagination]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleExportCustomers = async () => {
    try {
      showSnack("Preparing export...", "info");
      const res = await api.get("/admin/customers?limit=all");
      const allCustomers = res?.data?.data || customers;

      const dataToExport = allCustomers
        .filter((c) => c.name?.toLowerCase() !== "local customer")
        .map((c) => ({
          "Full Name": c.name || "",
          "Phone": c.phone || "",
          "Email": c.email || "",
          "Registration Date": moment(c.createdAt).format("DD MMM YYYY"),
          "Type": c.isWalkIn ? "Invoice Guest" : "Registered Member",
          "Customer Type": c.customerType || "Individual",
          "Company Name": c.companyName || "",
          "Business Type": c.businessType || "",
          "Tax ID": c.taxId || "",
          "License Number": c.licenseNumber || "",
          "Website": c.website || ""
        }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
      XLSX.writeFile(workbook, "customers_export.xlsx");
      showSnack("Customers exported successfully", "success");
    } catch (err) {
      console.error("Export error:", err);
      showSnack("Failed to export customers", "error");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validation = validateFileSize(file);
      if (!validation.isValid) {
        showSnack(validation.message, "error");
        e.target.value = ""; // Reset the input
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddDocument = () => {
    setDocuments([
      ...documents,
      { id: Date.now(), documentId: "", documentName: "", file: null, filePreview: null },
    ]);
  };

  const handleRemoveDocument = (id) => {
    setDocuments(documents.filter((doc) => doc.id !== id));
  };

  const handleDocumentChange = (id, field, value) => {
    setDocuments(
      documents.map((doc) =>
        doc.id === id ? { ...doc, [field]: value } : doc
      )
    );
  };

  const handleDocumentFileChange = (id, file, e) => {
    if (file) {
      const validation = validateFileSize(file);
      if (!validation.isValid) {
        showSnack(validation.message, "error");
        if (e) e.target.value = ""; // Reset the input
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocuments(
          documents.map((doc) =>
            doc.id === id
              ? { ...doc, file: file, filePreview: reader.result }
              : doc
          )
        );
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (customer) => {
    setEditingId(customer._id);
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      countryCode: customer.countryCode || "+91",
      dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth).toISOString().split('T')[0] : "",
      gender: customer.gender || "",
      customerType: customer.customerType || "Individual",
      registrationDate: customer.registrationDate ? new Date(customer.registrationDate).toISOString().split('T')[0] : new Date(customer.createdAt).toISOString().split('T')[0],
      companyName: customer.companyName || "",
      businessType: customer.businessType || "",
      taxId: customer.taxId || "",
      licenseNumber: customer.licenseNumber || "",
      website: customer.website || "",
      addresses: customer.addresses || [],
    });
    setImagePreview(customer.photo?.url || null);
    setSelectedImage(null);
    
    // Load existing documents with proper structure
    const existingDocs = (customer.documents || []).map((doc, index) => ({
      id: doc._id || Date.now() + index,
      documentId: doc.documentId || "",
      documentName: doc.documentName || "",
      file: null,
      filePreview: doc.fileUrl || null, // Show existing file URL
      existingFileUrl: doc.fileUrl || null, // Keep track of existing file
      existingFilePublicId: doc.filePublicId || null,
    }));
    setDocuments(existingDocs);
    
    setActiveTab("personal");
    setIsModalOpen(true);
  };

  const handleAddAddress = () => {
    if ((formData.addresses || []).length >= 3) {
      showSnack("Maximum 3 addresses allowed", "warning");
      return;
    }
    const newAddress = { label: "Home", address: "", city: "", state: "", postalCode: "", isDefault: (formData.addresses || []).length === 0 };
    setFormData({ ...formData, addresses: [...(formData.addresses || []), newAddress] });
  };

  const handleRemoveAddress = (index) => {
    const updated = (formData.addresses || []).filter((_, i) => i !== index);
    // If we removed the default, set the first one as default
    if (updated.length > 0 && !updated.find(a => a.isDefault)) {
      updated[0].isDefault = true;
    }
    setFormData({ ...formData, addresses: updated });
  };

  const handleAddressChange = (index, field, value) => {
    const updated = [...(formData.addresses || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, addresses: updated });
  };

  const setAddressDefault = (index) => {
    const updated = (formData.addresses || []).map((a, i) => ({
      ...a,
      isDefault: i === index
    }));
    setFormData({ ...formData, addresses: updated });
  };

  const confirmDelete = (customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    try {
      await deleteCustomerMut(customerToDelete._id).unwrap();
      showSnack("Customer profile deleted successfully");
      fetchCustomers();
    } catch (err) {
      showSnack(
        rtkErrorMessage(err, "Failed to delete customer"),
        "error",
      );
    } finally {
      setCustomerToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("phone", formData.phone);
      if (formData.countryCode) data.append("countryCode", formData.countryCode);
      if (formData.email) data.append("email", formData.email);
      if (formData.dateOfBirth) data.append("dateOfBirth", formData.dateOfBirth);
      if (formData.gender) data.append("gender", formData.gender);
      if (formData.customerType) data.append("customerType", formData.customerType);
      if (formData.registrationDate) data.append("registrationDate", formData.registrationDate);
      if (formData.companyName) data.append("companyName", formData.companyName);
      if (formData.businessType) data.append("businessType", formData.businessType);
      if (formData.taxId) data.append("taxId", formData.taxId);
      if (formData.licenseNumber) data.append("licenseNumber", formData.licenseNumber);
      if (formData.website) data.append("website", formData.website);
      if (formData.addresses) data.append("addresses", JSON.stringify(formData.addresses));
      if (selectedImage) data.append("photo", selectedImage);

      // Add documents with metadata (only include fileUrl/filePublicId if they exist)
      const documentsData = documents.map((doc) => {
        const docData = {
          documentId: doc.documentId,
          documentName: doc.documentName,
        };
        // Only include file info if it exists (either existing or will be uploaded)
        if (doc.existingFileUrl) {
          docData.fileUrl = doc.existingFileUrl;
          docData.filePublicId = doc.existingFilePublicId;
        }
        return docData;
      });
      data.append("documentsData", JSON.stringify(documentsData));

      // Add only NEW document files (not existing ones)
      documents.forEach((doc) => {
        if (doc.file) {
          data.append("documents", doc.file);
        }
      });

      if (editingId) {
        await updateCustomer({ id: editingId, body: data }).unwrap();
      } else {
        await createCustomer(data).unwrap();
      }

      showSnack(
        editingId ? "Customer updated successfully" : "Customer registered successfully",
        "success",
      );
      setIsModalOpen(false);
      fetchCustomers();
      setFormData({
        name: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        gender: "",
        customerType: "Individual",
        registrationDate: new Date().toISOString().split('T')[0],
        companyName: "",
        businessType: "",
        taxId: "",
        licenseNumber: "",
        website: "",
        addresses: [],
      });
      setSelectedImage(null);
      setImagePreview(null);
      setDocuments([]);
      setEditingId(null);
      setActiveTab("personal");
    } catch (err) {
      showSnack(rtkErrorMessage(err, "Failed to save customer"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const stats = [
    {
      label: "Total Buyers",
      value: statsData.total || customers.length,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Registered",
      value: statsData.registered ?? customers.filter((c) => !c.isWalkIn).length,
      icon: UserPlus,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "New Today",
      value: statsData.newToday ?? customers.filter((c) =>
        moment(c.createdAt).isSame(moment(), "day"),
      ).length,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Total Value",
      value: "N/A",
      icon: TrendingUp,
      color: "bg-indigo-50 text-indigo-600",
    },
  ];

  const columns = [
    {
      header: "Profile",
      render: (customer) => (
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-dark-card overflow-hidden border-2 border-white ring-2 ring-gray-100/50 transition-transform duration-300 group-hover:scale-110 shrink-0">
            {customer.photo?.url ? (
              <img
                src={customer.photo.url}
                alt={customer.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-primary/5 text-brand-primary dark:text-blue-400 font-bold text-sm">
                {customer.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 dark:text-white text-[15px] truncate">
              {customer.name}
            </div>
            <div className="text-[10px] font-bold text-brand-primary dark:text-blue-400 uppercase tracking-widest opacity-70">
              {customer.isWalkIn ? "Invoice Guest" : "Registered Member"}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Contact Information",
      render: (customer) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
            <Phone size={13} className="text-gray-400 dark:text-gray-500" />
            {customer.phone || "N/A"}
          </div>
          {customer.email && (
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
              <Mail size={13} className="text-gray-400 dark:text-gray-500" />
              {customer.email}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Registration",
      render: (customer) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-gray-900 dark:text-gray-200">
            {moment(customer.createdAt).format("DD MMM YYYY")}
          </span>
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
            Joined
          </span>
        </div>
      ),
    },
    ...(canEdit || canDelete ? [{
      header: "Actions",
      align: "right",
      render: (customer) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => navigate(`/${shopSlug}/${portalRole || "admin"}/reports/customer-statement`, { state: { customerId: customer._id } })}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 dark:bg-emerald-900/20 rounded-lg transition-all cursor-pointer"
            title="View Statement"
          >
            <FileText size={16} />
          </button>
          <button
            onClick={() => {
              setStyleModalCustomer(customer);
              setStyleModalEditingStyle(null);
            }}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all cursor-pointer relative"
            title="Customer Cut Styles"
          >
            <Scissors size={16} />
            {customer.styles && customer.styles.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 ring-2 ring-white dark:ring-dark-surface" />
            )}
          </button>
          {canEdit && (
            <button
              onClick={() => handleEdit(customer)}
              className="p-2 text-gray-400 hover:text-brand-primary dark:text-blue-400 hover:bg-brand-primary/5 rounded-lg transition-all cursor-pointer"
            >
              <Edit3 size={16} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => confirmDelete(customer)}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
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
      <StatsGrid stats={stats} loading={loading} />

      <CustomTable
        columns={columns}
        data={customers}
        loading={loading}
        emptyMessage="No profiles found. Try a different search."
        pagination={{
          ...pagination,
          onPageChange,
        }}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, phone, email..."
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
              onClick={handleExportCustomers}
              className="h-10 px-2.5 md:px-4 flex items-center gap-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-dark-card active:scale-95 text-xs shrink-0"
            >
              <Download size={16} />
              <span className="hidden md:inline">Export</span>
            </button>
            {canAdd && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditingCustomer(null);
                  setFormData({
                    name: "",
                    email: "",
                    phone: "",
                    dateOfBirth: "",
                    gender: "",
                    customerType: "Individual",
                    registrationDate: new Date().toISOString().split('T')[0],
                    companyName: "",
                    businessType: "",
                    taxId: "",
                    licenseNumber: "",
                    website: "",
                    address: "",
                    city: "",
                    state: "",
                    country: "",
                    postalCode: "",
                    addresses: [],
                  });
                  setImagePreview(null);
                  setSelectedImage(null);
                  setDocuments([]);
                  setActiveTab("personal");
                  setIsModalOpen(true);
                }}
                className="h-10 px-2.5 md:px-4 flex items-center gap-2 bg-brand-primary text-white font-bold rounded-xl transition-all hover:bg-brand-secondary active:scale-95 text-xs shrink-0"
              >
                <UserPlus size={16} />
                <span className="hidden md:inline">Add Buyer</span>
              </button>
            )}
          </div>
        }
        mobileMapper={{
          leading: (customer) => (
            <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-dark-card overflow-hidden border border-gray-100 dark:border-dark-border flex-shrink-0">
              {customer.photo?.url ? (
                <img
                  src={customer.photo.url}
                  alt={customer.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-lg bg-gray-50 dark:bg-dark-card">
                  {customer.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ),
          title: (customer) => (
            <h4 className="font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight">
              {customer.name}
            </h4>
          ),
          subtitle: (customer) => (
            <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mt-0.5">
              {customer.isWalkIn ? "Invoice Guest" : "Registered Member"}
            </p>
          ),
          trailing: (customer) => (
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 truncate max-w-[80px]">
                {customer.phone}
              </p>
            </div>
          ),
          actions: (customer) => (
            <div className="flex gap-2 pt-2 flex-wrap">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/${shopSlug}/${portalRole || "admin"}/reports/customer-statement`, { state: { customerId: customer._id } });
                }}
                className="flex-1 flex items-center justify-center gap-2 h-10 bg-emerald-50 text-emerald-600 dark:text-emerald-400 rounded-xl text-[11px] font-bold hover:bg-emerald-500 hover:text-white transition-all active:scale-95 border border-emerald-100"
              >
                <FileText size={14} /> Statement
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setStyleModalCustomer(customer);
                  setStyleModalEditingStyle(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 h-10 bg-purple-50 text-purple-600 dark:text-purple-400 rounded-xl text-[11px] font-bold hover:bg-purple-600 hover:text-white transition-all active:scale-95 border border-purple-100"
              >
                <Scissors size={14} /> Styles {customer.styles?.length ? `(${customer.styles.length})` : ""}
              </button>
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(customer);
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
                    confirmDelete(customer);
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

      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* Backdrop */}
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Sidesheet */}
              <Motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full max-w-[700px] bg-white dark:bg-dark-surface shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                    <UserPlus size={20} className="text-brand-primary dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {editingId ? "Update Buyer Profile" : "New Buyer Profile"}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {editingId ? "Update buyer information" : "Add a new buyer to your database"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-hover"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-dark-border overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setActiveTab("personal")}
                    className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap ${
                      activeTab === "personal"
                        ? "text-brand-primary"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      <span>Personal Info</span>
                    </div>
                    {activeTab === "personal" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("business")}
                    className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap ${
                      activeTab === "business"
                        ? "text-brand-primary"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} />
                      <span>Business Info</span>
                    </div>
                    {activeTab === "business" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("documents")}
                    className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap ${
                      activeTab === "documents"
                        ? "text-brand-primary"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={16} />
                      <span>Documents</span>
                    </div>
                    {activeTab === "documents" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("addresses")}
                    className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap ${
                      activeTab === "addresses"
                        ? "text-brand-primary"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin size={16} />
                      <span>Addresses</span>
                    </div>
                    {activeTab === "addresses" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("styles")}
                    className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap ${
                      activeTab === "styles"
                        ? "text-brand-primary"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Scissors size={16} />
                      <span>Styles</span>
                      {editingCustomer?.styles && editingCustomer.styles.length > 0 && (
                        <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                          {editingCustomer.styles.length}
                        </span>
                      )}
                    </div>
                    {activeTab === "styles" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                    )}
                  </button>
                </div>

                {/* Tab Content */}
                <form className="space-y-5" onSubmit={handleSubmit}>
                  {/* Personal Info Tab */}
                  {activeTab === "personal" && (
                    <Motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      {/* Profile Photo */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest px-1">
                          Customer Photo
                        </label>
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-dark-card border-2 border-dashed border-gray-200 dark:border-dark-border overflow-hidden flex items-center justify-center">
                            {imagePreview ? (
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Camera size={32} className="text-gray-300" />
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="text-xs text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:bg-blue-900/20 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                            />
                            <p className="text-[10px] text-brand-primary dark:text-blue-400 font-bold ml-1 uppercase tracking-tight">
                              {getFileSizeHint()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Basic Information */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                          Basic Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <CustomTextField
                            label="Full Name"
                            icon={User}
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            required
                          />
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                              Phone Number <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                              <div className="w-[110px] shrink-0">
                                <CustomDropdown
                                  value={formData.countryCode}
                                  onChange={(e) =>
                                    setFormData({ ...formData, countryCode: e.target.value })
                                  }
                                  options={[
                                    { value: "+91", label: "🇮🇳 +91" },
                                    { value: "+1", label: "🇺🇸 +1" },
                                    { value: "+44", label: "🇬🇧 +44" },
                                    { value: "+971", label: "🇦🇪 +971" },
                                    { value: "+966", label: "🇸🇦 +966" },
                                    { value: "+65", label: "🇸🇬 +65" },
                                    { value: "+61", label: "🇦🇺 +61" },
                                    { value: "+81", label: "🇯🇵 +81" },
                                    { value: "+49", label: "🇩🇪 +49" },
                                    { value: "+33", label: "🇫🇷 +33" },
                                  ]}
                                  buttonClassName="w-full flex items-center justify-between bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-900 dark:text-gray-100 text-xs font-bold px-2 py-2.5 rounded-xl outline-none hover:bg-gray-50 dark:hover:bg-dark-card focus:ring-2 focus:ring-brand-primary/20 duration-200"
                                />
                              </div>
                              <div className="flex-1">
                                <CustomTextField
                                  icon={Phone}
                                  placeholder="00000 00000"
                                  value={formData.phone}
                                  onChange={(e) =>
                                    setFormData({ ...formData, phone: e.target.value })
                                  }
                                  required
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <CustomTextField
                            label="Email Address"
                            icon={Mail}
                            placeholder="customer@example.com"
                            value={formData.email}
                            onChange={(e) =>
                              setFormData({ ...formData, email: e.target.value })
                            }
                          />
                          <CustomDropdown
                            label="Gender"
                            icon={User}
                            placeholder="Select gender"
                            value={formData.gender}
                            onChange={(e) =>
                              setFormData({ ...formData, gender: e.target.value })
                            }
                            options={[
                              { value: "Male", label: "Male" },
                              { value: "Female", label: "Female" },
                              { value: "Other", label: "Other" },
                            ]}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <CustomTextField
                            label="Date of Birth"
                            icon={Calendar}
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) =>
                              setFormData({ ...formData, dateOfBirth: e.target.value })
                            }
                          />
                          <CustomTextField
                            label="Registration Date"
                            icon={Calendar}
                            type="date"
                            value={formData.registrationDate}
                            onChange={(e) =>
                              setFormData({ ...formData, registrationDate: e.target.value })
                            }
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <CustomDropdown
                            label="Customer Type"
                            icon={Briefcase}
                            placeholder="Select type"
                            value={formData.customerType}
                            onChange={(e) =>
                              setFormData({ ...formData, customerType: e.target.value })
                            }
                            options={[
                              { value: "Individual", label: "Individual" },
                              { value: "Business", label: "Business (B2B)" },
                              { value: "Corporate", label: "Corporate" },
                              { value: "Reseller", label: "Reseller" },
                            ]}
                          />
                        </div>
                      </div>
                    </Motion.div>
                  )}

                  {/* Business Info Tab */}
                  {activeTab === "business" && (
                    <Motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                          Company Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <CustomTextField
                            label="Company Name"
                            icon={Building2}
                            placeholder="ABC Corporation"
                            value={formData.companyName}
                            onChange={(e) =>
                              setFormData({ ...formData, companyName: e.target.value })
                            }
                          />
                          <CustomTextField
                            label="Business Type"
                            icon={Briefcase}
                            placeholder="e.g. Retail, Wholesale"
                            value={formData.businessType}
                            onChange={(e) =>
                              setFormData({ ...formData, businessType: e.target.value })
                            }
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <CustomTextField
                            label="Tax ID / EIN"
                            icon={Hash}
                            placeholder="Tax Identification Number"
                            value={formData.taxId}
                            onChange={(e) =>
                              setFormData({ ...formData, taxId: e.target.value })
                            }
                          />
                          <CustomTextField
                            label="License Number"
                            icon={FileText}
                            placeholder="Business License Number"
                            value={formData.licenseNumber}
                            onChange={(e) =>
                              setFormData({ ...formData, licenseNumber: e.target.value })
                            }
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <CustomTextField
                            label="Website"
                            icon={Globe}
                            placeholder="https://example.com"
                            value={formData.website}
                            onChange={(e) =>
                              setFormData({ ...formData, website: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </Motion.div>
                  )}

                  {/* Addresses Tab */}
                  {activeTab === "addresses" && (
                    <Motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                            Customer Addresses
                          </h3>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 uppercase tracking-tighter">Manage up to 3 saved delivery locations</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddAddress}
                          disabled={(formData.addresses || []).length >= 3}
                          className="px-3 py-1.5 bg-brand-primary text-white text-xs font-bold rounded-lg hover:bg-brand-secondary transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus size={14} />
                          Add Address
                        </button>
                      </div>

                      {(formData.addresses || []).length === 0 ? (
                        <div className="text-center py-16 bg-gray-50 dark:bg-dark-card/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-border">
                          <div className="w-16 h-16 bg-white dark:bg-dark-surface rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100 dark:border-dark-border">
                            <MapPin size={28} className="text-gray-300" />
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">No addresses saved</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase mt-1 tracking-widest leading-relaxed">Add a delivery location to help with<br />rapid product fulfillment</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {(formData.addresses || []).map((addr, index) => (
                            <div key={index} className="group relative bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 transition-all hover:shadow-lg hover:shadow-blue-900/5 hover:border-brand-primary/20">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-xl ${addr.isDefault ? "bg-brand-primary/10 text-brand-primary dark:text-blue-400" : "bg-gray-100 dark:bg-dark-card text-gray-400"}`}>
                                    <MapPin size={18} />
                                  </div>
                                  <div className="flex flex-col">
                                    <input
                                      type="text"
                                      value={addr.label || "Home"}
                                      onChange={(e) => handleAddressChange(index, "label", e.target.value)}
                                      className="text-sm font-black text-gray-900 dark:text-white bg-transparent border-none p-0 focus:ring-0 w-24 uppercase tracking-widest outline-none"
                                      placeholder="LABEL"
                                    />
                                    {addr.isDefault && (
                                      <span className="text-[8px] font-black text-brand-primary dark:text-blue-400 uppercase bg-brand-primary/10 w-fit px-1.5 py-0.5 rounded-full mt-1">Default Address</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!addr.isDefault && (
                                    <button
                                      type="button"
                                      onClick={() => setAddressDefault(index)}
                                      className="text-[9px] font-black text-gray-400 hover:text-brand-primary dark:text-blue-400 uppercase tracking-widest px-2 py-1 bg-gray-50 dark:bg-dark-card rounded-lg transition-colors border border-gray-100 dark:border-dark-border"
                                    >
                                      Set Default
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAddress(index)}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                  <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 mb-1 block">Street Address</label>
                                  <input
                                    type="text"
                                    value={addr.address || ""}
                                    onChange={(e) => handleAddressChange(index, "address", e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                                    placeholder="123 Luxury Ave..."
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 mb-1 block">City</label>
                                  <input
                                    type="text"
                                    value={addr.city || ""}
                                    onChange={(e) => handleAddressChange(index, "city", e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                                    placeholder="Palm Beach"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 mb-1 block">State / Pin</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={addr.state || ""}
                                      onChange={(e) => handleAddressChange(index, "state", e.target.value)}
                                      className="flex-1 px-4 py-2 bg-gray-50 dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                                      placeholder="FL"
                                    />
                                    <input
                                      type="text"
                                      value={addr.postalCode || ""}
                                      onChange={(e) => handleAddressChange(index, "postalCode", e.target.value)}
                                      className="w-24 px-4 py-2 bg-gray-50 dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                                      placeholder="33401"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Motion.div>
                  )}

                  {/* Documents Tab */}
                  {activeTab === "documents" && (
                    <Motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                            Customer Documents
                          </h3>
                          <button
                            type="button"
                            onClick={handleAddDocument}
                            className="px-3 py-1.5 bg-brand-primary text-white text-xs font-bold rounded-lg hover:bg-brand-secondary transition-all flex items-center gap-1.5"
                          >
                            <Upload size={14} />
                            Add Document
                          </button>
                        </div>

                        {documents.length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 dark:bg-dark-card rounded-xl border-2 border-dashed border-gray-200 dark:border-dark-border">
                            <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                              No documents added yet
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              Click "Add Document" to upload customer documents
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {documents.map((doc, index) => (
                              <div
                                key={doc.id}
                                className="p-4 bg-gray-50 dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border space-y-3"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                    Document #{index + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDocument(doc.id)}
                                    className="text-red-500 hover:text-red-600 transition-colors"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <CustomTextField
                                    label="Document ID"
                                    icon={Hash}
                                    placeholder="e.g. PAN123"
                                    value={doc.documentId}
                                    onChange={(e) =>
                                      handleDocumentChange(
                                        doc.id,
                                        "documentId",
                                        e.target.value
                                      )
                                    }
                                  />
                                  <CustomTextField
                                    label="Document Name"
                                    icon={FileText}
                                    placeholder="e.g. PAN Card"
                                    value={doc.documentName}
                                    onChange={(e) =>
                                      handleDocumentChange(
                                        doc.id,
                                        "documentName",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest px-1">
                                    Upload Document
                                  </label>
                                  
                                  {/* Show existing file if available */}
                                  {doc.existingFileUrl && !doc.file && (
                                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg">
                                      <File size={20} className="text-blue-600" />
                                      <div className="flex-1">
                                        <p className="text-xs font-bold text-blue-900">Existing Document</p>
                                        <a
                                          href={doc.existingFileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                                        >
                                          View Document
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-3">
                                    {doc.filePreview && doc.file && (
                                      <div className="w-16 h-16 rounded-lg bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border overflow-hidden flex items-center justify-center">
                                        {doc.file?.type?.startsWith("image/") ? (
                                          <img
                                            src={doc.filePreview}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <File size={24} className="text-gray-400 dark:text-gray-500" />
                                        )}
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <div className="flex flex-col gap-1.5 w-full">
                                        <input
                                          type="file"
                                          accept="image/*,.pdf"
                                          onChange={(e) =>
                                            handleDocumentFileChange(
                                              doc.id,
                                              e.target.files[0],
                                              e
                                            )
                                          }
                                          className="text-xs text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:bg-blue-900/20 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer w-full"
                                        />
                                        <p className="text-[10px] text-brand-primary dark:text-blue-400 font-bold ml-1 uppercase tracking-tight">
                                          {getFileSizeHint()}
                                        </p>
                                      </div>
                                      {doc.existingFileUrl && (
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 ml-1">
                                          Upload a new file to replace the existing one
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Motion.div>
                  )}

                  {/* Styles Tab */}
                  {activeTab === "styles" && (
                    <Motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      {editingId ? (
                        <CustomerStylesTab
                          customer={editingCustomer}
                          onOpenUploadModal={(style) => {
                            setStyleModalCustomer(editingCustomer);
                            setStyleModalEditingStyle(style);
                          }}
                          onSuccess={(updatedStyles) => {
                            if (editingCustomer?._id && Array.isArray(updatedStyles)) {
                              setCustomers((prevList) =>
                                prevList.map((c) =>
                                  c._id === editingCustomer._id
                                    ? { ...c, styles: updatedStyles }
                                    : c
                                )
                              );
                              setEditingCustomer((prev) => ({
                                ...prev,
                                styles: updatedStyles,
                              }));
                            }
                          }}
                          showSnack={showSnack}
                        />
                      ) : (
                        <div className="text-center py-14 bg-gray-50 dark:bg-dark-card rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-border px-4">
                          <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center mx-auto mb-3 text-purple-600 dark:text-purple-400">
                            <Scissors size={28} />
                          </div>
                          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                            Save Customer Profile First
                          </h4>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
                            Once the customer profile is registered, you can upload and manage up to 5 photos per cut style and review previous month styles.
                          </p>
                        </div>
                      )}
                    </Motion.div>
                  )}
                </form>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-4 md:px-6 py-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {activeTab === "styles" ? "Close" : "Cancel"}
                </button>
                {activeTab !== "styles" ? (
                  <button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-medium rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{editingId ? "Updating..." : "Registering..."}</span>
                      </>
                    ) : (
                      <span>{editingId ? "Update Profile" : "Register Buyer"}</span>
                    )}
                  </button>
                ) : (
                  editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setStyleModalCustomer(editingCustomer);
                        setStyleModalEditingStyle(null);
                      }}
                      className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-600/20"
                    >
                      <Scissors size={16} />
                      <span>Upload New Cut Style</span>
                    </button>
                  )
                )}
              </div>
            </Motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Customer Style Cut Modal */}
      <CustomerStyleModal
        isOpen={!!styleModalCustomer}
        onClose={() => {
          setStyleModalCustomer(null);
          setStyleModalEditingStyle(null);
        }}
        customer={styleModalCustomer}
        editingStyle={styleModalEditingStyle}
        onSuccess={(updatedStyles) => {
          if (styleModalCustomer?._id && Array.isArray(updatedStyles)) {
            setCustomers((prevList) =>
              prevList.map((c) =>
                c._id === styleModalCustomer._id
                  ? { ...c, styles: updatedStyles }
                  : c
              )
            );
          }
          if (editingCustomer && styleModalCustomer && editingCustomer._id === styleModalCustomer._id) {
            setEditingCustomer((prev) => ({
              ...prev,
              styles: updatedStyles,
            }));
          }
          if (styleModalCustomer) {
            setStyleModalCustomer((prev) => (prev ? { ...prev, styles: updatedStyles } : null));
          }
        }}
        showSnack={showSnack}
      />

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <UploadCustomersModal
          isOpen={showBulkUploadModal}
          onClose={() => setShowBulkUploadModal(false)}
          onUploadSuccess={() => {
            setShowBulkUploadModal(false);
            fetchCustomers();
          }}
          showSnack={showSnack}
        />
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCustomerToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Customer Profile"
        message={`Are you sure you want to delete ${customerToDelete?.name}'s profile? This action is permanent and cannot be undone.`}
        confirmLabel="Delete Profile"
      />

      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Customers"
        message={`Are you sure you want to delete ${selectedIds.length} customers? This action is permanent and cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.length} Customers`}
      />
    </div>
  );
};

export { BuyerManager as CustomerManager };
export default BuyerManager;
