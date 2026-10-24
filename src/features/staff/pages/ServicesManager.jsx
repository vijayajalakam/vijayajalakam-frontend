import { useEffect, useState, useRef, useMemo } from "react";
import api from "../../../api/axiosInstance";
import {
  useGetServicesQuery,
  useGetTaxesQuery,
  useGetShopsQuery,
  useGetProductsQuery,
} from "../../../store/api/tenantEndpoints";
import {
  useGetDepartmentsAllQuery,
  useGetServiceCategoriesQuery,
  useGetVariantsListQuery,
  useGetAdminStaffQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useBulkDeleteServicesMutation,
  useCreateServiceCategoryMutation,
  useCreateDepartmentMutation,
  useCreateVariantMutation,
  useCreateTaxMutation,
} from "../../../store/api/tenantCrudEndpoints";
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
  Users,
  UploadCloud,
  Settings2,
  Shuffle,
  Package,
  UserCheck,
  Eye,
  EyeOff,
  DownloadCloud, Layers
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
  const getPriceWithTax = (basePrice, taxSource, service) => {
    const taxObj = taxSource || service;
    const taxPercentage = taxObj?.taxId?.percentage || taxObj?.taxPercent || service?.taxId?.percentage || service?.taxPercent || 0;
    const isInclusive = taxObj?.isTaxInclusive !== undefined ? taxObj?.isTaxInclusive : service?.isTaxInclusive || false;
    return isInclusive ? basePrice : basePrice + (basePrice * (taxPercentage / 100));
  };
  const getTaxInfoString = (taxSource, service) => {
    const taxObj = taxSource || service;
    const taxPercentage = taxObj?.taxId?.percentage || taxObj?.taxPercent || service?.taxId?.percentage || service?.taxPercent || 0;
    const isInclusive = taxObj?.isTaxInclusive !== undefined ? taxObj?.isTaxInclusive : service?.isTaxInclusive || false;
    if (!taxPercentage) return null;
    return isInclusive ? `(Incl. ${taxPercentage}% Tax)` : `(+ ${taxPercentage}% Tax)`;
  };
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
  const { data: departmentsRaw = [], isLoading: loadingDepts } = useGetDepartmentsAllQuery("");
  const { data: categoriesRaw = [], isLoading: loadingCats } = useGetServiceCategoriesQuery("");
  const { data: taxesRaw = [], isLoading: loadingTaxes } = useGetTaxesQuery("active=true");
  const { data: variantsRaw = [], isLoading: loadingVariants } = useGetVariantsListQuery("");
  const { data: branchesRaw = [], isLoading: loadingBranches } = useGetShopsQuery("");
  const { data: staffMembersRaw = [], isLoading: loadingStaff } = useGetAdminStaffQuery("");
  const { data: productsRaw = [], isLoading: loadingProducts } = useGetProductsQuery("");

  const loading = loadingServices || loadingDepts || loadingCats || loadingTaxes || loadingVariants || loadingBranches || loadingStaff || loadingProducts;

  // Memoized Data
  const services = servicesRaw;
  const departments = useMemo(() => {
    const order = { man: 1, woman: 2, kid: 3 };
    return [...departmentsRaw].sort((a, b) => {
      const nameA = a.name?.toLowerCase() || "";
      const nameB = b.name?.toLowerCase() || "";
      if (order[nameA] && order[nameB]) return order[nameA] - order[nameB];
      if (order[nameA]) return -1;
      if (order[nameB]) return 1;
      return nameA.localeCompare(nameB);
    });
  }, [departmentsRaw]);

  const categories = useMemo(() => categoriesRaw.filter((c) => c.isActive), [categoriesRaw]);
  const taxes = taxesRaw;
  const availableVariants = useMemo(() => variantsRaw.filter((v) => v.isActive && v.type === "service"), [variantsRaw]);
  const branches = branchesRaw;
  const staffMembers = staffMembersRaw;
  const products = productsRaw;

  // Mutations
  const [createService] = useCreateServiceMutation();
  const [updateServiceMut] = useUpdateServiceMutation();
  const [deleteServiceMut] = useDeleteServiceMutation();
  const [bulkDeleteServicesMut] = useBulkDeleteServicesMutation();
  const [createCategoryMut] = useCreateServiceCategoryMutation();
  const [createDepartmentMut] = useCreateDepartmentMutation();
  const [createVariantMut] = useCreateVariantMutation();
  const [createTaxMut] = useCreateTaxMutation();

  const [isBranchFilterOpen, setIsBranchFilterOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  const [isImageGenerationModalOpen, setIsImageGenerationModalOpen] =
    useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetServiceForImageGeneration, setTargetServiceForImageGeneration] =
    useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkImageModal, setShowBulkImageModal] = useState(false);
  const [itemsToGenerate, setItemsToGenerate] = useState([]);

  // Independent Modals States
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  const [isAddDepartmentOpen, setIsAddDepartmentOpen] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [isSubmittingDepartment, setIsSubmittingDepartment] = useState(false);

  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
  const [newVariantName, setNewVariantName] = useState("");
  const [isSubmittingVariant, setIsSubmittingVariant] = useState(false);

  const [isAddTaxOpen, setIsAddTaxOpen] = useState(false);
  const [newTaxName, setNewTaxName] = useState("GST");
  const [newTaxPercentage, setNewTaxPercentage] = useState("");
  const [isSubmittingTax, setIsSubmittingTax] = useState(false);
  const [taxTargetVariantId, setTaxTargetVariantId] = useState(null);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const [newService, setNewService] = useState({
    name: "",
    hsnCode: "",
    description: "",
    price: "",
    categories: [],
    pricing: [],
    taxId: "",
    isTaxInclusive: false,
    useVariants: false,
    variants: [],
    branches: [],
    staffCommissions: [],
    requiredItems: [],
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExportServices = () => {
    const dataToExport = [];

    services.forEach(service => {
      const serviceName = service.name || "";
      const category = (service.categories || []).map(c => typeof c === 'object' ? c.name : c).join(", ") || "";
      const hasVariants = service.useVariants ? "Yes" : "No";
      
      const taxIdStr = typeof service.taxId === 'object' && service.taxId !== null ? service.taxId._id : service.taxId;
      const foundTax = taxes.find(t => t._id === taxIdStr);
      const baseTaxPercent = foundTax?.percentage || service.taxPercent || 0;

      if (service.useVariants && service.variants && service.variants.length > 0) {
        service.variants.forEach(variant => {
          const variantName = variant.name || variant.variantId?.name || "";
          
          const vTaxIdStr = typeof variant.taxId === 'object' && variant.taxId !== null ? variant.taxId._id : variant.taxId;
          const foundVTax = taxes.find(t => t._id === vTaxIdStr);
          const taxPercent = foundVTax?.percentage || variant.taxPercent || baseTaxPercent;
          
          const taxEnabled = taxPercent > 0 ? "Yes" : "No";
          const isInclusive = variant.isTaxInclusive !== undefined ? variant.isTaxInclusive : (service.isTaxInclusive || false);
          
          if (variant.pricing && variant.pricing.length > 0) {
            variant.pricing.forEach(pricingItem => {
              const department = pricingItem.department?.name || (typeof pricingItem.department === 'string' ? pricingItem.department : "");
              const price = pricingItem.price !== undefined ? pricingItem.price : (variant.price || 0);
              
              const finalPrice = getPriceWithTax(price, variant, service);
              let taxAmount = 0;
              if (taxPercent > 0) {
                if (isInclusive) {
                  taxAmount = price - (price / (1 + taxPercent / 100));
                } else {
                  taxAmount = price * (taxPercent / 100);
                }
              }

              dataToExport.push({
                "Service Name": serviceName,
                "Category": category,
                "Has Variants": hasVariants,
                "Variant Name": variantName,
                "Department": department,
                "Price": price.toFixed(2),
                "Tax Enabled": taxEnabled,
                "Tax %": taxPercent,
                "Tax Amount": taxAmount.toFixed(2),
                "Final Price": finalPrice.toFixed(2)
              });
            });
          } else {
            const department = "";
            const price = variant.price || 0;
            
            const finalPrice = getPriceWithTax(price, variant, service);
            let taxAmount = 0;
            if (taxPercent > 0) {
              if (isInclusive) {
                taxAmount = price - (price / (1 + taxPercent / 100));
              } else {
                taxAmount = price * (taxPercent / 100);
              }
            }

            dataToExport.push({
              "Service Name": serviceName,
              "Category": category,
              "Has Variants": hasVariants,
              "Variant Name": variantName,
              "Department": department,
              "Price": price.toFixed(2),
              "Tax Enabled": taxEnabled,
              "Tax %": taxPercent,
              "Tax Amount": taxAmount.toFixed(2),
              "Final Price": finalPrice.toFixed(2)
            });
          }
        });
      } else {
        const taxPercent = baseTaxPercent;
        const taxEnabled = taxPercent > 0 ? "Yes" : "No";
        const isInclusive = service.isTaxInclusive || false;

        if (service.pricing && service.pricing.length > 0) {
          service.pricing.forEach(pricingItem => {
            const department = pricingItem.department?.name || (typeof pricingItem.department === 'string' ? pricingItem.department : "");
            const price = pricingItem.price !== undefined ? pricingItem.price : (service.price || 0);
            
            const finalPrice = getPriceWithTax(price, null, service);
            let taxAmount = 0;
            if (taxPercent > 0) {
              if (isInclusive) {
                taxAmount = price - (price / (1 + taxPercent / 100));
              } else {
                taxAmount = price * (taxPercent / 100);
              }
            }

            dataToExport.push({
              "Service Name": serviceName,
              "Category": category,
              "Has Variants": hasVariants,
              "Variant Name": "",
              "Department": department,
              "Price": price.toFixed(2),
              "Tax Enabled": taxEnabled,
              "Tax %": taxPercent,
              "Tax Amount": taxAmount.toFixed(2),
              "Final Price": finalPrice.toFixed(2)
            });
          });
        } else {
          const department = "";
          const price = service.price || 0;
          
          const finalPrice = getPriceWithTax(price, null, service);
          let taxAmount = 0;
          if (taxPercent > 0) {
            if (isInclusive) {
              taxAmount = price - (price / (1 + taxPercent / 100));
            } else {
              taxAmount = price * (taxPercent / 100);
            }
          }

          dataToExport.push({
            "Service Name": serviceName,
            "Category": category,
            "Has Variants": hasVariants,
            "Variant Name": "",
            "Department": department,
            "Price": price.toFixed(2),
            "Tax Enabled": taxEnabled,
            "Tax %": taxPercent,
            "Tax Amount": taxAmount.toFixed(2),
            "Final Price": finalPrice.toFixed(2)
          });
        }
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport.length > 0 ? dataToExport : [{
      "Service Name": "",
      "Category": "",
      "Has Variants": "",
      "Variant Name": "",
      "Department": "",
      "Price": "",
      "Tax Enabled": "",
      "Tax %": "",
      "Tax Amount": "",
      "Final Price": ""
    }]);
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Services");
    XLSX.writeFile(workbook, "Services_Export.xlsx");
  };

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
        // Direct save to backend
        const formData = new FormData();
        formData.append("image", file);
        const config = { headers: { "Content-Type": "multipart/form-data" } };
        await updateServiceMut({
          id: targetServiceForImageGeneration._id,
          body: formData,
        }).unwrap();
        setTargetServiceForImageGeneration(null);
      } else {
        // Modal mode — just set the image locally
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

  const handleAddNewCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      setIsSubmittingCategory(true);
      const res = await createCategoryMut({ name: newCategoryName }).unwrap();
      setIsAddCategoryOpen(false);
      setNewCategoryName("");
      if (res && res._id) {
        setNewService((prev) => ({
          ...prev,
          categories: [...prev.categories, res._id],
        }));
      }
      showSnack("Category added successfully!", "success");
    } catch (err) {
      showSnack(
        err?.data?.message || err?.message || "Failed to add category",
        "error",
      );
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleAddNewDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) return;
    try {
      setIsSubmittingDepartment(true);
      const res = await createDepartmentMut({ name: newDepartmentName }).unwrap();
      setIsAddDepartmentOpen(false);
      setNewDepartmentName("");
      if (res && res._id) {
        const newDept = res;
        setNewService((prev) => {
          const newPricing = [
            ...prev.pricing,
            { department: newDept._id, price: "" },
          ];
          return { ...prev, pricing: newPricing };
        });
      }
      showSnack("Department added successfully!", "success");
    } catch (err) {
      showSnack(
        err?.data?.message || err?.message || "Failed to add department",
        "error",
      );
    } finally {
      setIsSubmittingDepartment(false);
    }
  };

  const handleAddNewVariant = async (e) => {
    e.preventDefault();
    if (!newVariantName.trim()) return;
    try {
      setIsSubmittingVariant(true);
      const res = await createVariantMut({
        name: newVariantName,
        type: "service",
      }).unwrap();
      setIsAddVariantOpen(false);
      setNewVariantName("");
      if (res && res._id) {
        const newVar = res;
        setNewService((prev) => ({
          ...prev,
          variants: [
            ...prev.variants,
            {
              variantId: newVar._id,
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
      showSnack("Variant added successfully!", "success");
    } catch (err) {
      showSnack(err?.data?.message || err?.message || "Failed to add variant", "error");
    } finally {
      setIsSubmittingVariant(false);
    }
  };

  const handleAddNewTax = async (e) => {
    e.preventDefault();
    if (!newTaxName.trim() || newTaxPercentage === "") return;
    try {
      setIsSubmittingTax(true);
      const res = await createTaxMut({
        name: newTaxName,
        percentage: newTaxPercentage,
      }).unwrap();
      setIsAddTaxOpen(false);
      setNewTaxName("GST");
      setNewTaxPercentage("");

      if (res && res._id) {
        const newTaxId = res._id;
        if (taxTargetVariantId) {
          setNewService((prev) => ({
            ...prev,
            variants: prev.variants.map((sv) =>
              sv.variantId === taxTargetVariantId ||
                sv.variantId?._id === taxTargetVariantId
                ? { ...sv, taxId: newTaxId }
                : sv,
            ),
          }));
        } else {
          setNewService((prev) => ({ ...prev, taxId: newTaxId }));
        }
      }
      showSnack("Tax added successfully!", "success");
    } catch (err) {
      showSnack(err?.data?.message || err?.message || "Failed to add tax", "error");
    } finally {
      setIsSubmittingTax(false);
      setTaxTargetVariantId(null);
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
        name: service.name,
        hsnCode: service.hsnCode || "",
        description: service.description || "",
        price: service.price || "",
        categories: service.categories?.map((c) => c._id) || [],
        pricing: service.pricing || [],
        taxId: service.taxId?._id || service.taxId || "",
        isTaxInclusive: service.isTaxInclusive || false,
        useVariants: service.variants && service.variants.length > 0,
        variants: service.variants || [],
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
          : branches.map((b) => b._id); // Select all branches by default

      setNewService((prev) => ({
        ...prev,
        pricing: initialPricing,
        branches: defaultBranchIds,
      }));
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

    if (!newService.categories || newService.categories.length === 0) {
      showSnack("At least one category is required", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("name", newService.name);
      formData.append("hsnCode", newService.hsnCode || "");
      formData.append("description", newService.description || "");
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
      formData.append(
        "staffCommissions",
        JSON.stringify(newService.staffCommissions),
      );
      formData.append(
        "requiredItems",
        JSON.stringify(newService.requiredItems),
      );
      if (selectedImage) formData.append("image", selectedImage);

      const config = { headers: { "Content-Type": "multipart/form-data" } };

      if (currentService) {
        await updateServiceMut({ id: currentService._id, body: formData }).unwrap();
      } else {
        await createService(formData).unwrap();
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
                  <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-widest">Service Overview</span>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">Pricing, required inventory and staff commissions</span>
               </div>
            </div>
            <div className="flex items-center gap-3">
                {s.hsnCode && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-dark-card rounded-lg border border-gray-100 dark:border-dark-border/80 shrink-0 self-start">
                        <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">HSN Code</span>
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{s.hsnCode}</span>
                    </div>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-dark-card rounded-lg border border-gray-100 dark:border-dark-border/80 shrink-0 self-start">
                   <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Show To User</span>
                   <button onClick={(e) => { e.stopPropagation(); if (canChangeStatus) toggleShowToUser(s); }} disabled={!canChangeStatus} className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${s.showToUser !== false ? "bg-emerald-500" : "bg-gray-300"} ${!canChangeStatus ? "opacity-50 cursor-not-allowed" : ""}`}>
                       <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white dark:bg-dark-surface transition-transform ${s.showToUser !== false ? "translate-x-4" : "translate-x-0.5"}`} />
                   </button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 1. Pricing Rules Panel */}
            <div className="col-span-1 lg:col-span-1 flex flex-col bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-card/50">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-0.5 block">Pricing Rules</span>
                    <h4 className="text-[13px] font-black text-gray-900 dark:text-white leading-none">Departments & Variants</h4>
                </div>
                <div className="p-5 overflow-y-auto max-h-[320px] custom-scrollbar bg-white dark:bg-dark-surface">
                    {s.useVariants && s.variants && s.variants.length > 0 ? (
                        <div className="flex flex-col gap-4">
                            {s.variants.map((v, vIdx) => (
                                <div key={vIdx} className="flex flex-col">
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><ListTree size={12} /> {v.variantName || v.variantId?.name || "Variant"}</span>
                                    <div className="flex flex-col gap-2 pl-3 border-l-2 border-indigo-100">
                                        {v.pricing?.map((p, pIdx) => (
                                            <div key={pIdx} className="flex justify-between items-center bg-gray-50 dark:bg-dark-card px-3 py-2 rounded-xl border border-gray-100 dark:border-dark-border/60">
                                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 truncate">{p.department?.name || departments.find(d => d._id === (p.department?._id || p.department))?.name}</span>
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="text-[12px] font-black text-gray-900 dark:text-white notranslate leading-none">{currencySymbol}{formatDisplayNumber(getPriceWithTax(p.price || 0, v, s))}</span>
                                                    {getTaxInfoString(v, s) && <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{getTaxInfoString(v, s)}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {s.pricing && s.pricing.length > 0 ? (
                                s.pricing.map((p, pIdx) => (
                                    <div key={pIdx} className="flex justify-between items-center bg-gray-50 dark:bg-dark-card px-3 py-2 rounded-xl border border-gray-100 dark:border-dark-border/60">
                                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 truncate">{p.department?.name || departments.find(d => d._id === (p.department?._id || p.department))?.name}</span>
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className="text-[12px] font-black text-gray-900 dark:text-white notranslate leading-none">{currencySymbol}{formatDisplayNumber(getPriceWithTax(p.price || 0, s, s))}</span>
                                            {getTaxInfoString(s, s) && <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{getTaxInfoString(s, s)}</span>}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex justify-between items-center bg-gray-50 dark:bg-dark-card px-3 py-2 rounded-xl border border-gray-100 dark:border-dark-border/60">
                                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">Base Service</span>
                                    <div className="flex flex-col items-end gap-0.5">
                                        <span className="text-[12px] font-black text-gray-900 dark:text-white notranslate leading-none">{currencySymbol}{formatDisplayNumber(getPriceWithTax(s.price || 0, s, s))}</span>
                                        {getTaxInfoString(s, s) && <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{getTaxInfoString(s, s)}</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Required Inventory Panel */}
            <div className="col-span-1 lg:col-span-1 flex flex-col bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border bg-amber-50/30">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-0.5 block">Inventory Setup</span>
                    <h4 className="text-[13px] font-black text-amber-900 leading-none">Required Materials</h4>
                </div>
                <div className="p-5 overflow-y-auto max-h-[320px] custom-scrollbar bg-white dark:bg-dark-surface">
                    {s.requiredItems && s.requiredItems.length > 0 ? (
                       <div className="flex flex-col gap-2">
                           {s.requiredItems.map((item, iIdx) => {
                               const product = products.find(p => String(p._id) === String(item.product?._id || item.product || item.productId?._id || item.productId));
                               let vName = "";
                               if (item.variantId && product?.useVariants) {
                                   const vp = product.variants?.find(v => String(v.variantId?._id || v.variantId || v._id) === String(item.variantId?._id || item.variantId));
                                   vName = vp?.variantId?.name || vp?.variantName || vp?.name || item.variantId?.name || "";
                               } else if (item.variantId?.name) {
                                   vName = item.variantId.name;
                               }
                               return (
                               <div key={iIdx} className="flex justify-between items-center bg-gray-50 dark:bg-dark-card px-3 py-2 rounded-xl border border-gray-100 dark:border-dark-border/60">
                               <div className="flex flex-col gap-0.5 min-w-0">
                                  <span className="text-[10px] font-bold text-gray-900 dark:text-white truncate">
                                     {item.productName || product?.name || item.productId?.name || item.product?.name || "Product"}
                                     {vName && <span className="text-brand-primary dark:text-blue-400 ml-1">({vName})</span>}
                                  </span>
                                  <span className="text-[8px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">Inventory Linked</span>
                               </div>
                                   <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-dark-surface shadow-sm border border-gray-100 dark:border-dark-border px-2 py-1 rounded-lg">
                                      <span className="text-[11px] font-black text-gray-900 dark:text-white">{item.quantity}</span>
                                      <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase">{product?.unit || item.unit || "QTY"}</span>
                                   </div>
                               </div>
                               );
                           })}
                       </div>
                    ) : (
                       <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-gray-100 dark:border-dark-border rounded-xl h-full">
                          <Package size={24} className="text-gray-200 mb-2" />
                          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">No inventory constraints attached</span>
                       </div>
                    )}
                </div>
            </div>

            {/* 3. Commission Rules Panel */}
            <div className="col-span-1 lg:col-span-1 flex flex-col bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border bg-emerald-50 dark:bg-emerald-900/20/30">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-0.5 block">Commission Engine</span>
                    <h4 className="text-[13px] font-black text-emerald-900 leading-none">Staff Earnings</h4>
                </div>
                <div className="p-5 overflow-y-auto max-h-[320px] custom-scrollbar bg-white dark:bg-dark-surface">
                    {staffMembers && staffMembers.length > 0 ? (
                       <div className="flex flex-col gap-2">
                           {staffMembers.map((staff) => {
                               const comm = s.staffCommissions?.find(sc => String(sc.staff?._id || sc.staffId?._id || sc.staff || sc.staffId) === String(staff._id));
                               const hasOverride = !!comm;
                               const displayAmount = hasOverride ? (comm.commissionPercentage || comm.commissionAmount || 0) : (staff.commissionPercentage || 0);
                               const isPercentage = hasOverride ? (comm.commissionType !== "fixed") : true;

                               return (
                               <div key={staff._id} className="flex justify-between items-center bg-gray-50 dark:bg-dark-card px-3 py-2 rounded-xl border border-gray-100 dark:border-dark-border/60">
                                   <div className="flex flex-col gap-0.5 min-w-0">
                                      <span className="text-[10px] font-bold text-gray-800 dark:text-gray-100 truncate">{staff.name || "Staff Member"}</span>
                                      {hasOverride ? (
                                         <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Overrides Rule</span>
                                      ) : (
                                         <span className="text-[8px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">HRM Default</span>
                                      )}
                                   </div>
                                   <div className={`flex items-center gap-1.5 shrink-0 bg-white dark:bg-dark-surface shadow-sm border px-2 py-1 rounded-lg ${hasOverride ? "border-emerald-200 text-emerald-900" : "border-gray-100 dark:border-dark-border text-gray-900 dark:text-white"}`}>
                                      {!isPercentage && <span className="text-[11px] font-black notranslate">{currencySymbol}</span>}
                                      <span className="text-[11px] font-black">{displayAmount}</span>
                                      {isPercentage && <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase">%</span>}
                                   </div>
                               </div>
                               );
                           })}
                       </div>
                    ) : (
                       <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-gray-100 dark:border-dark-border rounded-xl h-full">
                          <UserCheck size={24} className="text-gray-200 mb-2" />
                          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">No staff members found</span>
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
              <img src={s.image.url || s.image} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <Scissors size={20} className="text-gray-300" />
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className={`text-[13px] font-black text-gray-900 dark:text-white ${!s.isActive ? "line-through" : ""}`}>{s.name || "Unnamed Service"}</div>
            <div className="flex flex-wrap gap-1 mt-0.5">
            {s.categories && s.categories.length > 0 ? (
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{s.categories.map(c => c.name).join(", ")}</span>
            ) : (
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">Uncategorized</span>
            )}
            </div>
            {s.useVariants && (
                <div className="mt-1">
                    <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-500 border border-indigo-100/50">
                        {s.variants?.length || 0} Variants
                    </span>
                </div>
            )}
          </div>
        </div>
      )
    },
    {
      header: "Coverage",
      render: (s) => (
         <div className={`flex flex-col ${!s.isActive ? "opacity-50" : ""}`}>
             {s.branches && s.branches.length > 0 ? (
                 <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{s.branches.length > 1 ? `${s.branches.length} Branches` : s.branches[0].name}</span>
             ) : (
                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg self-start">All Branches</span>
             )}
         </div>
      )
    },
    {
      header: "Base Cost",
      render: (s) => {
         const basePrice = s.price || 0;
         return (
            <div className={`flex flex-col justify-center ${!s.isActive ? "opacity-50" : ""}`}>
                {s.useVariants ? (
                   <span className="text-xs font-black text-indigo-600 notranslate bg-indigo-50 px-2 py-1 rounded-lg self-start">Variable Pricing</span>
                ) : (
                   <div className="flex flex-col gap-0.5">
                       <span className="text-xs font-black text-gray-700 dark:text-gray-300 notranslate">{currencySymbol}{formatDisplayNumber(getPriceWithTax(basePrice, s, s))}</span>
                       {getTaxInfoString(s, s) && <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{getTaxInfoString(s, s)}</span>}
                   </div>
                )}
            </div>
         );
      }
    },
    {
      header: "Status", align: "center",
      render: (s) => (
          <div className="flex flex-col items-center gap-1">
             <button disabled={!canChangeStatus} onClick={(e) => { e.stopPropagation(); if (canChangeStatus) toggleActive(s); }} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${s.isActive ? "bg-emerald-500 shadow-sm shadow-emerald-500/20" : "bg-gray-200 dark:bg-gray-600"} ${!canChangeStatus ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-dark-surface transition-transform ${s.isActive ? "translate-x-4" : "translate-x-1"}`} />
             </button>
             <span className="text-[8px] font-black tracking-widest uppercase text-gray-400 dark:text-gray-500">{s.isActive ? 'Active' : 'Hidden'}</span>
          </div>
      )
    },
    ...(canEdit || canDelete ? [{
      header: "Actions", align: "right",
      render: (s) => (
        <div className="flex items-center gap-1.5 justify-end">
          <button onClick={(e) => { e.stopPropagation(); toggleFavourite(s); }} className={`p-2 rounded-lg transition-colors ${s.isFavourite ? "bg-red-50 text-red-500" : "text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card hover:text-red-400"}`} title={s.isFavourite ? "Remove from favourites" : "Add to favourites"}>
            <Heart size={16} fill={s.isFavourite ? "currentColor" : "none"} />
          </button>
          <div className="w-px h-5 bg-gray-100 dark:bg-dark-card mx-1" />
          {canGenerateImage && (
            <button onClick={(e) => { e.stopPropagation(); setTargetServiceForImageGeneration(s); setIsImageGenerationModalOpen(true); }} className="p-2 text-gray-400 hover:text-brand-primary dark:text-blue-400 hover:bg-blue-50 rounded-lg transition-all active:scale-95 flex items-center justify-center bg-gray-50 dark:bg-dark-card" title="Auto Generate Image">
              <Sparkles size={14} />
            </button>
          )}
          {canEdit && (
            <button onClick={(e) => { e.stopPropagation(); handleEdit(s); }} className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-95 bg-gray-50 dark:bg-dark-card" title="Edit Service">
              <Edit3 size={14} />
            </button>
          )}
          {canDelete && (
            <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(s); }} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-95 bg-gray-50 dark:bg-dark-card" title="Delete Service">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )
    }] : [])
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
                        className={`w-full text-left px-3 py-2 rounded-xl transition-all ${selectedBranch === branch._id ? "bg-brand-primary text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card"}`}
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
    <div className="space-y-3 md:space-y-6">
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
                  {s.categories?.[0]?.name || "Service Item"}
                </p>
              ),
              trailing: (s) => (
                <div
                  className={`text-right ${!s.isActive ? "opacity-50" : ""}`}
                >
                  <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">
                    Starting
                  </p>
                  <p className="text-[13px] font-black text-gray-900 dark:text-white notranslate">
                    {currencySymbol}
                    {s.pricing?.[0]?.price || s.price || 0}
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
        <form className="space-y-5">
          {/* Tab Bar */}
          <div className="flex gap-1 border-b border-gray-200 dark:border-dark-border -mt-1 mb-2">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === "general" ? "text-brand-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
            >
              <Settings2 size={15} />
              <span>General</span>
              {activeTab === "general" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-t" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("commission")}
              className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === "commission" ? "text-brand-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
            >
              <Percent size={15} />
              <span>Commission</span>
              {newService.staffCommissions.length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === "commission" ? "bg-brand-primary/10 text-brand-primary dark:text-blue-400" : "bg-gray-100 dark:bg-dark-card text-gray-500"}`}>
                  {newService.staffCommissions.length}
                </span>
              )}
              {activeTab === "commission" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-t" />}
            </button>
            {availableVariants.length > 0 && newService.useVariants && (
              <button
                type="button"
                onClick={() => setActiveTab("variants")}
                className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === "variants" ? "text-brand-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
              >
                <Shuffle size={15} />
                <span>Variants</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === "variants" ? "bg-brand-primary/10 text-brand-primary dark:text-blue-400" : "bg-gray-100 dark:bg-dark-card text-gray-500"}`}>
                  {newService.variants.length}
                </span>
                {activeTab === "variants" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-t" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("inventory")}
              className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === "inventory" ? "text-brand-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
            >
              <LayoutList size={15} />
              <span>Inventory</span>
              {newService.requiredItems.length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === "inventory" ? "bg-brand-primary/10 text-brand-primary dark:text-blue-400" : "bg-gray-100 dark:bg-dark-card text-gray-500"}`}>
                  {newService.requiredItems.length}
                </span>
              )}
              {activeTab === "inventory" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-t" />}
            </button>
          </div>

          {/* ── GENERAL TAB ── */}
          {activeTab === "general" && (<div className="space-y-5">
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
                        <Loader2 size={24} className="text-brand-primary dark:text-blue-400 animate-spin" />
                      ) : imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={24} className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-1.5 text-center w-full overflow-hidden">
                      <input type="file" accept="image/*" onChange={handleImageChange} className="w-full max-w-[160px] text-[10px] text-gray-500 dark:text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 dark:bg-blue-900/20 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                      <p className="text-[9px] text-brand-primary dark:text-blue-400 font-bold uppercase tracking-widest">{getFileSizeHint()}</p>
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
                  </div>
                  <div className="flex-[1]">
                    <CustomTextField
                      label="HSN Code"
                      icon={List}
                      placeholder="e.g. 9997"
                      value={newService.hsnCode}
                      onChange={(e) =>
                        setNewService({ ...newService, hsnCode: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-widest pl-1 block">Description</label>
                  <textarea
                    placeholder="e.g. A classic haircut with a wash and blowdry..."
                    value={newService.description}
                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                    className="w-full h-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all placeholder:text-gray-400 disabled:opacity-50 min-h-[80px] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Branches & Categories */}
            <div className="flex flex-col md:flex-row gap-5">
              <div className="flex-1 min-w-0">
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
                        description: b.mapAddress || b.address,
                      }))}
                    isSearchable={true}
                    showSelectAll={user?.role !== "staff"}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <CustomMultiSelect
                  label={<span className="inline-flex items-center gap-1.5"><span>Categories</span><button type="button" onClick={() => setIsAddCategoryOpen(true)} className="flex items-center justify-center w-5 h-5 rounded-md bg-brand-primary/10 text-brand-primary dark:text-blue-400 hover:bg-brand-primary hover:text-white transition-all shadow-sm" title="Add New Category"><Plus size={12} strokeWidth={3} /></button></span>}
                  icon={Layers}
                  value={newService.categories}
                  onChange={(e) => setNewService({ ...newService, categories: e.target.value })}
                  options={categories.map((c) => ({ value: c._id, label: c.name }))}
                  placeholder="Select Categories"
                  isSearchable
                />
              </div>
            </div>

          <div className="flex flex-col gap-4 bg-blue-50 dark:bg-blue-900/20/50 p-4 rounded-2xl border border-blue-100">
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
                    className="bg-white dark:bg-dark-surface"
                  />
                </div>
              </div>
            )}

            {availableVariants.length > 0 && (
              <div className="pt-3 border-t border-blue-100 mt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${newService.useVariants ? "bg-brand-primary border-brand-primary shadow-lg shadow-brand-primary/20 scale-105" : "border-gray-300 dark:border-dark-border group-hover:border-brand-primary/50"}`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={newService.useVariants}
                      onChange={(e) => {
                          const en = e.target.checked;
                          setNewService({ ...newService, useVariants: en });
                          if (en) setActiveTab("variants");
                        }}
                    />
                    {newService.useVariants && (
                      <Check size={14} className="text-white" strokeWidth={3} />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                      Enable Variants
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                      Create variations like Normal, Medium, Premium
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>

          {!newService.useVariants && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-widest block">
                  Department Pricing
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddDepartmentOpen(true)}
                  className="flex items-center justify-center w-5 h-5 rounded-md bg-brand-primary/10 text-brand-primary dark:text-blue-400 hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                  title="Add New Department"
                >
                  <Plus size={12} strokeWidth={3} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {departments.map((dept) => (
                  <div
                    key={dept._id}
                    className="bg-gray-50 p-2 rounded-xl flex items-center justify-between border border-transparent focus-within:border-brand-primary/50 focus-within:bg-white dark:bg-dark-surface transition-all"
                  >
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {dept.name}
                    </span>
                    <div className="flex items-center">
                      <span className="text-gray-400 dark:text-gray-500 text-xs font-bold mr-1">
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
                        className="w-16 text-sm font-bold text-gray-900 dark:text-white bg-transparent outline-none text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {newService.useVariants && (
            <div className="flex items-center justify-between bg-brand-primary/5 px-4 py-3 rounded-2xl border border-brand-primary/20">
              <div>
                <p className="text-sm font-bold text-brand-primary dark:text-blue-400">Variants Enabled</p>
                <p className="text-[11px] text-brand-primary dark:text-blue-400/70 font-medium mt-0.5">Configure pricing per variant in the Variants tab</p>
              </div>
              <button type="button" onClick={() => setActiveTab("variants")} className="flex items-center gap-1.5 text-[11px] font-bold text-brand-primary dark:text-blue-400 bg-brand-primary/10 px-3 py-1.5 rounded-lg hover:bg-brand-primary hover:text-white transition-all">
                <Shuffle size={12} />Manage →
              </button>
            </div>
          )}

          {!newService.useVariants && (
            <div>
              <div className="flex items-center gap-2 px-1 mb-2">
                <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-widest block">
                  Tax Settings
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setTaxTargetVariantId(null);
                    setIsAddTaxOpen(true);
                  }}
                  className="flex items-center justify-center w-5 h-5 rounded-md bg-brand-primary/10 text-brand-primary dark:text-blue-400 hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                  title="Add New Tax"
                >
                  <Plus size={12} strokeWidth={3} />
                </button>
              </div>
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
                        label: tax.name.includes(String(tax.percentage)) ? tax.name : `${tax.name} (${tax.percentage}%)`,
                      })),
                    ]}
                    placeholder="Select Tax"
                    icon={Percent}
                    isSearchable
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card cursor-pointer transition-colors border border-transparent hover:border-gray-100 dark:border-dark-border w-full md:w-auto">
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${newService.isTaxInclusive ? "bg-brand-primary border-brand-primary" : "border-gray-300 dark:border-dark-border"}`}
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
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Tax Inclusive
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                        Price includes tax amount
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          </div>)}

          {/* ── INVENTORY TAB ── */}
          {activeTab === "inventory" && (
            <div className="space-y-6">
              <div className="bg-brand-primary/5 p-4 rounded-2xl border border-brand-primary/10">
                <h4 className="text-sm font-bold text-brand-primary dark:text-blue-400 mb-1">Service Inventory Requirements</h4>
                <p className="text-[11px] text-brand-primary dark:text-blue-400/70 font-medium">Link products that are consumed when this service is performed. Stock will be deducted automatically upon sale.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <CustomDropdown
                      label="Select Product to Add"
                      icon={Plus}
                      placeholder="Search products..."
                      options={(() => {
                        const options = [];
                        products.forEach(p => {
                          const isVariantLinked = (pid, vid) => 
                            newService.requiredItems.some(ri => {
                              const riPid = String(ri.product?._id || ri.product);
                              const riVid = ri.variantId ? String(ri.variantId?._id || ri.variantId) : null;
                              return riPid === String(pid) && (!vid || riVid === String(vid));
                            });

                          if (p.useVariants && p.variants && p.variants.length > 0) {
                            p.variants.forEach(v => {
                              const vId = v.variantId?._id || v.variantId || v._id;
                                if (!isVariantLinked(p._id, vId)) {
                                  const vName = v.variantId?.name || v.variantName || v.name || 'Unknown Variant';
                                  options.push({
                                    value: `${p._id}:${vId}`,
                                    label: `${p.name} - ${vName}`,
                                    description: `Current Stock: ${v.currentStock || 0} ${p.unit || 'units'} (Opening: ${v.openingStock || 0})`
                                  });
                                }
                            });
                          } else {
                            if (!isVariantLinked(p._id, null)) {
                              options.push({
                                value: p._id,
                                label: p.name,
                                description: `Current Stock: ${p.currentStock} ${p.unit || 'units'}`
                              });
                            }
                          }
                        });
                        return options;
                      })()}
                      onChange={(e) => {
                        const val = typeof e === 'object' && e !== null && 'target' in e ? e.target.value : e;
                        if (!val) return;
                        let product, variantId, variant;
                        
                        if (typeof val === 'string' && val.includes(':')) {
                          const [pid, vid] = val.split(':');
                          product = products.find(p => String(p._id) === String(pid));
                          variantId = vid;
                          variant = product?.variants?.find(v => {
                            const vId = String(v.variantId?._id || v.variantId || v._id);
                            return vId === String(vid);
                          });
                        } else {
                          product = products.find(p => String(p._id) === String(val));
                        }

                          if (product) {
                            const vName = variant ? (variant.variantId?.name || variant.variantName || variant.name) : '';
                            setNewService(prev => ({
                              ...prev,
                              requiredItems: [
                                ...prev.requiredItems,
                                {
                                  product: product._id,
                                  productName: vName ? `${product.name} (${vName})` : product.name,
                                  variantId: variantId || null,
                                  useVariant: !!variantId,
                                  quantity: 1,
                                  unit: product.unit || 'unit'
                                }
                              ]
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
                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500">No inventory items linked yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {newService.requiredItems.map((item, idx) => {
                        const product = products.find(p => String(p._id) === String(item.product?._id || item.product));
                        return (
                          <div key={idx} className="bg-white dark:bg-dark-surface p-3 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-dark-card flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold border border-gray-100 dark:border-dark-border flex-shrink-0">
                              {product?.image?.url ? (
                                <img src={product.image.url} alt="" className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                <LayoutList size={18} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {(() => {
                                  let vName = item.variantId?.name || "";
                                  if (item.variantId && product?.useVariants) {
                                    const vp = product.variants?.find(v => String(v.variantId?._id || v.variantId || v._id) === String(item.variantId?._id || item.variantId));
                                    if (vp) vName = vp?.variantId?.name || vp?.variantName || vp?.name || vName;
                                  }
                                  if (product?.name) {
                                      return item.variantId ? `${product.name} (${vName || 'Variant'})` : product.name;
                                  }
                                  return item.productName || 'Unknown Product';
                                })()}
                              </h5>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">Unit: {item.unit} | Stock: {(() => {
                                 if (!product) return 'N/A';
                                 if (item.variantId) {
                                   const v = product.variants?.find(v => String(v.variantId?._id || v.variantId || v._id) === String(item.variantId?._id || item.variantId));
                                   return `${v?.currentStock || 0} (O.P: ${v?.openingStock || 0})`;
                                 }
                                 return product.currentStock || 0;
                               })()}</p>
                            </div>
                            <div className="w-28">
                              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-dark-card px-2 py-1.5 rounded-xl border border-gray-100 dark:border-dark-border">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Qty:</span>
                                <CustomTextField
                                  type="number"
                                  placeholder="Qty"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setNewService(prev => ({
                                      ...prev,
                                      requiredItems: prev.requiredItems.map((ri, i) => 
                                        i === idx ? { ...ri, quantity: val } : ri
                                      )
                                    }));
                                  }}
                                  className="h-7 border-none bg-transparent shadow-none focus:ring-0 text-xs font-bold w-12 p-0 text-center"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNewService(prev => ({
                                  ...prev,
                                  requiredItems: prev.requiredItems.filter((_, i) => i !== idx)
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
                  <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-widest px-1 block">
                    Staff Specific Commission (%)
                  </label>
                  <div className="bg-gray-50 dark:bg-dark-card/50 rounded-2xl border border-gray-100 dark:border-dark-border divide-y divide-gray-100 overflow-hidden">
                    {staffMembers.map((staff) => {
                      const commission = newService.staffCommissions.find(
                        (sc) => sc.staff === staff._id,
                      );
                      return (
                        <div key={staff._id} className="flex items-center justify-between p-3 bg-white dark:bg-dark-surface/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary dark:text-blue-400">
                              <Users size={14} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{staff.name}</span>
                              <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">
                                HRM Default: {staff.commissionPercentage || 0}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder={staff.commissionPercentage || 0}
                              value={commission?.commissionPercentage || ""}
                              onChange={(e) => handleStaffCommissionChange(staff._id, e.target.value)}
                              className="w-16 text-xs font-bold text-gray-900 dark:text-white bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg px-2 py-1.5 outline-none focus:border-brand-primary text-right"
                            />
                            <span className="text-xs font-bold text-gray-400 dark:text-gray-500">%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 px-1 font-medium">
                    Leave blank to use the default HRM commission percentage for that staff.
                  </p>
                </>
              ) : (
                <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No staff members found</p>
                  <p className="text-xs mt-1">Add staff members to configure commissions</p>
                </div>
              )}
            </div>
          )}

          {/* ── VARIANTS TAB ── */}
          {activeTab === "variants" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Service Variants</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Select and configure each variant</p>
                </div>
                <button type="button" onClick={() => setIsAddVariantOpen(true)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-brand-primary dark:text-blue-400 bg-brand-primary/10 px-3 py-1.5 rounded-lg hover:bg-brand-primary hover:text-white transition-all">
                  <Plus size={12} strokeWidth={3} />New Variant
                </button>
              </div>

              {availableVariants.map((v) => {
                const isSelected = newService.variants.some(
                  (sv) => sv.variantId === v._id || sv.variantId?._id === v._id,
                );
                return (
                  <div key={v._id} className={`bg-white dark:bg-dark-surface border transition-all duration-300 rounded-2xl overflow-hidden ${isSelected ? "border-brand-primary shadow-md" : "border-gray-100 dark:border-dark-border opacity-70"}`}>
                    <div
                      className={`px-4 py-3 border-b flex items-center justify-between cursor-pointer transition-colors ${isSelected ? "bg-brand-primary/5 border-brand-primary/10" : "bg-gray-50 dark:bg-dark-card border-gray-100 dark:border-dark-border"}`}
                      onClick={() => {
                        if (isSelected) {
                          setNewService((prev) => ({ ...prev, variants: prev.variants.filter((sv) => sv.variantId !== v._id && sv.variantId?._id !== v._id) }));
                        } else {
                          setNewService((prev) => ({ ...prev, variants: [...prev.variants, { variantId: v._id, price: "", pricing: departments.map((d) => ({ department: d._id, price: "" })), taxId: "", isTaxInclusive: false }] }));
                        }
                      }}
                    >
                      <span className={`text-sm font-bold flex items-center gap-2 ${isSelected ? "text-brand-primary dark:text-blue-400" : "text-gray-500"}`}>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? "bg-brand-primary border-brand-primary" : "bg-white dark:bg-dark-surface border-gray-300 dark:border-dark-border"}`}>
                          {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                        </div>
                        {v.name}
                      </span>
                      {isSelected && <span className="text-[10px] font-black text-brand-primary dark:text-blue-400 uppercase tracking-widest bg-brand-primary/10 px-2 py-0.5 rounded-full">Active</span>}
                    </div>

                    {isSelected && (
                      <div className="p-3 bg-gray-50 dark:bg-dark-card/30 border-t border-gray-100 dark:border-dark-border">
                        <div className="flex flex-col md:flex-row items-center gap-4 mb-4 bg-blue-50 dark:bg-blue-900/20/50 p-3 rounded-xl border border-blue-100/50">
                          <div className="flex-1">
                            <h4 className="text-xs font-bold text-blue-900">Quick Amount (This Variant)</h4>
                            <p className="text-[10px] text-blue-600/80 font-medium">Set same price across all departments</p>
                            <div className="mt-2 w-full md:w-32">
                              <input type="number" placeholder="0"
                                value={newService.variants.find((sv) => sv.variantId === v._id || sv.variantId?._id === v._id)?.price || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewService((prev) => ({ ...prev, variants: prev.variants.map((sv) => sv.variantId === v._id || sv.variantId?._id === v._id ? { ...sv, price: val } : sv) }));
                                  if (departments.length > 0) handleVariantCommonAmountChange(v._id, val);
                                }}
                                className="w-full text-xs font-bold text-gray-900 dark:text-white bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg px-2 py-1.5 outline-none focus:border-brand-primary"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col md:flex-row items-center gap-4 border-l border-blue-200/50 pl-4 h-full">
                            <div className="min-w-[150px]">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Variant Tax</span>
                                <button type="button" onClick={() => { setTaxTargetVariantId(v._id); setIsAddTaxOpen(true); }}
                                  className="flex items-center justify-center w-5 h-5 rounded-md bg-brand-primary/10 text-brand-primary dark:text-blue-400 hover:bg-brand-primary hover:text-white transition-all shadow-sm">
                                  <Plus size={12} strokeWidth={3} />
                                </button>
                              </div>
                              <CustomDropdown variant="compact"
                                value={(() => { const sv = newService.variants.find((sv) => sv.variantId === v._id || sv.variantId?._id === v._id); return sv?.taxId?._id || sv?.taxId || ""; })()}
                                onChange={(e) => { const val = e.target.value; setNewService((prev) => ({ ...prev, variants: prev.variants.map((sv) => sv.variantId === v._id || sv.variantId?._id === v._id ? { ...sv, taxId: val } : sv) })); }}
                                options={[{ value: "", label: "No Tax" }, ...taxes.map((tax) => ({ value: tax._id, label: tax.name.includes(String(tax.percentage)) ? tax.name : `${tax.name} (${tax.percentage}%)` }))]}
                                placeholder="Select Tax" icon={Percent}
                              />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${newService.variants.find((sv) => sv.variantId === v._id || sv.variantId?._id === v._id)?.isTaxInclusive ? "bg-brand-primary border-brand-primary" : "border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface"}`}>
                                <input type="checkbox"
                                  checked={newService.variants.find((sv) => sv.variantId === v._id || sv.variantId?._id === v._id)?.isTaxInclusive || false}
                                  onChange={(e) => { const val = e.target.checked; setNewService((prev) => ({ ...prev, variants: prev.variants.map((sv) => sv.variantId === v._id || sv.variantId?._id === v._id ? { ...sv, isTaxInclusive: val } : sv) })); }}
                                  className="hidden"
                                />
                                {newService.variants.find((sv) => sv.variantId === v._id || sv.variantId?._id === v._id)?.isTaxInclusive && <Check size={10} className="text-white" strokeWidth={4} />}
                              </div>
                              <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-brand-primary transition-colors">Tax Inclusive</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Department Pricing</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                            {departments.map((dept) => (
                              <div key={dept._id} className="bg-gray-50/50 p-2 rounded-xl flex items-center justify-between border border-transparent focus-within:border-brand-primary/50 focus-within:bg-white dark:bg-dark-surface transition-all">
                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{dept.name}</span>
                                <div className="flex items-center">
                                  <span className="text-gray-400 dark:text-gray-500 text-xs font-bold mr-1 notranslate">{currencySymbol}</span>
                                  <input type="number" placeholder="0"
                                    value={getVariantPrice(v._id, dept._id)}
                                    onChange={(e) => handleVariantPriceChange(v._id, dept._id, e.target.value)}
                                    className="w-16 text-sm font-bold text-gray-900 dark:text-white bg-transparent outline-none text-right"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {availableVariants.length === 0 && (
                <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                  <Shuffle size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No variants available</p>
                  <p className="text-xs mt-1">Create a variant using the button above</p>
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

      {/* --- ADD CATEGORY POPUP --- */}
      <Modal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        title="Add Category"
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsAddCategoryOpen(false)}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNewCategory}
              disabled={isSubmittingCategory}
              className={`flex-1 px-4 py-2.5 text-white font-medium rounded-lg transition-colors ${isSubmittingCategory
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-brand-primary hover:bg-brand-secondary"
                }`}
            >
              {isSubmittingCategory ? "Saving..." : "Create"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddNewCategory} className="py-4 space-y-4">
          <CustomTextField
            label="Category Name"
            placeholder="e.g. Hair, Facial"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            required
            autoFocus
          />
        </form>
      </Modal>

      {/* --- ADD DEPARTMENT POPUP --- */}
      <Modal
        isOpen={isAddDepartmentOpen}
        onClose={() => setIsAddDepartmentOpen(false)}
        title="Add Service Department"
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsAddDepartmentOpen(false)}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNewDepartment}
              disabled={isSubmittingDepartment}
              className={`flex-1 px-4 py-2.5 text-white font-medium rounded-lg transition-colors ${isSubmittingDepartment
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-brand-primary hover:bg-brand-secondary"
                }`}
            >
              {isSubmittingDepartment ? "Saving..." : "Create"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddNewDepartment} className="py-4 space-y-4">
          <CustomTextField
            label="Department Name"
            placeholder="e.g. Men, Women, VIP"
            value={newDepartmentName}
            onChange={(e) => setNewDepartmentName(e.target.value)}
            required
            autoFocus
          />
        </form>
      </Modal>

      {/* --- ADD VARIANT POPUP --- */}
      <Modal
        isOpen={isAddVariantOpen}
        onClose={() => setIsAddVariantOpen(false)}
        title="Add Variant"
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsAddVariantOpen(false)}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNewVariant}
              disabled={isSubmittingVariant}
              className={`flex-1 px-4 py-2.5 text-white font-medium rounded-lg transition-colors ${isSubmittingVariant
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-brand-primary hover:bg-brand-secondary"
                }`}
            >
              {isSubmittingVariant ? "Saving..." : "Create"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddNewVariant} className="py-4 space-y-4">
          <CustomTextField
            label="Variant Name"
            placeholder="e.g. Normal, Premium"
            value={newVariantName}
            onChange={(e) => setNewVariantName(e.target.value)}
            required
            autoFocus
          />
        </form>
      </Modal>

      {/* --- ADD TAX POPUP --- */}
      <Modal
        isOpen={isAddTaxOpen}
        onClose={() => setIsAddTaxOpen(false)}
        title="Add Tax"
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsAddTaxOpen(false)}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNewTax}
              disabled={isSubmittingTax}
              className={`flex-1 px-4 py-2.5 text-white font-medium rounded-lg transition-colors ${isSubmittingTax
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-brand-primary hover:bg-brand-secondary"
                }`}
            >
              {isSubmittingTax ? "Saving..." : "Create"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddNewTax} className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
              Tax Name
            </label>
            <div className="flex gap-3">
              {["GST", "VAT"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setNewTaxName(type)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${newTaxName === type
                    ? "bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20"
                    : "bg-white dark:bg-dark-surface text-gray-600 dark:text-gray-400 border-gray-200 dark:border-dark-border hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card"
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <CustomTextField
            label="Percentage (%)"
            placeholder="e.g. 18"
            type="number"
            icon={Percent}
            value={newTaxPercentage}
            onChange={(e) => setNewTaxPercentage(e.target.value)}
            required
            autoFocus
          />
        </form>
      </Modal>

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
