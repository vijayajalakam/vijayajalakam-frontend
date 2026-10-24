import { useEffect, useState, useRef } from "react";
import {
  useGetServicesQuery,
  useGetShopsQuery,
  useGetProductsQuery,
} from "../../../store/api/tenantEndpoints";
import {
  useGetAdminStaffQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useBulkDeleteServicesMutation,
} from "../../../store/api/tenantCrudEndpoints";
import {
  TableSkeleton,
} from "../../../components/shared/Skeleton";
import StatsGrid from "../../../components/shared/StatsGrid";
import {
  Scissors,
  Trash2,
  Edit3,
  Camera,
  Heart,
  Sparkles,
  Loader2,
  Plus,
  LayoutList,
  Store,
  Filter,
  UserCheck,
  Package,
  UploadCloud,
  DownloadCloud,
  Clock,
  Coins,
} from "lucide-react";
import Modal from "../../../components/shared/Modal";
import CustomTable from "../../../components/shared/CustomTable";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import CustomTextField from "../../../components/shared/CustomTextField";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import CustomMultiSelect from "../../../components/shared/CustomMultiSelect";
import BulkImageProgressModal from "../../../components/shared/BulkImageProgressModal";
import UploadServicesModal from "../../../components/shared/UploadServicesModal";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useCurrency } from "../../../hooks/useCurrency";
import ImageGenerationModal from "../../../components/shared/ImageGenerationModal";
import Snackbar from "../../../components/shared/Snackbar";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { validateFileSize, getFileSizeHint } from "../../../utils/fileUploadUtils";
import * as XLSX from "xlsx";

const ServicesManager = () => {
  const { user, currencySymbol, hasPermission, isAdmin } = useAuth();
  const { formatDisplayNumber } = useCurrency();

  const canAdd = isAdmin || hasPermission("services:general:add");
  const canEdit = isAdmin || hasPermission("services:general:edit");
  const canDelete = isAdmin || hasPermission("services:general:delete");
  const canChangeStatus = isAdmin || hasPermission("services:general:status");
  const canGenerateImage = isAdmin || hasPermission("services:general:image");

  const [selectedBranch, setSelectedBranch] = useState(
    user?.role === "staff" && user?.branchId
      ? typeof user.branchId === "string"
        ? user.branchId
        : user.branchId._id
      : "",
  );

  // RTK Queries
  const { data: servicesRaw = [], isLoading: loadingServices, refetch: refetchServices } = useGetServicesQuery("");
  const { data: branchesRaw = [], isLoading: loadingBranches } = useGetShopsQuery("");
  const { data: staffMembersRaw = [], isLoading: loadingStaff } = useGetAdminStaffQuery("");
  const { data: productsRaw = [], isLoading: loadingProducts } = useGetProductsQuery("");

  const loading = loadingServices || loadingBranches || loadingStaff || loadingProducts;

  const services = servicesRaw;
  const branches = branchesRaw;
  const staffMembers = staffMembersRaw;
  const products = productsRaw;

  // Mutations
  const [createService] = useCreateServiceMutation();
  const [updateServiceMut] = useUpdateServiceMutation();
  const [deleteServiceMut] = useDeleteServiceMutation();
  const [bulkDeleteServicesMut] = useBulkDeleteServicesMutation();

  const [isBranchFilterOpen, setIsBranchFilterOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  const [isImageGenerationModalOpen, setIsImageGenerationModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetServiceForImageGeneration, setTargetServiceForImageGeneration] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkImageModal, setShowBulkImageModal] = useState(false);
  const [itemsToGenerate, setItemsToGenerate] = useState([]);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const [newService, setNewService] = useState({
    name: "",
    hsnCode: "",
    description: "",
    price: "",
    duration: 30,
    branches: [],
    staffCommissions: [],
    requiredItems: [],
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const nameRef = useRef(null);

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        nameRef.current?.focus();
      }, 150);
    }
  }, [isModalOpen]);

  const handleExportServices = () => {
    const dataToExport = services.map((service) => ({
      "Service Name": service.name || "",
      "HSN Code": service.hsnCode || "",
      "Price": Number(service.price || 0).toFixed(2),
      "Duration (Mins)": service.duration || 30,
    }));

    const worksheet = XLSX.utils.json_to_sheet(
      dataToExport.length > 0
        ? dataToExport
        : [
            {
              "Service Name": "",
              "HSN Code": "",
              "Price": "0.00",
              "Duration (Mins)": 30,
            },
          ],
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Services");
    XLSX.writeFile(workbook, "Services_Export.xlsx");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validation = validateFileSize(file);
      if (!validation.isValid) {
        showSnack(validation.message, "error");
        e.target.value = "";
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

  const handleImageGenerationSelect = async (imageUrl) => {
    try {
      setIsGenerating(true);
      const name = targetServiceForImageGeneration
        ? targetServiceForImageGeneration.name
        : newService.name;
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const filename = `${name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: "image/jpeg" });

      if (targetServiceForImageGeneration) {
        const formData = new FormData();
        formData.append("image", file);
        await updateServiceMut({
          id: targetServiceForImageGeneration._id,
          body: formData,
        }).unwrap();
        setTargetServiceForImageGeneration(null);
      } else {
        setSelectedImage(file);
        setImagePreview(imageUrl);
      }
    } catch (err) {
      console.error("Failed to select/upload generated image:", err);
      showSnack("Failed to process image generation.", "error");
    } finally {
      setIsGenerating(false);
      setIsImageGenerationModalOpen(false);
    }
  };

  const resetForm = () => {
    const userBranchId = user?.branchId
      ? typeof user.branchId === "string"
        ? user.branchId
        : user.branchId._id
      : null;

    setNewService({
      name: "",
      hsnCode: "",
      description: "",
      price: "",
      duration: 30,
      branches:
        user?.role === "staff" && userBranchId
          ? [userBranchId]
          : branches.map((b) => b._id),
      staffCommissions: [],
      requiredItems: [],
    });
    setSelectedImage(null);
    setImagePreview(null);
    setCurrentService(null);
    setActiveTab("general");
  };

  const handleOpenModal = (service = null) => {
    if (service) {
      setCurrentService(service);
      const serviceBranchIds = service.branches?.map((b) => b._id || b) || [];
      setNewService({
        name: service.name || "",
        hsnCode: service.hsnCode || "",
        description: service.description || "",
        price: service.price ?? "",
        duration: service.duration || 30,
        staffCommissions:
          service.staffCommissions?.map((sc) => ({
            staff: sc.staff?._id || sc.staff,
            commissionPercentage: sc.commissionPercentage,
          })) || [],
        requiredItems: service.requiredItems || [],
        branches:
          user?.role === "staff" && user?.branchId
            ? [
                typeof user.branchId === "string"
                  ? user.branchId
                  : user.branchId._id,
              ]
            : serviceBranchIds.length > 0
              ? serviceBranchIds
              : branches.map((b) => b._id),
      });
      setImagePreview(
        service.image?.url ||
          (typeof service.image === "string" ? service.image : null),
      );
    } else {
      resetForm();
    }
    setIsModalOpen(true);
    setActiveTab("general");
  };

  const handleStaffCommissionChange = (staffId, percentage) => {
    setNewService((prev) => {
      const commissions = [...prev.staffCommissions];
      const index = commissions.findIndex((sc) => sc.staff === staffId);
      if (index >= 0) {
        if (percentage === "" || percentage === null) {
          commissions.splice(index, 1);
        } else {
          commissions[index] = {
            ...commissions[index],
            commissionPercentage: percentage,
          };
        }
      } else if (percentage !== "" && percentage !== null) {
        commissions.push({ staff: staffId, commissionPercentage: percentage });
      }
      return { ...prev, staffCommissions: commissions };
    });
  };

  const handleAddService = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (!newService.name.trim()) {
      showSnack("Service name is required", "error");
      return;
    }

    if (!newService.branches || newService.branches.length === 0) {
      showSnack("Branch selection is required", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("name", newService.name.trim());
      formData.append("hsnCode", newService.hsnCode || "");
      formData.append("description", newService.description || "");
      formData.append("price", newService.price === "" ? "0" : String(newService.price));
      formData.append("duration", String(newService.duration || 30));
      formData.append("branches", JSON.stringify(newService.branches || []));
      formData.append("staffCommissions", JSON.stringify(newService.staffCommissions));
      formData.append("requiredItems", JSON.stringify(newService.requiredItems));
      if (selectedImage) formData.append("image", selectedImage);

      if (currentService) {
        await updateServiceMut({ id: currentService._id, body: formData }).unwrap();
        showSnack("Service updated successfully!", "success");
      } else {
        await createService(formData).unwrap();
        showSnack("Service created successfully!", "success");
      }
      resetForm();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      showSnack(
        err?.data?.message || err?.message || "Failed to save service",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (service) => handleOpenModal(service);

  const handleDeleteClick = (service) => {
    setCurrentService(service);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentService) return;
    try {
      await deleteServiceMut(currentService._id).unwrap();
      showSnack("Service deleted successfully!", "success");
    } catch (err) {
      console.error(err);
      showSnack(
        err?.data?.message || err?.message || "Failed to delete service",
        "error",
      );
    } finally {
      setIsDeleteModalOpen(false);
      setCurrentService(null);
    }
  };

  const toggleFavourite = async (service) => {
    try {
      await updateServiceMut({
        id: service._id,
        body: { isFavourite: !service.isFavourite },
      }).unwrap();
    } catch (err) {
      showSnack(
        err?.data?.message || err?.message || "Failed to update favourite status",
        "error",
      );
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsBulkDeleting(true);
      await bulkDeleteServicesMut(selectedIds).unwrap();
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
      showSnack("Services deleted successfully!", "success");
    } catch (err) {
      showSnack(
        err?.data?.message || err?.message || "Failed to delete services",
        "error",
      );
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const openBulkDeleteConfirm = () => setShowBulkDeleteConfirm(true);

  const openBulkGenerateImages = () => {
    const servicesWithoutImages = services
      .filter(
        (s) =>
          selectedIds.includes(s._id) &&
          (!s.image || (!s.image.url && typeof s.image !== "string")),
      )
      .map((s) => ({ _id: s._id, name: s.name }));

    if (servicesWithoutImages.length === 0) {
      showSnack("All selected services already have images.", "info");
      return;
    }

    setItemsToGenerate(servicesWithoutImages);
    setShowBulkImageModal(true);
  };

  const toggleActive = async (service) => {
    try {
      await updateServiceMut({
        id: service._id,
        body: { isActive: !service.isActive },
      }).unwrap();
    } catch (err) {
      showSnack(
        err?.data?.message || err?.message || "Failed to update service status",
        "error",
      );
    }
  };

  const toggleShowToUser = async (service) => {
    try {
      await updateServiceMut({
        id: service._id,
        body: { showToUser: !service.showToUser },
      }).unwrap();
    } catch (err) {
      showSnack(
        err?.data?.message || err?.message || "Failed to update visibility",
        "error",
      );
    }
  };

  const renderExpandedContent = (s) => {
    return (
      <div className="flex flex-col gap-6 w-full animate-fade-in pl-12 md:pl-0 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-dark-border/80 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary dark:text-blue-400 shrink-0">
              <Scissors size={14} />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-widest">
                Service Overview
              </span>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                Pricing, inventory materials, and staff commissions
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {s.hsnCode && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-dark-card rounded-lg border border-gray-100 dark:border-dark-border/80 shrink-0 self-start">
                <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  HSN Code
                </span>
                <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
                  {s.hsnCode}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-dark-card rounded-lg border border-gray-100 dark:border-dark-border/80 shrink-0 self-start">
              <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Show To User
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (canChangeStatus) toggleShowToUser(s);
                }}
                disabled={!canChangeStatus}
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${s.showToUser !== false ? "bg-emerald-500" : "bg-gray-300"} ${!canChangeStatus ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span
                  className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white dark:bg-dark-surface transition-transform ${s.showToUser !== false ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 1. Pricing Panel */}
          <div className="col-span-1 lg:col-span-1 flex flex-col bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-card/50">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-0.5 block">
                Pricing
              </span>
              <h4 className="text-[13px] font-black text-gray-900 dark:text-white leading-none">
                Service Fee
              </h4>
            </div>
            <div className="p-5 flex flex-col gap-3 bg-white dark:bg-dark-surface">
              <div className="flex justify-between items-center bg-gray-50 dark:bg-dark-card px-4 py-3 rounded-xl border border-gray-100 dark:border-dark-border/60">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                  Standard Rate
                </span>
                <span className="text-base font-black text-gray-900 dark:text-white notranslate">
                  {currencySymbol}
                  {formatDisplayNumber(s.price || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 dark:bg-dark-card px-4 py-3 rounded-xl border border-gray-100 dark:border-dark-border/60">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                  Duration
                </span>
                <span className="text-xs font-black text-gray-900 dark:text-white">
                  {s.duration || 30} mins
                </span>
              </div>
            </div>
          </div>

          {/* 2. Required Inventory Panel */}
          <div className="col-span-1 lg:col-span-1 flex flex-col bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border bg-amber-50/30">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-0.5 block">
                Inventory Setup
              </span>
              <h4 className="text-[13px] font-black text-amber-900 leading-none">
                Required Materials
              </h4>
            </div>
            <div className="p-5 overflow-y-auto max-h-[320px] custom-scrollbar bg-white dark:bg-dark-surface">
              {s.requiredItems && s.requiredItems.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {s.requiredItems.map((item, iIdx) => {
                    const product = products.find(
                      (p) =>
                        String(p._id) ===
                        String(item.product?._id || item.product || item.productId?._id || item.productId),
                    );
                    return (
                      <div
                        key={iIdx}
                        className="flex justify-between items-center bg-gray-50 dark:bg-dark-card px-3 py-2 rounded-xl border border-gray-100 dark:border-dark-border/60"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-[10px] font-bold text-gray-900 dark:text-white truncate">
                            {item.productName || product?.name || "Product"}
                          </span>
                          <span className="text-[8px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                            Linked Item
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-dark-surface shadow-sm border border-gray-100 dark:border-dark-border px-2 py-1 rounded-lg">
                          <span className="text-[11px] font-black text-gray-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                            {product?.unit || item.unit || "QTY"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-gray-100 dark:border-dark-border rounded-xl h-full">
                  <Package size={24} className="text-gray-200 mb-2" />
                  <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
                    No inventory constraints attached
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Commission Rules Panel */}
          <div className="col-span-1 lg:col-span-1 flex flex-col bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border bg-emerald-50 dark:bg-emerald-900/20/30">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-0.5 block">
                Commission Engine
              </span>
              <h4 className="text-[13px] font-black text-emerald-900 leading-none">
                Staff Earnings
              </h4>
            </div>
            <div className="p-5 overflow-y-auto max-h-[320px] custom-scrollbar bg-white dark:bg-dark-surface">
              {staffMembers && staffMembers.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {staffMembers.map((staff) => {
                    const comm = s.staffCommissions?.find(
                      (sc) =>
                        String(sc.staff?._id || sc.staffId?._id || sc.staff || sc.staffId) ===
                        String(staff._id),
                    );
                    const hasOverride = !!comm;
                    const displayAmount = hasOverride
                      ? comm.commissionPercentage || comm.commissionAmount || 0
                      : staff.commissionPercentage || 0;
                    const isPercentage = hasOverride
                      ? comm.commissionType !== "fixed"
                      : true;

                    return (
                      <div
                        key={staff._id}
                        className="flex justify-between items-center bg-gray-50 dark:bg-dark-card px-3 py-2 rounded-xl border border-gray-100 dark:border-dark-border/60"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-[10px] font-bold text-gray-800 dark:text-gray-100 truncate">
                            {staff.name || "Staff Member"}
                          </span>
                          {hasOverride ? (
                            <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                              Overrides Rule
                            </span>
                          ) : (
                            <span className="text-[8px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                              HRM Default
                            </span>
                          )}
                        </div>
                        <div
                          className={`flex items-center gap-1.5 shrink-0 bg-white dark:bg-dark-surface shadow-sm border px-2 py-1 rounded-lg ${hasOverride ? "border-emerald-200 text-emerald-900" : "border-gray-100 dark:border-dark-border text-gray-900 dark:text-white"}`}
                        >
                          {!isPercentage && (
                            <span className="text-[11px] font-black notranslate">
                              {currencySymbol}
                            </span>
                          )}
                          <span className="text-[11px] font-black">
                            {displayAmount}
                          </span>
                          {isPercentage && (
                            <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                              %
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-gray-100 dark:border-dark-border rounded-xl h-full">
                  <UserCheck size={24} className="text-gray-200 mb-2" />
                  <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
                    No staff members found
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const columns = [
    {
      header: "Service Profile",
      render: (s) => (
        <div className={`flex items-center gap-3 ${!s.isActive ? "opacity-50 grayscale" : ""}`}>
          <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-dark-card overflow-hidden border border-gray-100 dark:border-dark-border/50 shadow-inner shrink-0 flex items-center justify-center">
            {s.image && (s.image.url || typeof s.image === "string") ? (
              <img
                src={s.image.url || s.image}
                alt={s.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <Scissors size={20} className="text-gray-300" />
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className={`text-[13px] font-black text-gray-900 dark:text-white ${!s.isActive ? "line-through" : ""}`}>
              {s.name || "Unnamed Service"}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {s.hsnCode && (
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                  HSN: {s.hsnCode}
                </span>
              )}
              <span className="text-[10px] font-semibold text-brand-primary dark:text-blue-400 flex items-center gap-1">
                <Clock size={10} /> {s.duration || 30}m
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Coverage",
      render: (s) => (
        <div className={`flex flex-col ${!s.isActive ? "opacity-50" : ""}`}>
          {s.branches && s.branches.length > 0 ? (
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {s.branches.length > 1 ? `${s.branches.length} Branches` : s.branches[0].name}
            </span>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg self-start">
              All Branches
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Price",
      render: (s) => {
        const basePrice = s.price || 0;
        return (
          <div className={`flex flex-col justify-center ${!s.isActive ? "opacity-50" : ""}`}>
            <span className="text-xs font-black text-gray-700 dark:text-gray-300 notranslate">
              {currencySymbol}
              {formatDisplayNumber(basePrice)}
            </span>
          </div>
        );
      },
    },
    {
      header: "Status",
      align: "center",
      render: (s) => (
        <div className="flex flex-col items-center gap-1">
          <button
            disabled={!canChangeStatus}
            onClick={(e) => {
              e.stopPropagation();
              if (canChangeStatus) toggleActive(s);
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${s.isActive ? "bg-emerald-500 shadow-sm shadow-emerald-500/20" : "bg-gray-200 dark:bg-gray-600"} ${!canChangeStatus ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-dark-surface transition-transform ${s.isActive ? "translate-x-4" : "translate-x-1"}`}
            />
          </button>
          <span className="text-[8px] font-black tracking-widest uppercase text-gray-400 dark:text-gray-500">
            {s.isActive ? "Active" : "Hidden"}
          </span>
        </div>
      ),
    },
    ...(canEdit || canDelete
      ? [
          {
            header: "Actions",
            align: "right",
            render: (s) => (
              <div className="flex items-center gap-1.5 justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavourite(s);
                  }}
                  className={`p-2 rounded-lg transition-colors ${s.isFavourite ? "bg-red-50 text-red-500" : "text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-card hover:text-red-400"}`}
                  title={s.isFavourite ? "Remove from favourites" : "Add to favourites"}
                >
                  <Heart size={16} fill={s.isFavourite ? "currentColor" : "none"} />
                </button>
                <div className="w-px h-5 bg-gray-100 dark:bg-dark-card mx-1" />
                {canGenerateImage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTargetServiceForImageGeneration(s);
                      setIsImageGenerationModalOpen(true);
                    }}
                    className="p-2 text-gray-400 hover:text-brand-primary dark:text-blue-400 hover:bg-blue-50 rounded-lg transition-all active:scale-95 flex items-center justify-center bg-gray-50 dark:bg-dark-card"
                    title="Auto Generate Image"
                  >
                    <Sparkles size={14} />
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(s);
                    }}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-95 bg-gray-50 dark:bg-dark-card"
                    title="Edit Service"
                  >
                    <Edit3 size={14} />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(s);
                    }}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-95 bg-gray-50 dark:bg-dark-card"
                    title="Delete Service"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  const stats = [
    {
      label: "Total Services",
      value: services.length,
      icon: Scissors,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Inventory Linked",
      value: services.filter((s) => s.requiredItems?.length > 0).length,
      icon: Package,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Commission Configured",
      value: services.filter((s) => s.staffCommissions?.length > 0).length,
      icon: Coins,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setIsBranchFilterOpen(!isBranchFilterOpen)}
          className={`h-10 px-4 flex items-center justify-center gap-2 rounded-xl transition-all border text-xs font-bold shrink-0 ${selectedBranch || isBranchFilterOpen ? "bg-brand-primary/5 border-brand-primary/20 text-brand-primary dark:text-blue-400" : "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-card hover:border-brand-primary/10"}`}
        >
          <Filter size={14} />
          <span className="hidden sm:inline">
            {selectedBranch
              ? branches.find((b) => b._id === selectedBranch)?.name
              : "Branch Filter"}
          </span>
          {selectedBranch && (
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          )}
        </button>

        <AnimatePresence>
          {isBranchFilterOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsBranchFilterOpen(false)}
              />
              <Motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute left-0 mt-3 w-64 bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border p-4 z-30 flex flex-col gap-3 shadow-xl shadow-blue-900/10"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">
                    Branch Filter
                  </span>
                  {selectedBranch && (
                    <button
                      onClick={() => {
                        setSelectedBranch("");
                        setIsBranchFilterOpen(false);
                      }}
                      className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {branches
                    .filter((branch) => {
                      if (user?.role === "staff") {
                        const uBranchId =
                          typeof user.branchId === "string"
                            ? user.branchId
                            : user.branchId?._id;
                        return branch._id === uBranchId;
                      }
                      return true;
                    })
                    .map((branch) => (
                      <button
                        key={branch._id}
                        onClick={() => {
                          setSelectedBranch(branch._id);
                          setIsBranchFilterOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl transition-all ${selectedBranch === branch._id ? "bg-brand-primary text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card"}`}
                      >
                        <p className="text-xs font-bold leading-tight">
                          {branch.name}
                        </p>
                        {(branch.mapAddress || branch.address) && (
                          <p
                            className={`text-[9px] truncate ${selectedBranch === branch._id ? "text-white/70" : "text-gray-400 dark:text-gray-500 font-medium"}`}
                          >
                            {branch.mapAddress || branch.address}
                          </p>
                        )}
                      </button>
                    ))}
                </div>
              </Motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {canAdd && (
        <>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="h-10 flex items-center gap-2 px-4 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border hover:border-brand-primary hover:text-brand-primary text-gray-600 dark:text-gray-400 font-bold rounded-xl transition-all active:scale-95 text-xs whitespace-nowrap"
          >
            <UploadCloud size={16} />
            <span className="hidden sm:inline">Upload Services</span>
          </button>
          <button
            onClick={handleExportServices}
            className="h-10 flex items-center gap-2 px-4 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border hover:border-brand-primary hover:text-brand-primary text-gray-600 dark:text-gray-400 font-bold rounded-xl transition-all active:scale-95 text-xs whitespace-nowrap"
          >
            <DownloadCloud size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="h-10 flex items-center gap-2 px-4 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl transition-all active:scale-95 shadow-sm text-xs whitespace-nowrap"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Service</span>
          </button>
        </>
      )}
    </div>
  );

  const bulkActions = (
    <>
      {canGenerateImage && (
        <button
          onClick={openBulkGenerateImages}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-50"
        >
          <Sparkles size={14} />
          <span>Gen Images</span>
        </button>
      )}
      {canDelete && (
        <button
          onClick={openBulkDeleteConfirm}
          disabled={isBulkDeleting}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-50"
        >
          {isBulkDeleting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
          <span>Delete</span>
        </button>
      )}
    </>
  );

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.name?.toLowerCase().includes(search.toLowerCase());
    const matchesBranch =
      !selectedBranch ||
      !s.branches ||
      s.branches.length === 0 ||
      s.branches.some((b) => (b._id || b) === selectedBranch);
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="space-y-3 md:space-y-6">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      <StatsGrid stats={stats} loading={loading} />
      {loading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : (
        <>
          <CustomTable
            key="table-view"
            columns={columns}
            data={filteredServices}
            loading={loading}
            searchQuery={search}
            onSearchChange={setSearch}
            headerActions={headerActions}
            extraFilters={null}
            showSelection={true}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            bulkActions={bulkActions}
            emptyMessage="No services defined yet. Start building your portfolio!"
            expandable={true}
            expandedContent={renderExpandedContent}
            mobileMapper={{
              leading: (s) => (
                <div
                  className={`w-12 h-12 rounded-xl bg-gray-50 dark:bg-dark-card flex items-center justify-center text-gray-300 font-bold border border-gray-100 dark:border-dark-border overflow-hidden ${!s.isActive ? "opacity-50" : ""}`}
                >
                  {s.image && (s.image.url || typeof s.image === "string") ? (
                    <img
                      src={s.image.url || s.image}
                      alt={s.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Scissors size={20} />
                  )}
                </div>
              ),
              title: (s) => (
                <h4
                  className={`font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight ${!s.isActive ? "opacity-50 line-through" : ""}`}
                >
                  {s.name}
                </h4>
              ),
              subtitle: (s) => (
                <p
                  className={`text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mt-0.5 ${!s.isActive ? "opacity-50" : ""}`}
                >
                  {s.duration || 30} mins
                </p>
              ),
              trailing: (s) => (
                <div
                  className={`text-right ${!s.isActive ? "opacity-50" : ""}`}
                >
                  <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">
                    Price
                  </p>
                  <p className="text-[13px] font-black text-gray-900 dark:text-white notranslate">
                    {currencySymbol}
                    {s.price || 0}
                  </p>
                </div>
              ),
              actions: (s) => (
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex gap-2">
                    <button
                      disabled={!canChangeStatus}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!canChangeStatus) return;
                        toggleActive(s);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[11px] font-bold transition-all active:scale-95 border ${s.isActive ? "bg-brand-primary text-white border-brand-primary" : "bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400 border-gray-200 dark:border-dark-border"} ${!canChangeStatus ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {s.isActive ? "Active" : "Inactive"}
                    </button>
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(s);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 h-10 bg-brand-primary/10 text-brand-primary dark:text-blue-400 rounded-xl text-[11px] font-bold hover:bg-brand-primary hover:text-white transition-all active:scale-95 shadow-sm"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {canGenerateImage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetServiceForImageGeneration(s);
                          setIsImageGenerationModalOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 h-10 bg-blue-50 dark:bg-blue-900/20 text-brand-primary dark:text-blue-400 rounded-xl text-[11px] font-bold hover:bg-brand-primary hover:text-white transition-all active:scale-95 shadow-sm border border-blue-100"
                      >
                        <Sparkles size={14} /> AI Image
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(s);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 h-10 bg-red-50 text-red-600 rounded-xl text-[11px] font-bold hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-sm border border-red-100"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ),
            }}
          />
        </>
      )}

      {/* --- ADD / EDIT SERVICE MODAL --- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        position="right"
        title={currentService ? "Edit Service" : "New Service"}
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAddService}
              disabled={isSubmitting}
              className={`flex-1 px-4 py-2.5 text-white font-medium rounded-lg transition-all active:scale-95 ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-brand-primary hover:bg-brand-secondary cursor-pointer"}`}
            >
              {isSubmitting
                ? "Processing..."
                : currentService
                  ? "Update Service"
                  : "Create Service"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddService} className="space-y-6">
          {/* TAB BAR */}
          <div className="flex border-b border-gray-100 dark:border-dark-border pb-1 overflow-x-auto gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === "general" ? "text-brand-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
            >
              General
              {activeTab === "general" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-t" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("commission")}
              className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === "commission" ? "text-brand-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
            >
              Staff Commission
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === "commission" ? "bg-brand-primary/10 text-brand-primary dark:text-blue-400" : "bg-gray-100 dark:bg-dark-card text-gray-500"}`}
              >
                {newService.staffCommissions.length}
              </span>
              {activeTab === "commission" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-t" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("inventory")}
              className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === "inventory" ? "text-brand-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
            >
              Inventory
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === "inventory" ? "bg-brand-primary/10 text-brand-primary dark:text-blue-400" : "bg-gray-100 dark:bg-dark-card text-gray-500"}`}
              >
                {newService.requiredItems.length}
              </span>
              {activeTab === "inventory" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-t" />
              )}
            </button>
          </div>

          {/* ── GENERAL TAB ── */}
          {activeTab === "general" && (
            <div className="space-y-5">
              {/* Row 1: Photo and Details */}
              <div className="flex flex-col md:flex-row gap-5">
                {/* Left Column: Image Upload */}
                <div className="md:w-1/3 flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                      Service Photo
                    </label>
                    {canGenerateImage && (
                      <button
                        type="button"
                        disabled={!newService.name}
                        onClick={() => setIsImageGenerationModalOpen(true)}
                        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${newService.name ? "text-brand-primary dark:text-blue-400 hover:text-brand-secondary cursor-pointer" : "text-gray-300 cursor-not-allowed"}`}
                      >
                        <Sparkles size={12} />
                        Auto Generate
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl h-full min-h-[160px] gap-3">
                    <div className="w-20 h-20 rounded-2xl bg-white dark:bg-dark-surface border-2 border-dashed border-gray-200 dark:border-dark-border overflow-hidden flex items-center justify-center shrink-0">
                      {isGenerating ? (
                        <Loader2
                          size={24}
                          className="text-brand-primary dark:text-blue-400 animate-spin"
                        />
                      ) : imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera size={24} className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-1.5 text-center w-full overflow-hidden">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full max-w-[160px] text-[10px] text-gray-500 dark:text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 dark:bg-blue-900/20 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                      />
                      <p className="text-[9px] text-brand-primary dark:text-blue-400 font-bold uppercase tracking-widest">
                        {getFileSizeHint()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Name & Description */}
                <div className="md:w-2/3 flex flex-col gap-5">
                  <div className="flex gap-4">
                    <div className="flex-[2]">
                      <CustomTextField
                        ref={nameRef}
                        label="Service Name"
                        icon={Scissors}
                        placeholder="e.g. Haircut & Styling"
                        value={newService.name}
                        onChange={(e) =>
                          setNewService({ ...newService, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="flex-[1]">
                      <CustomTextField
                        label="HSN Code"
                        placeholder="e.g. 9997"
                        value={newService.hsnCode}
                        onChange={(e) =>
                          setNewService({
                            ...newService,
                            hsnCode: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-widest pl-1 block">
                      Description
                    </label>
                    <textarea
                      placeholder="e.g. Premium salon styling service..."
                      value={newService.description}
                      onChange={(e) =>
                        setNewService({
                          ...newService,
                          description: e.target.value,
                        })
                      }
                      className="w-full h-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all placeholder:text-gray-400 disabled:opacity-50 min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Price, Duration & Branches */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <CustomTextField
                    label="Service Price"
                    type="number"
                    placeholder="0.00"
                    value={newService.price}
                    onChange={(e) =>
                      setNewService({ ...newService, price: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <CustomTextField
                    label="Duration (Minutes)"
                    type="number"
                    icon={Clock}
                    placeholder="30"
                    value={newService.duration}
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        duration: Number(e.target.value) || 30,
                      })
                    }
                  />
                </div>
                <div>
                  {branches.length > 0 && (
                    <CustomMultiSelect
                      label={
                        <>
                          Assign Branches <span className="text-red-500">*</span>
                        </>
                      }
                      icon={Store}
                      placeholder="Select Branches"
                      value={newService.branches}
                      onChange={(e) =>
                        setNewService({
                          ...newService,
                          branches: e.target.value,
                        })
                      }
                      options={branches
                        .filter((b) => {
                          if (user?.role === "staff") {
                            const uBranchId =
                              typeof user.branchId === "string"
                                ? user.branchId
                                : user.branchId?._id;
                            return b._id === uBranchId;
                          }
                          return true;
                        })
                        .map((b) => ({
                          value: b._id,
                          label: b.name,
                          description: b.mapAddress || b.address,
                        }))}
                      isSearchable={true}
                      showSelectAll={user?.role !== "staff"}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── INVENTORY TAB ── */}
          {activeTab === "inventory" && (
            <div className="space-y-6">
              <div className="bg-brand-primary/5 p-4 rounded-2xl border border-brand-primary/10">
                <h4 className="text-sm font-bold text-brand-primary dark:text-blue-400 mb-1">
                  Service Inventory Requirements
                </h4>
                <p className="text-[11px] text-brand-primary dark:text-blue-400/70 font-medium">
                  Link products that are consumed when this service is performed.
                  Stock will be deducted automatically upon sale.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <CustomDropdown
                      label="Select Product to Add"
                      icon={Plus}
                      placeholder="Search products..."
                      options={products
                        .filter(
                          (p) =>
                            !newService.requiredItems.some(
                              (ri) =>
                                String(ri.product?._id || ri.product) ===
                                String(p._id),
                            ),
                        )
                        .map((p) => ({
                          value: p._id,
                          label: p.name,
                          description: `Current Stock: ${p.currentStock || 0}`,
                        }))}
                      onChange={(e) => {
                        const val =
                          typeof e === "object" && e !== null && "target" in e
                            ? e.target.value
                            : e;
                        if (!val) return;
                        const product = products.find(
                          (p) => String(p._id) === String(val),
                        );
                        if (product) {
                          setNewService((prev) => ({
                            ...prev,
                            requiredItems: [
                              ...prev.requiredItems,
                              {
                                product: product._id,
                                productName: product.name,
                                quantity: 1,
                              },
                            ],
                          }));
                        }
                      }}
                      isSearchable={true}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {newService.requiredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 bg-gray-50 dark:bg-dark-card rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-border">
                      <LayoutList size={32} className="text-gray-300 mb-2" />
                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500">
                        No inventory items linked yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {newService.requiredItems.map((item, idx) => {
                        const product = products.find(
                          (p) =>
                            String(p._id) ===
                            String(item.product?._id || item.product),
                        );
                        return (
                          <div
                            key={idx}
                            className="bg-white dark:bg-dark-surface p-3 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm flex items-center gap-4"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-dark-card flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold border border-gray-100 dark:border-dark-border flex-shrink-0">
                              {product?.image?.url ? (
                                <img
                                  src={product.image.url}
                                  alt=""
                                  className="w-full h-full object-cover rounded-xl"
                                />
                              ) : (
                                <LayoutList size={18} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {product?.name || item.productName || "Product"}
                              </h5>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">
                                Stock: {product?.currentStock || 0}
                              </p>
                            </div>
                            <div className="w-28">
                              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-dark-card px-2 py-1.5 rounded-xl border border-gray-100 dark:border-dark-border">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                                  Qty:
                                </span>
                                <CustomTextField
                                  type="number"
                                  placeholder="Qty"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setNewService((prev) => ({
                                      ...prev,
                                      requiredItems: prev.requiredItems.map(
                                        (ri, i) =>
                                          i === idx ? { ...ri, quantity: val } : ri,
                                      ),
                                    }));
                                  }}
                                  className="h-7 border-none bg-transparent shadow-none focus:ring-0 text-xs font-bold w-12 p-0 text-center"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNewService((prev) => ({
                                  ...prev,
                                  requiredItems: prev.requiredItems.filter(
                                    (_, i) => i !== idx,
                                  ),
                                }));
                              }}
                              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── COMMISSION TAB ── */}
          {activeTab === "commission" && (
            <div className="space-y-3">
              {staffMembers.length > 0 ? (
                <>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-400 mb-1">
                      Staff Commissions Override
                    </h4>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-500 font-medium">
                      Configure custom commission percentages for specific staff
                      members. Left blank, default staff commission rates apply.
                    </p>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {staffMembers.map((staff) => {
                      const comm = newService.staffCommissions.find(
                        (sc) => sc.staff === staff._id,
                      );
                      const currentVal =
                        comm && comm.commissionPercentage !== undefined
                          ? comm.commissionPercentage
                          : "";
                      return (
                        <div
                          key={staff._id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                              {staff.name?.charAt(0) || "S"}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 dark:text-white">
                                {staff.name}
                              </p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                Default: {staff.commissionPercentage || 0}%
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 w-24">
                            <CustomTextField
                              type="number"
                              placeholder={`${staff.commissionPercentage || 0}`}
                              value={currentVal}
                              onChange={(e) =>
                                handleStaffCommissionChange(
                                  staff._id,
                                  e.target.value === "" ? "" : Number(e.target.value),
                                )
                              }
                              className="h-8 text-xs font-bold text-right"
                            />
                            <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                              %
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                  <UserCheck size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No staff members found</p>
                </div>
              )}
            </div>
          )}
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCurrentService(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Service"
        message={`Are you sure you want to delete the service "${currentService?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Service"
        type="danger"
      />

      <ImageGenerationModal
        isOpen={isImageGenerationModalOpen}
        onClose={() => {
          setIsImageGenerationModalOpen(false);
          setTargetServiceForImageGeneration(null);
        }}
        onSelect={handleImageGenerationSelect}
        searchQuery={
          targetServiceForImageGeneration
            ? targetServiceForImageGeneration.name
            : newService.name
        }
      />

      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Services"
        message={`Are you sure you want to delete ${selectedIds.length} services? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.length} Items`}
        type="danger"
      />

      <BulkImageProgressModal
        isOpen={showBulkImageModal}
        onClose={() => {
          setShowBulkImageModal(false);
          setSelectedIds([]);
        }}
        items={itemsToGenerate}
        onComplete={refetchServices}
        type="service"
      />

      <UploadServicesModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={() => refetchServices()}
        showSnack={showSnack}
      />
    </div>
  );
};

export default ServicesManager;
