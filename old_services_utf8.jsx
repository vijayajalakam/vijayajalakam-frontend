import { useEffect, useState, useRef } from "react";
import api from "../../../api/axiosInstance";
import {
  TableSkeleton,
  StatsSkeleton,
} from "../../../components/shared/Skeleton";
import StatsGrid from "../../../components/shared/StatsGrid";
import {
  Scissors,
  Star,
  Trash2,
  Edit3,
  LayoutGrid,
  List,
  Camera,
  Heart,
  Percent,
  Sparkles,
  Loader2,
  Search,
  RefreshCcw,
  RefreshCw,
  Plus,
  LayoutList,
  Check,
  ListTree,
  Store,
  Filter,
  ChevronDown,
} from "lucide-react";
import Modal from "../../../components/shared/Modal";
import CustomTable from "../../../components/shared/CustomTable";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import CustomTextField from "../../../components/shared/CustomTextField";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import CustomMultiSelect from "../../../components/shared/CustomMultiSelect";
import BulkImageProgressModal from "../../../components/shared/BulkImageProgressModal";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import UnsplashImageModal from "../../../components/shared/UnsplashImageModal";
import Snackbar from "../../../components/shared/Snackbar";
import { motion as Motion, AnimatePresence } from "framer-motion";

const ServicesManager = () => {
  const { user, currencySymbol } = useAuth();

  const [services, setServices] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [availableVariants, setAvailableVariants] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [isBranchFilterOpen, setIsBranchFilterOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentService, setCurrentService] = useState(null);
  const [isUnsplashModalOpen, setIsUnsplashModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetServiceForUnsplash, setTargetServiceForUnsplash] =
    useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkImageModal, setShowBulkImageModal] = useState(false);
  const [itemsToGenerate, setItemsToGenerate] = useState([]);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const [newService, setNewService] = useState({
    name: "",
    price: "",
    categories: [],
    pricing: [],
    taxId: "",
    isTaxInclusive: false,
    useVariants: false,
    variants: [],
    branches: [],
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameRef = useRef(null);
  const taxRef = useRef(null);
  const pricingRefs = useRef({});

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        nameRef.current?.focus();
      }, 150);
    }
  }, [isModalOpen]);

  const handleKeyDown = (e, nextRef) => {
    if (e.key === "Enter") {
      if (e.target.tagName === "TEXTAREA") return;
      e.preventDefault();
      if (nextRef === "submit") {
        handleAddService(e);
      } else if (nextRef && nextRef.current) {
        nextRef.current.focus();
        if (nextRef.current.tagName === "SELECT") {
          // No specific open for native select but we focus it
        }
      } else if (typeof nextRef === "string" && pricingRefs.current[nextRef]) {
        pricingRefs.current[nextRef].focus();
      }
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const responses = await Promise.all([
        api.get("/services"),
        api.get("/departments"),
        api.get("/categories"),
        api.get("/taxes?active=true"),
        api.get("/variants"),
        api.get("/shops"),
      ]);

      const [
        servicesRes,
        deptsRes,
        catsRes,
        taxesRes,
        variantsRes,
        branchesRes,
      ] = responses;

      if (servicesRes.data.success) setServices(servicesRes.data.data || []);
      if (deptsRes.data.success) {
        const order = { man: 1, woman: 2, kid: 3 };
        const sortedDepts = (deptsRes.data.data || []).sort((a, b) => {
          const nameA = a.name?.toLowerCase() || "";
          const nameB = b.name?.toLowerCase() || "";

          if (order[nameA] && order[nameB]) {
            return order[nameA] - order[nameB];
          }
          if (order[nameA]) return -1;
          if (order[nameB]) return 1;

          return nameA.localeCompare(nameB);
        });
        setDepartments(sortedDepts);
      }
      if (catsRes.data.success)
        setCategories((catsRes.data.data || []).filter((c) => c.isActive));
      if (taxesRes.data.success) setTaxes(taxesRes.data.data || []);
      if (variantsRes.data.success)
        setAvailableVariants(
          (variantsRes.data.data || []).filter(
            (v) => v.isActive && v.type === "service",
          ),
        );
      if (branchesRes.data.success) setBranches(branchesRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUnsplashSelect = async (imageUrl) => {
    try {
      setIsGenerating(true);
      const name = targetServiceForUnsplash
        ? targetServiceForUnsplash.name
        : newService.name;
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const filename = `${name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: "image/jpeg" });

      if (targetServiceForUnsplash) {
        // Direct save to backend
        const formData = new FormData();
        formData.append("image", file);
        const config = { headers: { "Content-Type": "multipart/form-data" } };
        await api.put(
          `/services/${targetServiceForUnsplash._id}`,
          formData,
          config,
        );
        fetchData();
        setTargetServiceForUnsplash(null);
      } else {
        // Modal mode
        setSelectedImage(file);
        setImagePreview(imageUrl);
      }
    } catch (err) {
      console.error("Error converting Unsplash image:", err);
      showSnack("Failed to update image. Please try again.", "error");
    } finally {
      setIsGenerating(false);
      setIsUnsplashModalOpen(false);
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
      price: "",
      categories: [],
      pricing: [],
      taxId: "",
      isTaxInclusive: false,
      useVariants: false,
      variants: [],
      branches:
        user?.role === "staff" && userBranchId
          ? [userBranchId]
          : branches.map((b) => b._id),
    });
    setSelectedImage(null);
    setImagePreview(null);
    setCurrentService(null);
  };

  const handleOpenModal = (service = null) => {
    if (service) {
      setCurrentService(service);
      const serviceBranchIds = service.branches?.map((b) => b._id || b) || [];
      setNewService({
        name: service.name,
        price: service.price || "",
        categories: service.categories?.map((c) => c._id) || [],
        pricing: service.pricing || [],
        taxId: service.taxId?._id || service.taxId || "",
        isTaxInclusive: service.isTaxInclusive || false,
        useVariants: service.variants && service.variants.length > 0,
        variants: service.variants || [],
        branches:
          serviceBranchIds.length > 0
            ? serviceBranchIds
            : user?.role === "staff" && user?.branchId
              ? [
                  typeof user.branchId === "string"
                    ? user.branchId
                    : user.branchId._id,
                ]
              : branches.map((b) => b._id),
      });
      setImagePreview(
        service.image?.url ||
          (typeof service.image === "string" ? service.image : null),
      );
    } else {
      resetForm();
      const initialPricing = departments.map((d) => ({
        department: d._id,
        price: "",
      }));
      const userBranchId = user?.branchId
        ? typeof user.branchId === "string"
          ? user.branchId
          : user.branchId._id
        : null;

      const defaultBranchIds =
        user?.role === "staff" && userBranchId
          ? [userBranchId]
          : branches.map((b) => b._id);

      setNewService((prev) => ({
        ...prev,
        pricing: initialPricing,
        branches: defaultBranchIds,
      }));
    }
    setIsModalOpen(true);
  };

  const toggleCategory = (catId) => {
    setNewService((prev) => {
      const exists = prev.categories.includes(catId);
      if (exists) {
        return {
          ...prev,
          categories: prev.categories.filter((id) => id !== catId),
        };
      } else {
        return { ...prev, categories: [...prev.categories, catId] };
      }
    });
  };

  const handlePriceChange = (deptId, price) => {
    setNewService((prev) => {
      const existingPricing = [...prev.pricing];
      const index = existingPricing.findIndex(
        (p) => p.department === deptId || p.department?._id === deptId,
      );
      if (index >= 0) {
        existingPricing[index] = { ...existingPricing[index], price };
      } else {
        existingPricing.push({ department: deptId, price });
      }
      return { ...prev, pricing: existingPricing };
    });
  };

  const getPriceForDept = (deptId) => {
    const item = newService.pricing.find(
      (p) => p.department === deptId || p.department?._id === deptId,
    );
    return item ? item.price : "";
  };

  const handleVariantPriceChange = (variantId, deptId, price) => {
    setNewService((prev) => {
      const newVariants = [...prev.variants];
      let variantIndex = newVariants.findIndex(
        (v) => v.variantId === variantId || v.variantId?._id === variantId,
      );

      if (variantIndex === -1) {
        newVariants.push({
          variantId,
          pricing: [{ department: deptId, price }],
        });
      } else {
        const newPricing = [...newVariants[variantIndex].pricing];
        const priceIndex = newPricing.findIndex(
          (p) => p.department === deptId || p.department?._id === deptId,
        );

        if (priceIndex === -1) {
          newPricing.push({ department: deptId, price });
        } else {
          newPricing[priceIndex] = { ...newPricing[priceIndex], price };
        }
        newVariants[variantIndex] = {
          ...newVariants[variantIndex],
          pricing: newPricing,
        };
      }
      return { ...prev, variants: newVariants };
    });
  };

  const getVariantPrice = (variantId, deptId) => {
    const variant = newService.variants.find(
      (v) => v.variantId === variantId || v.variantId?._id === variantId,
    );
    if (!variant) return "";
    const pricing = variant.pricing.find(
      (p) => p.department === deptId || p.department?._id === deptId,
    );
    return pricing ? pricing.price : "";
  };

  const handleCommonAmountChange = (amount) => {
    // Only update base department pricing (used when variants are OFF)
    const updatedPricing = departments.map((d) => ({
      department: d._id,
      price: amount,
    }));
    setNewService((prev) => ({
      ...prev,
      price: amount,
      pricing: updatedPricing,
    }));
  };

  const handleVariantCommonAmountChange = (variantId, amount) => {
    setNewService((prev) => {
      const newVariants = [...prev.variants];
      const variantIndex = newVariants.findIndex(
        (v) => v.variantId === variantId || v.variantId?._id === variantId,
      );
      if (variantIndex > -1) {
        newVariants[variantIndex] = {
          ...newVariants[variantIndex],
          price: amount,
          pricing: departments.map((d) => ({
            department: d._id,
            price: amount,
          })),
        };
      }
      return { ...prev, variants: newVariants };
    });
  };

  const handleAddService = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (!newService.branches || newService.branches.length === 0) {
      showSnack("Branch selection is required", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("name", newService.name);
      formData.append("categories", JSON.stringify(newService.categories));
      const validPricing = newService.pricing
        .filter((p) => p.price !== "" && p.price !== null)
        .map((p) => ({
          department:
            typeof p.department === "object" ? p.department._id : p.department,
          price: p.price,
        }));
      formData.append("pricing", JSON.stringify(validPricing));
      formData.append("price", newService.price);
      formData.append("taxId", newService.taxId || "");
      formData.append("isTaxInclusive", newService.isTaxInclusive);
      formData.append("useVariants", newService.useVariants);
      formData.append("branches", JSON.stringify(newService.branches || []));
      if (newService.useVariants) {
        formData.append("variants", JSON.stringify(newService.variants));
      } else {
        formData.append("variants", JSON.stringify([]));
      }
      if (selectedImage) formData.append("image", selectedImage);

      const config = { headers: { "Content-Type": "multipart/form-data" } };

      if (currentService) {
        await api.put(`/services/${currentService._id}`, formData, config);
      } else {
        await api.post("/services", formData, config);
      }
      resetForm();
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showSnack(
        err.response?.data?.message || "Failed to save service",
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
      await api.delete(`/services/${currentService._id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      showSnack(
        err.response?.data?.message || "Failed to delete service",
        "error",
      );
    } finally {
      setIsDeleteModalOpen(false);
      setCurrentService(null);
    }
  };

  const toggleFavourite = async (service) => {
    try {
      await api.put(`/services/${service._id}`, {
        isFavourite: !service.isFavourite,
      });
      fetchData();
    } catch (err) {
      showSnack(
        err.response?.data?.message || "Failed to update favourite status",
        "error",
      );
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsBulkDeleting(true);
      await api.delete("/services/bulk", { data: { ids: selectedIds } });
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      showSnack(
        err.response?.data?.message || "Failed to delete services",
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
      await api.put(`/services/${service._id}`, {
        isActive: !service.isActive,
      });
      fetchData();
    } catch (err) {
      showSnack(
        err.response?.data?.message || "Failed to update service status",
        "error",
      );
    }
  };

  const columns = [
    {
      header: "Icon",
      width: "w-16",
      render: (s) => (
        <div
          className={`flex items-center gap-3 ${!s.isActive ? "opacity-50" : ""}`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavourite(s);
            }}
            className={`transition-colors ${s.isFavourite ? "text-red-500" : "text-gray-200 hover:text-red-400"}`}
            title={
              s.isFavourite ? "Remove from favourites" : "Add to favourites"
            }
          >
            <Heart size={16} fill={s.isFavourite ? "currentColor" : "none"} />
          </button>
          <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border-2 border-white shadow-sm ring-2 ring-gray-100/50 transition-transform duration-300 group-hover:scale-110">
            {s.image && (s.image.url || typeof s.image === "string") ? (
              <img
                src={s.image.url || s.image}
                alt={s.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-50 text-brand-primary font-bold text-lg">
                <Scissors size={20} />
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Service Details",
      render: (s) => (
        <div className={`space-y-0.5 ${!s.isActive ? "opacity-50" : ""}`}>
          <p
            className={`font-semibold text-gray-900 tracking-tight text-sm min-w-[200px] ${!s.isActive ? "line-through" : ""}`}
          >
            {s.name || "N/A"}
          </p>
          <div className="flex flex-wrap gap-1">
            {s.categories && s.categories.length > 0 ? (
              s.categories.map((c) => (
                <span
                  key={c._id}
                  className="text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-1.5 py-0.5 rounded-md"
                >
                  {c.name}
                </span>
              ))
            ) : (
              <span className="text-[9px] font-bold text-gray-400 uppercase">
                Uncategorized
              </span>
            )}
          </div>
          {s.branches && s.branches.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {s.branches.map((b) => (
                <span
                  key={b._id}
                  className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded-md"
                >
                  {b.name}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded-md">
                All Branches
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Pricing",
      render: (s) => {
        const taxPct = s.taxId?.percentage || 0;
        const isInclusive = s.isTaxInclusive;

        return (
          <div
            className={`flex flex-col gap-1 ${!s.isActive ? "opacity-50" : ""}`}
          >
            {s.useVariants && s.variants && s.variants.length > 0 ? (
              <div className="flex flex-col gap-2">
                {s.variants.map((v, vIdx) => (
                  <div
                    key={vIdx}
                    className="bg-blue-50/30 p-2 rounded-xl border border-blue-100/50"
                  >
                    <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-blue-100/30">
                      <ListTree size={12} className="text-brand-primary" />
                      <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
                        {v.variantName ||
                          v.variantId?.name ||
                          availableVariants.find(
                            (av) =>
                              av._id === (v.variantId?._id || v.variantId),
                          )?.name ||
                          "Variant"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {v.pricing?.map((p, pIdx) => {
                        const vTaxId =
                          v.taxId?._id || v.taxId || s.taxId?._id || s.taxId;
                        const vTax =
                          taxes.find((t) => t._id === vTaxId) ||
                          (vTaxId === (s.taxId?._id || s.taxId)
                            ? s.taxId
                            : null);
                        const vTaxPct = vTax?.percentage || 0;
                        const vIsInclusive =
                          v.isTaxInclusive !== undefined
                            ? v.isTaxInclusive
                            : s.isTaxInclusive;

                        const basePrice = p.price || v.price || s.price || 0;
                        let displayPrice = basePrice;
                        let taxAmount = 0;

                        if (vTaxPct > 0) {
                          if (vIsInclusive) {
                            taxAmount =
                              basePrice - basePrice / (1 + vTaxPct / 100);
                            displayPrice = basePrice;
                          } else {
                            taxAmount = basePrice * (vTaxPct / 100);
                            displayPrice = basePrice + taxAmount;
                          }
                        }

                        return (
                          <div
                            key={pIdx}
                            className="bg-white px-2 py-1 rounded-lg border border-gray-100 flex flex-col gap-0.5"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
                                {p.department?.name ||
                                  departments.find(
                                    (d) =>
                                      d._id ===
                                      (p.department?._id || p.department),
                                  )?.name ||
                                  "Dept"}
                              </span>
                              <span className="text-[11px] font-black text-brand-primary notranslate">
                                {currencySymbol}
                                {Math.round(displayPrice)}
                              </span>
                            </div>
                            {vTaxPct > 0 && (
                              <div className="flex justify-between items-center border-t border-gray-50 mt-0.5 pt-0.5">
                                <span className="text-[7px] font-bold text-gray-400">
                                  {vTax?.name}
                                </span>
                                <span
                                  className={`text-[7px] font-bold ${vIsInclusive ? "text-gray-400" : "text-emerald-500"}`}
                                >
                                  {vIsInclusive
                                    ? `Incl. Tax (${currencySymbol}${Math.round(taxAmount)})`
                                    : `Tax: +${currencySymbol}${Math.round(taxAmount)}`}
                                  {` (${vTaxPct}%)`}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {v.pricing?.length === 0 &&
                      (() => {
                        const vTaxId =
                          v.taxId?._id || v.taxId || s.taxId?._id || s.taxId;
                        const vTax =
                          taxes.find((t) => t._id === vTaxId) ||
                          (vTaxId === (s.taxId?._id || s.taxId)
                            ? s.taxId
                            : null);
                        const vTaxPct = vTax?.percentage || 0;
                        const vIsInclusive =
                          v.isTaxInclusive !== undefined
                            ? v.isTaxInclusive
                            : s.isTaxInclusive;

                        const basePrice = v.price || s.price || 0;
                        let taxAmt = 0;
                        if (vTaxPct > 0) {
                          taxAmt = vIsInclusive
                            ? basePrice - basePrice / (1 + vTaxPct / 100)
                            : basePrice * (vTaxPct / 100);
                        }

                        return (
                          <div className="flex bg-white px-2 py-1 rounded-lg border border-blue-100 flex-col gap-0.5 mt-1">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">
                                Price
                              </span>
                              <span className="text-[11px] font-black text-brand-primary notranslate">
                                {currencySymbol}
                                {Math.round(
                                  vIsInclusive ? basePrice : basePrice + taxAmt,
                                )}
                              </span>
                            </div>
                            {vTaxPct > 0 && (
                              <div className="flex justify-between items-center border-t border-gray-50 mt-0.5 pt-0.5">
                                <span className="text-[7px] font-bold text-gray-400">
                                  {vTax?.name || "Tax"} ({vTaxPct}%)
                                </span>
                                <span
                                  className={`text-[7px] font-bold ${vIsInclusive ? "text-gray-400" : "text-emerald-500"}`}
                                >
                                  {vIsInclusive
                                    ? `Incl. Tax (${currencySymbol}${Math.round(taxAmt)})`
                                    : `Tax: +${currencySymbol}${Math.round(taxAmt)}`}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {s.pricing && s.pricing.length > 0 ? (
                  [...s.pricing]
                    .sort((a, b) => {
                      const order = { man: 1, woman: 2, kid: 3 };
                      const aName =
                        a.department?.name ||
                        departments.find(
                          (d) => d._id === (a.department?._id || a.department),
                        )?.name ||
                        "";
                      const bName =
                        b.department?.name ||
                        departments.find(
                          (d) => d._id === (b.department?._id || b.department),
                        )?.name ||
                        "";
                      const nameA = aName.toLowerCase();
                      const nameB = bName.toLowerCase();

                      if (order[nameA] && order[nameB]) {
                        return order[nameA] - order[nameB];
                      }
                      if (order[nameA]) return -1;
                      if (order[nameB]) return 1;

                      return nameA.localeCompare(nameB);
                    })
                    .map((p, idx) => {
                      const basePrice = p.price || 0;
                      let displayPrice = basePrice;
                      let taxAmount = 0;

                      if (taxPct > 0) {
                        if (isInclusive) {
                          taxAmount =
                            basePrice - basePrice / (1 + taxPct / 100);
                          displayPrice = basePrice;
                        } else {
                          taxAmount = basePrice * (taxPct / 100);
                          displayPrice = basePrice + taxAmount;
                        }
                      }

                      return (
                        <div
                          key={idx}
                          className="flex flex-col bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100 min-w-[120px]"
                        >
                          <div className="flex justify-between items-center gap-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                              {p.department?.name || "Dept"}
                            </span>
                            <span className="text-sm font-black text-gray-900">
                              <span className="notranslate">
                                {currencySymbol}
                                {Math.round(displayPrice)}
                              </span>
                            </span>
                          </div>

                          {taxPct > 0 && (
                            <div className="flex justify-between items-center mt-1 pt-1 border-t border-gray-200/60">
                              <span className="text-[9px] font-bold text-gray-400">
                                {s.taxId?.name} ({taxPct}%)
                              </span>
                              <span
                                className={`text-[9px] font-bold notranslate ${isInclusive ? "text-gray-400" : "text-emerald-500"}`}
                              >
                                {isInclusive ? "Incl. Tax: " : "Tax: +"}
                                {currencySymbol}
                                {Math.round(taxAmount)}
                                {` (${taxPct}%)`}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                ) : (
                  <div className="flex flex-col bg-blue-50/30 px-2 py-1.5 rounded-lg border border-blue-100/50 min-w-[120px]">
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                        Service Price
                      </span>
                      <span className="text-sm font-black text-gray-900">
                        <span className="notranslate">
                          {currencySymbol}
                          {Math.round(s.price || 0)}
                        </span>
                      </span>
                    </div>
                    {taxPct > 0 && (
                      <div className="flex justify-between items-center mt-1 pt-1 border-t border-blue-100/30">
                        <span className="text-[9px] font-bold text-gray-400">
                          {s.taxId?.name} ({taxPct}%)
                        </span>
                        <span
                          className={`text-[9px] font-bold notranslate ${isInclusive ? "text-gray-400" : "text-emerald-500"}`}
                        >
                          {isInclusive ? "Incl. " : "+"}
                          {currencySymbol}
                          {(
                            (s.price || 0) *
                            (taxPct / 100) *
                            (isInclusive ? 0 : 1)
                          ).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Actions",
      align: "right",
      render: (s) => (
        <div className="flex items-center justify-end gap-2">
          {/* Toggle Switch */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleActive(s);
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${s.isActive ? "bg-brand-primary" : "bg-gray-200"}`}
            title={s.isActive ? "Deactivate" : "Activate"}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${s.isActive ? "translate-x-5" : "translate-x-1"}`}
            />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setTargetServiceForUnsplash(s);
              setIsUnsplashModalOpen(true);
            }}
            className="p-2 text-gray-400 hover:text-brand-primary hover:bg-blue-50 rounded-lg transition-all active:scale-95 cursor-pointer"
            title="Auto Generate Image"
          >
            <Sparkles size={18} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(s);
            }}
            className="p-2 text-gray-400 hover:text-brand-primary hover:bg-blue-50 rounded-lg transition-all active:scale-95 cursor-pointer"
          >
            <Edit3 size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(s);
            }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-95 cursor-pointer"
            title="Remove Service"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ),
    },
  ];

  const stats = [
    {
      label: "Active Services",
      value: services.length,
      icon: Scissors,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Categories",
      value: categories.length,
      icon: List,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Departments",
      value: departments.length,
      icon: Star,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => fetchData()}
        className="h-10 w-10 flex items-center justify-center bg-gray-100 text-gray-400 hover:text-brand-primary rounded-xl transition-all active:scale-95"
      >
        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
      </button>
      <button
        onClick={() => handleOpenModal()}
        className="h-10 flex items-center gap-2 px-4 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl transition-all active:scale-95 shadow-sm text-xs whitespace-nowrap"
      >
        <Plus size={16} />
        <span>Add Service</span>
      </button>
    </div>
  );

  const bulkActions = (
    <>
      <button
        onClick={openBulkGenerateImages}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-50"
      >
        <Sparkles size={14} />
        <span>Gen Images</span>
      </button>
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
    </>
  );

  const extraFilters = (
    <div className="relative">
      <button
        onClick={() => setIsBranchFilterOpen(!isBranchFilterOpen)}
        className={`h-10 px-4 flex items-center justify-center gap-2 rounded-xl transition-all border text-xs font-bold shrink-0 ${selectedBranch || isBranchFilterOpen ? "bg-brand-primary/5 border-brand-primary/20 text-brand-primary" : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-brand-primary/10"}`}
      >
        <Filter size={14} />
        <span>
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
              className="absolute left-0 mt-3 w-64 bg-white rounded-2xl border border-gray-100 p-4 z-30 flex flex-col gap-3 shadow-xl shadow-blue-900/10"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
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
                      className={`w-full text-left px-3 py-2 rounded-xl transition-all ${selectedBranch === branch._id ? "bg-brand-primary text-white" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                      <p className="text-xs font-bold leading-tight">
                        {branch.name}
                      </p>
                      {branch.address && (
                        <p
                          className={`text-[9px] truncate ${selectedBranch === branch._id ? "text-white/70" : "text-gray-400 font-medium"}`}
                        >
                          {branch.address}
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
  );

  const [search, setSearch] = useState("");
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
    <div className="space-y-6">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      <StatsGrid stats={stats} loading={loading} />
      {loading ? (
        <TableSkeleton rows={8} cols={6} />
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
            extraFilters={extraFilters}
            showSelection={true}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            bulkActions={bulkActions}
            emptyMessage="No services defined yet. Start building your portfolio!"
            mobileMapper={{
              leading: (s) => (
                <div
                  className={`w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 font-bold border border-gray-100 overflow-hidden ${!s.isActive ? "opacity-50" : ""}`}
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
                  className={`font-bold text-gray-900 text-[14px] truncate leading-tight ${!s.isActive ? "opacity-50 line-through" : ""}`}
                >
                  {s.name}
                </h4>
              ),
              subtitle: (s) => (
                <p
                  className={`text-[11px] font-medium text-gray-400 truncate mt-0.5 ${!s.isActive ? "opacity-50" : ""}`}
                >
                  {s.categories?.[0]?.name || "Service Item"}
                </p>
              ),
              trailing: (s) => (
                <div
                  className={`text-right ${!s.isActive ? "opacity-50" : ""}`}
                >
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-0.5">
                    Starting
                  </p>
                  <p className="text-[13px] font-black text-gray-900 notranslate">
                    {currencySymbol}
                    {s.pricing?.[0]?.price || s.price || 0}
                  </p>
                </div>
              ),
              actions: (s) => (
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActive(s);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[11px] font-bold transition-all active:scale-95 border ${s.isActive ? "bg-brand-primary text-white border-brand-primary" : "bg-gray-100 text-gray-500 border-gray-200"}`}
                    >
                      {s.isActive ? "Active" : "Inactive"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(s);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 h-10 bg-brand-primary/10 text-brand-primary rounded-xl text-[11px] font-bold hover:bg-brand-primary hover:text-white transition-all active:scale-95 shadow-sm"
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetServiceForUnsplash(s);
                        setIsUnsplashModalOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 h-10 bg-blue-50 text-brand-primary rounded-xl text-[11px] font-bold hover:bg-brand-primary hover:text-white transition-all active:scale-95 shadow-sm border border-blue-100"
                    >
                      <Sparkles size={14} /> AI Image
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(s);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 h-10 bg-red-50 text-red-600 rounded-xl text-[11px] font-bold hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-sm border border-red-100"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ),
            }}
          />
        </>
      )}

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
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all cursor-pointer"
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
        <form className="space-y-5">
          <CustomTextField
            ref={nameRef}
            label="Service Name"
            icon={Scissors}
            placeholder="e.g. Haircut"
            value={newService.name}
            onChange={(e) =>
              setNewService({ ...newService, name: e.target.value })
            }
            onKeyDown={(e) => {
              const firstDept = departments[0]?._id;
              handleKeyDown(e, firstDept);
            }}
            required
          />
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
                setNewService({ ...newService, branches: e.target.value })
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
                  description: b.address,
                }))}
              isSearchable={true}
              showSelectAll={user?.role !== "staff"}
            />
          )}

          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-widest px-1 mb-2 block">
              Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = newService.categories.includes(cat._id);
                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => toggleCategory(cat._id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSelected ? "bg-brand-primary text-white border-brand-primary" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            {/* Price Field - Always shown for consistency or as base price */}
            {!newService.useVariants && (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-blue-900">
                    Service Price
                  </h4>
                  <p className="text-xs text-blue-600 font-medium">
                    {departments.length > 0
                      ? "Base price (updates all departments)"
                      : "General price for this service"}
                  </p>
                </div>
                <div className="w-32">
                  <CustomTextField
                    type="number"
                    placeholder="0"
                    value={newService.price}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewService((prev) => ({ ...prev, price: val }));
                      if (departments.length > 0) {
                        handleCommonAmountChange(val);
                      }
                    }}
                    className="bg-white"
                  />
                </div>
              </div>
            )}

            {availableVariants.length > 0 && (
              <div className="pt-3 border-t border-blue-100 mt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${newService.useVariants ? "bg-brand-primary border-brand-primary shadow-lg shadow-brand-primary/20 scale-105" : "border-gray-300 group-hover:border-brand-primary/50"}`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={newService.useVariants}
                      onChange={(e) =>
                        setNewService({
                          ...newService,
                          useVariants: e.target.checked,
                        })
                      }
                    />
                    {newService.useVariants && (
                      <Check size={14} className="text-white" strokeWidth={3} />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800">
                      Enable Variants
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      Create variations like Normal, Medium, Premium
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>

          {!newService.useVariants ? (
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500 tracking-widest px-1 mb-2 block">
                Department Pricing
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {departments.map((dept) => (
                  <div
                    key={dept._id}
                    className="bg-gray-50 p-2 rounded-xl flex items-center justify-between border border-transparent focus-within:border-brand-primary/50 focus-within:bg-white transition-all"
                  >
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      {dept.name}
                    </span>
                    <div className="flex items-center">
                      <span className="text-gray-400 text-xs font-bold mr-1">
                        <span className="notranslate">{currencySymbol}</span>
                      </span>
                      <input
                        ref={(el) => (pricingRefs.current[dept._id] = el)}
                        type="number"
                        placeholder="0"
                        value={getPriceForDept(dept._id)}
                        onChange={(e) =>
                          handlePriceChange(dept._id, e.target.value)
                        }
                        className="w-16 text-sm font-bold text-gray-900 bg-transparent outline-none text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {availableVariants.map((v) => {
                const isSelected = newService.variants.some(
                  (sv) => sv.variantId === v._id || sv.variantId?._id === v._id,
                );

                return (
                  <div
                    key={v._id}
                    className={`bg-white border transition-all duration-300 rounded-2xl overflow-hidden ${isSelected ? "border-brand-primary shadow-md" : "border-gray-100 opacity-70"}`}
                  >
                    <div
                      className={`px-4 py-3 border-b flex items-center justify-between cursor-pointer transition-colors ${isSelected ? "bg-brand-primary/5 border-brand-primary/10" : "bg-gray-50 border-gray-100"}`}
                      onClick={() => {
                        if (isSelected) {
                          setNewService((prev) => ({
                            ...prev,
                            variants: prev.variants.filter(
                              (sv) =>
                                sv.variantId !== v._id &&
                                sv.variantId?._id !== v._id,
                            ),
                          }));
                        } else {
                          setNewService((prev) => ({
                            ...prev,
                            variants: [
                              ...prev.variants,
                              {
                                variantId: v._id,
                                price: "",
                                pricing: departments.map((d) => ({
                                  department: d._id,
                                  price: "",
                                })),
                                taxId: "",
                                isTaxInclusive: false,
                              },
                            ],
                          }));
                        }
                      }}
                    >
                      <span
                        className={`text-sm font-bold flex items-center gap-2 ${isSelected ? "text-brand-primary" : "text-gray-500"}`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? "bg-brand-primary border-brand-primary" : "bg-white border-gray-300"}`}
                        >
                          {isSelected && (
                            <Check
                              size={12}
                              className="text-white"
                              strokeWidth={4}
                            />
                          )}
                        </div>
                        {v.name}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest bg-brand-primary/10 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <div className="p-3 bg-gray-50/30 border-t border-gray-100">
                        {/* Per-Variant Quick Amount */}
                        <div className="flex flex-col md:flex-row items-center gap-4 mb-4 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                          <div className="flex-1">
                            <h4 className="text-xs font-bold text-blue-900">
                              Quick Amount (This Variant)
                            </h4>
                            <p className="text-[10px] text-blue-600/80 font-medium">
                              Set same price across all departments
                            </p>
                            <div className="mt-2 w-full md:w-32">
                              <input
                                type="number"
                                placeholder="0"
                                value={
                                  newService.variants.find(
                                    (sv) =>
                                      sv.variantId === v._id ||
                                      sv.variantId?._id === v._id,
                                  )?.price || ""
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewService((prev) => ({
                                    ...prev,
                                    variants: prev.variants.map((sv) =>
                                      sv.variantId === v._id ||
                                      sv.variantId?._id === v._id
                                        ? { ...sv, price: val }
                                        : sv,
                                    ),
                                  }));
                                  if (departments.length > 0) {
                                    handleVariantCommonAmountChange(v._id, val);
                                  }
                                }}
                                className="w-full text-xs font-bold text-gray-900 bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-brand-primary"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row items-center gap-4 border-l border-blue-200/50 pl-4 h-full">
                            <div className="min-w-[150px]">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                                Variant Tax
                              </span>
                              <CustomDropdown
                                variant="compact"
                                value={(() => {
                                  const sv = newService.variants.find(
                                    (sv) =>
                                      sv.variantId === v._id ||
                                      sv.variantId?._id === v._id,
                                  );
                                  return sv?.taxId?._id || sv?.taxId || "";
                                })()}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewService((prev) => ({
                                    ...prev,
                                    variants: prev.variants.map((sv) =>
                                      sv.variantId === v._id ||
                                      sv.variantId?._id === v._id
                                        ? { ...sv, taxId: val }
                                        : sv,
                                    ),
                                  }));
                                }}
                                options={[
                                  { value: "", label: "No Tax" },
                                  ...taxes.map((tax) => ({
                                    value: tax._id,
                                    label: `${tax.name} (${tax.percentage}%)`,
                                  })),
                                ]}
                                placeholder="Select Tax"
                                icon={Percent}
                              />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer group">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                  newService.variants.find(
                                    (sv) =>
                                      sv.variantId === v._id ||
                                      sv.variantId?._id === v._id,
                                  )?.isTaxInclusive
                                    ? "bg-brand-primary border-brand-primary"
                                    : "border-gray-300 bg-white"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    newService.variants.find(
                                      (sv) =>
                                        sv.variantId === v._id ||
                                        sv.variantId?._id === v._id,
                                    )?.isTaxInclusive || false
                                  }
                                  onChange={(e) => {
                                    const val = e.target.checked;
                                    setNewService((prev) => ({
                                      ...prev,
                                      variants: prev.variants.map((sv) =>
                                        sv.variantId === v._id ||
                                        sv.variantId?._id === v._id
                                          ? { ...sv, isTaxInclusive: val }
                                          : sv,
                                      ),
                                    }));
                                  }}
                                  className="hidden"
                                />
                                {newService.variants.find(
                                  (sv) =>
                                    sv.variantId === v._id ||
                                    sv.variantId?._id === v._id,
                                )?.isTaxInclusive && (
                                  <Check
                                    size={10}
                                    className="text-white"
                                    strokeWidth={4}
                                  />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-gray-700 group-hover:text-brand-primary transition-colors">
                                  Tax Inclusive
                                </span>
                              </div>
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {departments.map((dept) => (
                            <div
                              key={dept._id}
                              className="bg-gray-50/50 p-2 rounded-xl flex items-center justify-between border border-transparent focus-within:border-brand-primary/50 focus-within:bg-white transition-all"
                            >
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                {dept.name}
                              </span>
                              <div className="flex items-center">
                                <span className="text-gray-400 text-xs font-bold mr-1">
                                  <span className="notranslate">
                                    {currencySymbol}
                                  </span>
                                </span>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={getVariantPrice(v._id, dept._id)}
                                  onChange={(e) =>
                                    handleVariantPriceChange(
                                      v._id,
                                      dept._id,
                                      e.target.value,
                                    )
                                  }
                                  className="w-16 text-sm font-bold text-gray-900 bg-transparent outline-none text-right"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!newService.useVariants && (
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500 tracking-widest px-1 mb-2 block">
                Tax Settings
              </label>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <CustomDropdown
                    ref={taxRef}
                    value={newService.taxId}
                    onChange={(e) =>
                      setNewService({ ...newService, taxId: e.target.value })
                    }
                    onKeyDown={(e) => handleKeyDown(e, "submit")}
                    options={[
                      { value: "", label: "No Tax Application" },
                      ...taxes.map((tax) => ({
                        value: tax._id,
                        label: `${tax.name} (${tax.percentage}%)`,
                      })),
                    ]}
                    placeholder="Select Tax"
                    icon={Percent}
                    isSearchable
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-100 w-full md:w-auto">
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${newService.isTaxInclusive ? "bg-brand-primary border-brand-primary" : "border-gray-300"}`}
                    >
                      <input
                        type="checkbox"
                        checked={newService.isTaxInclusive}
                        onChange={(e) =>
                          setNewService({
                            ...newService,
                            isTaxInclusive: e.target.checked,
                          })
                        }
                        className="hidden"
                      />
                      {newService.isTaxInclusive && (
                        <Check
                          size={14}
                          className="text-white"
                          strokeWidth={3}
                        />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-700">
                        Tax Inclusive
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        Price includes tax amount
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">
                Service Photo
              </label>
              <button
                type="button"
                disabled={!newService.name}
                onClick={() => setIsUnsplashModalOpen(true)}
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                  newService.name
                    ? "text-brand-primary hover:text-brand-secondary cursor-pointer"
                    : "text-gray-300 cursor-not-allowed"
                }`}
              >
                <Sparkles size={12} />
                Auto Generate
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : isGenerating ? (
                  <Loader2
                    size={24}
                    className="text-brand-primary animate-spin"
                  />
                ) : (
                  <Camera size={24} className="text-gray-300" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                <p className="text-[10px] text-gray-400 ml-1">
                  JPG, PNG or WEBP. Max 2MB.
                </p>
              </div>
            </div>
          </div>
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

      <UnsplashImageModal
        isOpen={isUnsplashModalOpen}
        onClose={() => {
          setIsUnsplashModalOpen(false);
          setTargetServiceForUnsplash(null);
        }}
        onSelect={handleUnsplashSelect}
        searchQuery={
          targetServiceForUnsplash
            ? targetServiceForUnsplash.name
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
        onComplete={fetchData}
        type="service"
      />
    </div>
  );
};

export default ServicesManager;
