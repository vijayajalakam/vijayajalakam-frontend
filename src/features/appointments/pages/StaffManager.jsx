import { useEffect, useState } from "react";
import {
  StaffSkeleton,
  StatsSkeleton,
} from "../../../components/shared/Skeleton";
import CustomTable from "../../../components/shared/CustomTable";
import { useGetShopsQuery } from "../../../store/api/tenantEndpoints";
import {
  useGetAdminStaffQuery,
  useGetAdminServicesQuery,
  useGetPrivilegesListQuery,
  useGetNextEmployeeIdQuery,
  useCreateAdminStaffMutation,
  useUpdateAdminStaffMutation,
  useDeleteAdminStaffMutation,
  useBulkDeleteAdminStaffMutation,
  useGetDesignationsQuery,
  useCreateDesignationMutation,
} from "../../../store/api/tenantCrudEndpoints";
import { rtkErrorMessage } from "../../../store/api/rtkUtils";
import StatsGrid from "../../../components/shared/StatsGrid";
import {
  Users,
  UserCheck,
  UserPlus,
  Trash2,
  Mail,
  Phone,
  ShieldCheck,
  Edit3,
  LayoutGrid,
  LayoutList,
  Store,
  User,
  Lock,
  Percent,
  TrendingUp,
  Filter,
  ChevronDown,
  Search,
  Clock,
  X,
  Calendar,
  Hash,
  Loader2,
  FileText,
  Upload,
  File,
  Heart,
  Droplet,
  Globe,
  CalendarClock,
  MapPin,
  GraduationCap,
  Star,
  Download,
} from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import CustomMultiSelect from "../../../components/shared/CustomMultiSelect";
import CustomTextField from "../../../components/shared/CustomTextField";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import Snackbar from "../../../components/shared/Snackbar";
import UploadStaffModal from "../../../components/shared/UploadStaffModal";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { validateFileSize, getFileSizeHint } from "../../../utils/fileUploadUtils";
import StaffReviewsTab from "./StaffReviewsTab";
import moment from "moment";
import * as XLSX from "xlsx";

const StaffManager = () => {
  const { user, currencySymbol, hasPermission, isAdmin } = useAuth();
  
  const canAdd = isAdmin || hasPermission("hrm:staff:add");
  const canEdit = isAdmin || hasPermission("hrm:staff:edit");
  const canDelete = isAdmin || hasPermission("hrm:staff:delete");
  const navigate = useNavigate();
  const { shopSlug } = useParams(); // Get shopSlug
  
  // State declarations MUST come before hooks that use them
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState("professional");
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    commissionPercentage: "",
    services: [],
    shop: "",
    gender: "",
    dateOfBirth: "",
    joiningDate: "",
    employeeId: "",
    maritalStatus: "",
    bloodGroup: "",
    nationality: "",
    designation: "",
    privilegeId: "", // Add privilege field
    salary: "",
    otRatePerHour: "",
    paidLeaves: "",
    wageType: "Monthly",
    allowances: [],
    deductions: [],
    incentiveTargetAmount: "",
    incentiveEnabled: false,
    incentiveCycleDays: "30",
    incentiveCycleStartDate: "",
    showToUser: true,
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  // Filtering State
  const [search, setSearch] = useState("");
  const [selectedShop, setSelectedShop] = useState("");
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });
  
  // API hooks - these come AFTER state declarations
  const { data: staff = [], isLoading: loading, refetch } = useGetAdminStaffQuery();
  const { data: shops = [] } = useGetShopsQuery(shopSlug);
  const { data: services = [] } = useGetAdminServicesQuery();
  const { data: privileges = [] } = useGetPrivilegesListQuery();
  const { data: nextEmployeeIdData } = useGetNextEmployeeIdQuery(undefined, {
    skip: !isModalOpen || editingStaff !== null, // Only fetch when adding new staff
  });
  const [createStaff] = useCreateAdminStaffMutation();
  const [updateStaffMut] = useUpdateAdminStaffMutation();
  const [deleteStaffMut] = useDeleteAdminStaffMutation();
  const { data: designations = [] } = useGetDesignationsQuery();
  const [createDesignation] = useCreateDesignationMutation();
  const [showNewDesignation, setShowNewDesignation] = useState(false);
  const [newDesignationName, setNewDesignationName] = useState("");

  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleteStaff] = useBulkDeleteAdminStaffMutation();

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      await bulkDeleteStaff(selectedIds).unwrap();
      showSnack(`Successfully deleted ${selectedIds.length} staff members`);
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
    } catch (err) {
      console.error("Bulk delete error:", err);
      showSnack(err.data?.error || err.data?.message || err.message || "Error deleting staff members", "error");
    }
  };

  useEffect(() => {
    const lowerSearch = search.toLowerCase();
    const filtered = staff.filter((s) => {
      const name = s.name?.toLowerCase() || "";
      const email = s.email?.toLowerCase() || "";
      const phone = s.phone || "";

      const matchesSearch =
        name.includes(lowerSearch) ||
        email.includes(lowerSearch) ||
        phone.includes(search);

      const matchesShop = !selectedShop || s.shop?._id === selectedShop;

      return matchesSearch && matchesShop;
    });
    setFilteredStaff(filtered);
  }, [search, selectedShop, staff]);

  const handleExportStaff = () => {
    const dataToExport = staff.map((s) => ({
      "Employee ID": s.employeeId || "",
      "Name": s.name || "",
      "Email": s.email || "",
      "Phone": s.phone || "",
      "Gender": s.gender || "",
      "Date of Birth": s.dateOfBirth ? moment(s.dateOfBirth).format("DD MMM YYYY") : "",
      "Joining Date": s.joiningDate ? moment(s.joiningDate).format("DD MMM YYYY") : "",
      "Marital Status": s.maritalStatus || "",
      "Blood Group": s.bloodGroup || "",
      "Nationality": s.nationality || "",
      "Address": s.address || "",
      "Designation": s.designation || "",
      "Salary": s.salary || 0,
      "OT Rate Per Hour": s.otRatePerHour || 0,
      "Paid Leaves / Month": s.paidLeaves || 0,
      "Wage Type": s.wageType || "Monthly",
      "Commission Percentage": s.commissionPercentage || 0,
      "Incentive Target Amount": s.incentiveTargetAmount || 0,
      "Incentive Enabled": s.incentiveEnabled ? "Yes" : "No",
      "Incentive Cycle Days": s.incentiveCycleDays || 30
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Staff");
    XLSX.writeFile(workbook, "staff_export.xlsx");
  };

  // Auto-populate employee ID when adding new staff
  useEffect(() => {
    if (isModalOpen && !editingStaff && nextEmployeeIdData?.employeeId) {
      setNewStaff((prev) => ({
        ...prev,
        employeeId: nextEmployeeIdData.employeeId,
      }));
    }
  }, [isModalOpen, editingStaff, nextEmployeeIdData]);

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

  const handleAddQualification = () => {
    setQualifications([
      ...qualifications,
      { id: Date.now(), degree: "", institution: "", year: "" },
    ]);
  };

  const handleRemoveQualification = (id) => {
    setQualifications(qualifications.filter((qual) => qual.id !== id));
  };

  const handleQualificationChange = (id, field, value) => {
    setQualifications(
      qualifications.map((qual) =>
        qual.id === id ? { ...qual, [field]: value } : qual
      )
    );
  };

  const handleEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setNewStaff({
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone,
      password: "", // Leave blank to keep existing
      commissionPercentage: staffMember.commissionPercentage || "",
      services: (staffMember.services || []).map((s) => s._id),
      shop: staffMember.shop?._id || "",
      gender: staffMember.gender || "",
      dateOfBirth: staffMember.dateOfBirth ? new Date(staffMember.dateOfBirth).toISOString().split('T')[0] : "",
      joiningDate: staffMember.joiningDate ? new Date(staffMember.joiningDate).toISOString().split('T')[0] : "",
      employeeId: staffMember.employeeId || "",
      maritalStatus: staffMember.maritalStatus || "",
      bloodGroup: staffMember.bloodGroup || "",
      nationality: staffMember.nationality || "",
      address: staffMember.address || "",
      designation: staffMember.designation || "",
      privilegeId: staffMember.privilegeId?._id || staffMember.privilegeId || "", // Add privilege
      salary: staffMember.salary || "",
      otRatePerHour: staffMember.otRatePerHour || "",
      paidLeaves: staffMember.paidLeaves || "",
      wageType: staffMember.wageType || "Monthly",
      allowances: staffMember.allowances || [],
      deductions: staffMember.deductions || [],
      incentiveTargetAmount: staffMember.incentiveTargetAmount || "",
      incentiveEnabled: staffMember.incentiveEnabled || false,
      incentiveCycleDays: staffMember.incentiveCycleDays || "",
      incentiveCycleStartDate: staffMember.incentiveCycleStartDate ? new Date(staffMember.incentiveCycleStartDate).toISOString().split('T')[0] : "",
      showToUser: staffMember.showToUser !== undefined ? staffMember.showToUser : true,
      shifts: staffMember.shifts?.length ? staffMember.shifts : [
        { day: 'Monday', active: true, shiftType: 'Day Shift', startTime: '09:00', endTime: '18:00' },
        { day: 'Tuesday', active: true, shiftType: 'Day Shift', startTime: '09:00', endTime: '18:00' },
        { day: 'Wednesday', active: true, shiftType: 'Day Shift', startTime: '09:00', endTime: '18:00' },
        { day: 'Thursday', active: true, shiftType: 'Day Shift', startTime: '09:00', endTime: '18:00' },
        { day: 'Friday', active: true, shiftType: 'Day Shift', startTime: '09:00', endTime: '18:00' },
        { day: 'Saturday', active: true, shiftType: 'Day Shift', startTime: '09:00', endTime: '18:00' },
        { day: 'Sunday', active: false, shiftType: 'Day Shift', startTime: '09:00', endTime: '18:00' },
      ],
    });
    setImagePreview(staffMember.photo?.url || null);
    
    // Load existing documents with proper structure
    const existingDocs = (staffMember.documents || []).map((doc, index) => ({
      id: doc._id || Date.now() + index,
      documentId: doc.documentId || "",
      documentName: doc.documentName || "",
      file: null,
      filePreview: doc.fileUrl || null, // Show existing file URL
      existingFileUrl: doc.fileUrl || null, // Keep track of existing file
      existingFilePublicId: doc.filePublicId || null,
    }));
    setDocuments(existingDocs);
    
    setQualifications(staffMember.qualifications || []);
    setActiveTab("professional");
    setIsModalOpen(true);
  };

  const handleAddOrUpdateStaff = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Validate optional login credentials if provided
      const trimmedEmail = newStaff.email ? newStaff.email.trim() : "";
      const trimmedPassword = newStaff.password ? newStaff.password.trim() : "";

      if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        showSnack("Please enter a valid email address", "error");
        setIsSaving(false);
        return;
      }

      if (trimmedPassword && trimmedPassword.length < 6) {
        showSnack("Password must be at least 6 characters", "error");
        setIsSaving(false);
        return;
      }

      const formData = new FormData();
      formData.append("name", newStaff.name);
      formData.append("email", trimmedEmail);
      formData.append("phone", newStaff.phone);
      formData.append("commissionPercentage", newStaff.commissionPercentage);
      if (newStaff.shop) formData.append("branchId", newStaff.shop);
      if (newStaff.gender) formData.append("gender", newStaff.gender);
      if (newStaff.dateOfBirth) formData.append("dateOfBirth", newStaff.dateOfBirth);
      if (newStaff.joiningDate) formData.append("joiningDate", newStaff.joiningDate);
      if (newStaff.employeeId) formData.append("employeeId", newStaff.employeeId);
      if (newStaff.maritalStatus) formData.append("maritalStatus", newStaff.maritalStatus);
      if (newStaff.bloodGroup) formData.append("bloodGroup", newStaff.bloodGroup);
      if (newStaff.nationality) formData.append("nationality", newStaff.nationality);
      if (newStaff.address) formData.append("address", newStaff.address);
      if (newStaff.designation) formData.append("designation", newStaff.designation);
      if (newStaff.privilegeId) formData.append("privilegeId", newStaff.privilegeId); // Add privilege (only if not empty)
      else formData.append("privilegeId", ""); // Explicitly send empty string to remove privilege

      formData.append("salary", newStaff.salary || 0);
      formData.append("otRatePerHour", newStaff.otRatePerHour || 0);
      formData.append("paidLeaves", newStaff.paidLeaves || 0);
      formData.append("wageType", newStaff.wageType || "Monthly");
      if (newStaff.allowances?.length) formData.append("allowances", JSON.stringify(newStaff.allowances));
      if (newStaff.deductions?.length) formData.append("deductions", JSON.stringify(newStaff.deductions));
      formData.append("incentiveTargetAmount", newStaff.incentiveTargetAmount || 0);
      formData.append("incentiveEnabled", newStaff.incentiveEnabled);
      formData.append("incentiveCycleDays", newStaff.incentiveCycleDays || 0);
      if (newStaff.incentiveCycleStartDate) formData.append("incentiveCycleStartDate", newStaff.incentiveCycleStartDate);
      formData.append("showToUser", newStaff.showToUser);

      if (trimmedPassword) {
        formData.append("password", trimmedPassword);
      }
      if (newStaff.shifts && newStaff.shifts.length > 0) {
        formData.append("shifts", JSON.stringify(newStaff.shifts));
      }
      if (newStaff.services.length > 0) {
        formData.append("services", JSON.stringify(newStaff.services));
      }
      if (selectedImage) {
        formData.append("photo", selectedImage);
      }

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
      formData.append("documentsData", JSON.stringify(documentsData));

      // Add only NEW document files (not existing ones)
      documents.forEach((doc) => {
        if (doc.file) {
          formData.append("documents", doc.file);
        }
      });

      // Add qualifications
      const qualificationsData = qualifications.map((qual) => ({
        degree: qual.degree,
        institution: qual.institution,
        year: qual.year,
      }));
      formData.append("qualifications", JSON.stringify(qualificationsData));

      if (editingStaff) {
        await updateStaffMut({
          id: editingStaff._id,
          body: formData,
        }).unwrap();
        showSnack("Staff updated successfully", "success");
      } else {
        await createStaff(formData).unwrap();
        showSnack("Staff registered successfully", "success");
      }

      setNewStaff({
        name: "",
        email: "",
        phone: "",
        password: "",
        commissionPercentage: "",
        services: [],
        shop: "",
        gender: "",
        dateOfBirth: "",
        joiningDate: "",
        employeeId: "",
        maritalStatus: "",
        bloodGroup: "",
        nationality: "",
        address: "",
        privilegeId: "", // Reset privilege
        showToUser: true,
        salary: "",
        otRatePerHour: "",
        paidLeaves: "",
        wageType: "Monthly",
        allowances: [],
        deductions: [],
        incentiveTargetAmount: "",
        incentiveEnabled: false,
        incentiveCycleDays: "30",
        incentiveCycleStartDate: "",
      });
      setSelectedImage(null);
      setImagePreview(null);
      setDocuments([]);
      setQualifications([]);
      setEditingStaff(null);
      setActiveTab("professional");
      setIsModalOpen(false);
    } catch (err) {
      showSnack(rtkErrorMessage(err, "Failed to save staff"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (staffMember) => {
    setStaffToDelete(staffMember);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!staffToDelete) return;
    try {
      await deleteStaffMut(staffToDelete._id).unwrap();
    } catch (err) {
      showSnack(rtkErrorMessage(err, "Failed to delete staff"), "error");
    } finally {
      setStaffToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  // Calculate real stats
  const activeServiceProviders =
    staff?.filter((s) => s.services && s.services.length > 0).length || 0;
  const shopsCovered =
    new Set(staff?.map((s) => s.shop?._id).filter(Boolean)).size || 0;
  const servicesOffered =
    new Set(
      staff?.flatMap((s) => s.services?.map((svc) => svc._id)).filter(Boolean),
    ).size || 0;

  const stats = [
    {
      label: "Total Team",
      value: staff?.length || 0,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Service Providers",
      value: activeServiceProviders,
      icon: UserCheck,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Active Staff",
      value: staff?.filter((s) => s.isActive !== false).length || 0,
      icon: Users,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Services Offered",
      value: servicesOffered,
      icon: UserPlus,
      color: "bg-indigo-50 text-indigo-600",
    }, // Replaced coverage
  ];

  const columns = [
    {
      header: "Photo",
      width: "w-16",
      render: (s) => (
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-card overflow-hidden border-2 border-white shadow-sm ring-2 ring-gray-100/50 transition-transform duration-300 group-hover:scale-110">
          {s.photo?.url ? (
            <img
              src={s.photo.url}
              alt={s.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-brand-primary dark:text-blue-400 font-bold text-lg">
              {s.name
                ?.split(" ")
                .map((val) => val[0])
                .join("")
                .toUpperCase()}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Professional",
      render: (s) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 dark:text-white tracking-tight text-sm">
              {s.name || "N/A"}
            </p>
            {s.avgRating > 0 && (
              <div className="flex items-center gap-0.5 bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-yellow-100">
                <Star size={10} className="fill-yellow-500 text-yellow-500" />
                {s.avgRating.toFixed(1)}
                <span className="text-yellow-600/60 ml-0.5">({s.reviewsCount || 0})</span>
              </div>
            )}
          </div>
          {s.employeeId && (
            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Hash size={10} className="text-gray-400 dark:text-gray-500" />
              {s.employeeId}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Contact Info",
      render: (s) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
            <Mail size={14} className="text-gray-400 dark:text-gray-500" />
            {s.email || "N/A"}
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
            <Phone size={14} className="text-gray-400 dark:text-gray-500" />
            {s.phone || "N/A"}
          </div>
        </div>
      ),
    },
    {
      header: "Personal Details",
      render: (s) => (
        <div className="space-y-1">
          {s.gender && (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <User size={12} className="text-gray-400 dark:text-gray-500" />
              <span className="font-medium">{s.gender}</span>
            </div>
          )}
          {s.dateOfBirth && (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Calendar size={12} className="text-gray-400 dark:text-gray-500" />
              <span className="font-medium">
                {new Date(s.dateOfBirth).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
          {s.joiningDate && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <Clock size={12} className="text-emerald-500" />
              <span className="font-medium">
                Joined {new Date(s.joiningDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          )}
          {!s.gender && !s.dateOfBirth && !s.joiningDate && (
            <span className="text-xs text-gray-400 dark:text-gray-500">No details</span>
          )}
        </div>
      ),
    },
    {
      header: "Earnings",
      render: (s) => (
        <button
          onClick={() =>
            navigate(`/${shopSlug}/admin/reports/staff-commission`, {
              state: { staffId: s._id },
            })
          }
          className="flex flex-col items-start group/earnings cursor-pointer gap-0.5"
        >
          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
            <span>
              <span className="notranslate">
                {currencySymbol}
                {Math.round(s.totalUnpaidCommission || 0).toLocaleString()}
              </span>
            </span>
            <TrendingUp
              size={12}
              className="text-gray-400 group-hover/earnings:text-brand-primary dark:text-blue-400 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 text-[10px] bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded-md font-medium border border-orange-100/50">
            <span className="font-bold">Unpaid</span>
          </div>
        </button>
      ),
    },
    ...(canEdit || canDelete ? [{
      header: "Actions",
      align: "right",
      render: (s) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => navigate(`/${shopSlug}/admin/reports/staff-statement`, { state: { staffId: s._id } })}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 dark:bg-emerald-900/20 rounded-lg transition-all active:scale-95 cursor-pointer"
            title="View Statement"
          >
            <FileText size={18} />
          </button>
          {canEdit && (
            <button
              onClick={() => handleEdit(s)}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Edit Staff"
            >
              <Edit3 size={18} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => confirmDelete(s)}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Remove Staff"
            >
              <Trash2 size={18} />
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

      {loading ? (
        <StaffSkeleton count={8} />
      ) : (
        <>
          <CustomTable
            columns={columns}
            data={filteredStaff}
            loading={loading}
            emptyMessage="No staff members found. Start by adding one!"
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search staff by name, phone..."
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
                  onClick={handleExportStaff}
                  className="h-10 px-2.5 md:px-4 flex items-center gap-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-dark-card active:scale-95 text-xs shrink-0"
                >
                  <Download size={16} />
                  <span className="hidden md:inline">Export</span>
                </button>
                {canAdd && (
                  <button
                  onClick={() => {
                    const defaultShop = user?.branchId
                      ? typeof user.branchId === "string"
                        ? user.branchId
                        : user.branchId._id
                      : "";
                    setEditingStaff(null);
                    setNewStaff({
                      name: "",
                      email: "",
                      phone: "",
                      password: "",
                      commissionPercentage: "",
                      services: services.map((s) => s._id), // Default to all services
                      shop: defaultShop,
                      gender: "",
                      dateOfBirth: "",
                      joiningDate: new Date().toISOString().split('T')[0], // Default to today
                      employeeId: "",
                      maritalStatus: "",
                      bloodGroup: "",
                      nationality: "",
                      address: "",
                      privilegeId: "", // Reset privilege
                      showToUser: true,
                      salary: "",
                      otRatePerHour: "",
                      paidLeaves: "",
                      wageType: "Monthly",
                      allowances: [],
                      shifts: [
                        { day: 'Monday', active: true, shiftType: 'Day Shift', startTime: '09:00', endTime: '18:00' },
                        { day: 'Tuesday', active: true, shiftType: 'Day Shift', startTime: '09:00', endTime: '18:00' },
                        { day: 'Wednesday', active: true, shiftType: 'Day Shift', startTime: '09:00', endTime: '18:00' },
                        { day: 'Thursday', active: true, shiftType: 'Day Shift', startTime: '09:00', endTime: '18:00' },
                        { day: 'Friday', active: true, shiftType: 'Day Shift', startTime: '09:00', endTime: '18:00' },
                        { day: 'Saturday', active: true, shiftType: 'Day Shift', startTime: '09:00', endTime: '18:00' },
                        { day: 'Sunday', active: false, shiftType: 'Day Shift', startTime: '09:00', endTime: '18:00' },
                      ],
                    });
  
                    setImagePreview(null);
                    setDocuments([]);
                    setQualifications([]);
                    setActiveTab("professional");
                    setIsModalOpen(true);
                  }}
                  className="h-10 px-2.5 md:px-4 flex items-center gap-2 bg-brand-primary text-white font-bold rounded-xl transition-all hover:bg-brand-secondary active:scale-95 shadow-sm text-xs shrink-0"
                >
                  <UserPlus size={16} />
                  <span className="hidden md:inline">Add Staff</span>
                </button>
              )}
              </div>
            }
            extraFilters={null}
            mobileMapper={{
              leading: (s) => (
                <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-dark-card overflow-hidden border border-gray-100 dark:border-dark-border flex-shrink-0">
                  {s.photo?.url ? (
                    <img
                      src={s.photo.url}
                      alt={s.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-lg bg-gray-50 dark:bg-dark-card">
                      {s.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ),
              title: (s) => (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900 dark:text-white text-[14px] truncate leading-tight">
                      {s.name}
                    </h4>
                    {s.avgRating > 0 && (
                      <div className="flex items-center gap-0.5 bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-yellow-100 shrink-0">
                        <Star size={10} className="fill-yellow-500 text-yellow-500" />
                        {s.avgRating.toFixed(1)}
                        <span className="text-yellow-600/60 ml-0.5">({s.reviewsCount || 0})</span>
                      </div>
                    )}
                  </div>
                  {s.employeeId && (
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Hash size={10} className="text-gray-400 dark:text-gray-500" />
                      {s.employeeId}
                    </p>
                  )}
                </div>
              ),
              subtitle: (s) => (
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate">
                    {s.shop?.name || "Independent"} • {s.services?.length || 0} Specialties
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {s.gender && (
                      <span className="text-[9px] bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
                        {s.gender}
                      </span>
                    )}
                    {s.joiningDate && (
                      <span className="text-[9px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                        Joined {new Date(s.joiningDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              ),
              trailing: (s) => (
                <div className="text-right">
                  <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none mb-0.5">
                    Unpaid
                  </p>
                  <p className="text-[13px] font-black text-orange-600 dark:text-orange-400 notranslate">
                    {currencySymbol}
                    {(s.totalUnpaidCommission || 0).toLocaleString()}
                  </p>
                </div>
              ),
              actions: (s) => (
                <div className="flex gap-2 pt-2 flex-wrap">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/${shopSlug}/admin/reports/staff-statement`, { state: { staffId: s._id } });
                    }}
                    className="flex-1 flex items-center justify-center gap-2 h-10 bg-emerald-50 text-emerald-600 dark:text-emerald-400 rounded-xl text-[11px] font-bold hover:bg-emerald-500 hover:text-white transition-all active:scale-95 border border-emerald-100"
                  >
                    <FileText size={14} /> Statement
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/${shopSlug}/admin/reports/staff-commission`, {
                        state: { staffId: s._id },
                      });
                    }}
                    className="flex-1 flex items-center justify-center gap-2 h-10 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-[11px] font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-card transition-all active:scale-95"
                  >
                    Reports
                  </button>
                  {canEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(s);
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
                        confirmDelete(s);
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
        </>
      )}

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
              className="fixed top-0 right-0 h-full w-full max-w-[800px] bg-white dark:bg-dark-surface shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                    <UserPlus size={20} className="text-brand-primary dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {editingStaff ? "Edit Professional" : "New Professional"}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {editingStaff ? "Update staff member details" : "Add a new team member"}
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
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-dark-border overflow-x-auto scrollbar-hide pb-1">
                  <button
                    onClick={() => setActiveTab("professional")}
                    className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap ${
                      activeTab === "professional"
                        ? "text-brand-primary"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      <span>Professional</span>
                    </div>
                    {activeTab === "professional" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("salary")}
                    className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap ${
                      activeTab === "salary"
                        ? "text-brand-primary"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} />
                      <span>Salary</span>
                    </div>
                    {activeTab === "salary" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("security")}
                    className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap ${
                      activeTab === "security"
                        ? "text-brand-primary"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Lock size={16} />
                      <span>Security</span>
                    </div>
                    {activeTab === "security" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("education")}
                    className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap ${
                      activeTab === "education"
                        ? "text-brand-primary"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <GraduationCap size={16} />
                      <span>Education</span>
                    </div>
                    {activeTab === "education" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("documents")}
                    className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap ${
                      activeTab === "documents"
                        ? "text-brand-primary"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
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
                    onClick={() => setActiveTab("shifts")}
                    className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap ${
                      activeTab === "shifts"
                        ? "text-brand-primary"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CalendarClock size={16} />
                      <span>Shifts</span>
                    </div>
                    {activeTab === "shifts" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                    )}
                  </button>
                  {editingStaff && (
                    <button
                      onClick={() => setActiveTab("reviews")}
                      className={`px-4 py-2.5 text-sm font-bold transition-all relative whitespace-nowrap ${
                        activeTab === "reviews"
                          ? "text-brand-primary"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Star size={16} />
                        <span>Reviews</span>
                      </div>
                      {activeTab === "reviews" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                      )}
                    </button>
                  )}
                </div>

                {/* Tab Content */}
                <form className="space-y-5">
                  {/* Professional Tab */}
                  {activeTab === "professional" && (
                    <Motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      {/* Profile Photo */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest px-1">
                          Profile Photo
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
                              <Users className="text-gray-300" size={32} />
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="text-xs text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:bg-blue-900/20 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                            />
                            <p className="text-[10px] text-brand-primary dark:text-blue-400 font-bold ml-1 uppercase tracking-tight">{getFileSizeHint()}</p>
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
                            placeholder="Enter full name"
                            value={newStaff.name}
                            onChange={(e) =>
                              setNewStaff({ ...newStaff, name: e.target.value })
                            }
                            required
                          />
                          {/* Position Dropdown - replaces Employee ID */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest px-1">
                              Position <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <CustomDropdown
                                  icon={Star}
                                  placeholder="Select position"
                                  value={newStaff.designation}
                                  onChange={(e) => setNewStaff({ ...newStaff, designation: e.target.value })}
                                  options={designations.map((d) => ({ value: d.name, label: d.name }))}
                                  required
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowNewDesignation(true)}
                                className="h-[44px] w-[44px] rounded-xl border border-gray-200 dark:border-dark-border flex items-center justify-center hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card hover:border-blue-300 transition-all text-gray-400 dark:text-gray-500 hover:text-blue-600"
                                title="Add new position"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              </button>
                            </div>
                            {showNewDesignation && (
                              <div className="flex gap-2 mt-2">
                                <input
                                  type="text"
                                  placeholder="e.g. Educator, Author, Instructor..."
                                  value={newDesignationName}
                                  onChange={(e) => setNewDesignationName(e.target.value)}
                                  className="flex-1 h-[38px] px-3 rounded-lg border border-gray-200 dark:border-dark-border text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (newDesignationName.trim()) {
                                        try {
                                          await createDesignation({ name: newDesignationName.trim() }).unwrap();
                                          setNewStaff({ ...newStaff, designation: newDesignationName.trim() });
                                          setNewDesignationName("");
                                          setShowNewDesignation(false);
                                          showSnack("Position created!", "success");
                                        } catch (err) {
                                          showSnack(err?.data?.message || "Failed to create position", "error");
                                        }
                                      }
                                    }
                                  }}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (newDesignationName.trim()) {
                                      try {
                                        await createDesignation({ name: newDesignationName.trim() }).unwrap();
                                        setNewStaff({ ...newStaff, designation: newDesignationName.trim() });
                                        setNewDesignationName("");
                                        setShowNewDesignation(false);
                                        showSnack("Position created!", "success");
                                      } catch (err) {
                                        showSnack(err?.data?.message || "Failed to create position", "error");
                                      }
                                    }
                                  }}
                                  className="h-[38px] px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setShowNewDesignation(false); setNewDesignationName(""); }}
                                  className="h-[38px] px-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-400 transition-colors"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <CustomDropdown
                            label="Gender"
                            icon={User}
                            placeholder="Select gender"
                            value={newStaff.gender}
                            onChange={(e) =>
                              setNewStaff({ ...newStaff, gender: e.target.value })
                            }
                            options={[
                              { value: "Male", label: "Male" },
                              { value: "Female", label: "Female" },
                              { value: "Other", label: "Other" },
                            ]}
                            required
                          />
                          <CustomTextField
                            label="Phone Number"
                            icon={Phone}
                            placeholder="+1 (555) 000-0000"
                            value={newStaff.phone}
                            onChange={(e) =>
                              setNewStaff({ ...newStaff, phone: e.target.value })
                            }
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <CustomTextField
                            label="Date of Birth"
                            icon={Calendar}
                            type="date"
                            value={newStaff.dateOfBirth}
                            onChange={(e) =>
                              setNewStaff({ ...newStaff, dateOfBirth: e.target.value })
                            }
                          />
                          <CustomTextField
                            label="Joining Date"
                            icon={Calendar}
                            type="date"
                            value={newStaff.joiningDate}
                            onChange={(e) =>
                              setNewStaff({ ...newStaff, joiningDate: e.target.value })
                            }
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <CustomDropdown
                            label="Marital Status"
                            icon={Heart}
                            placeholder="Select marital status"
                            value={newStaff.maritalStatus}
                            onChange={(e) =>
                              setNewStaff({ ...newStaff, maritalStatus: e.target.value })
                            }
                            options={[
                              { value: "Single", label: "Single" },
                              { value: "Married", label: "Married" },
                              { value: "Divorced", label: "Divorced" },
                              { value: "Widowed", label: "Widowed" },
                            ]}
                          />
                          <CustomDropdown
                            label="Blood Group"
                            icon={Droplet}
                            placeholder="Select blood group"
                            value={newStaff.bloodGroup}
                            onChange={(e) =>
                              setNewStaff({ ...newStaff, bloodGroup: e.target.value })
                            }
                            options={[
                              { value: "A+", label: "A+" },
                              { value: "A-", label: "A-" },
                              { value: "B+", label: "B+" },
                              { value: "B-", label: "B-" },
                              { value: "AB+", label: "AB+" },
                              { value: "AB-", label: "AB-" },
                              { value: "O+", label: "O+" },
                              { value: "O-", label: "O-" },
                            ]}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <CustomTextField
                            label="Nationality"
                            icon={Globe}
                            placeholder="e.g. Indian"
                            value={newStaff.nationality}
                            onChange={(e) =>
                              setNewStaff({ ...newStaff, nationality: e.target.value })
                            }
                          />
                          <CustomTextField
                            label="Address"
                            icon={MapPin}
                            placeholder="Enter full address"
                            value={newStaff.address}
                            onChange={(e) =>
                              setNewStaff({ ...newStaff, address: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      {/* Employment Details */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                          Employment Details
                        </h3>


                        <CustomMultiSelect
                          label="Assigned Services"
                          icon={Scissors}
                          placeholder="Select Services"
                          value={newStaff.services}
                          onChange={(e) =>
                            setNewStaff({ ...newStaff, services: e.target.value })
                          }
                          options={services
                            .filter((s) => {
                              if (!newStaff.shop) return true;
                              if (!s.branches || s.branches.length === 0) return true;
                              return s.branches.some(
                                (b) => (b._id || b) === newStaff.shop,
                              );
                            })
                            .map((s) => ({ value: s._id, label: s.name }))}
                          isSearchable={true}
                          showSelectAll={true}
                        />

                        {/* Visibility Setting */}
                        <div className="bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-4 mt-4">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <User size={16} className="text-gray-600 dark:text-gray-400" />
                              <p className="text-sm font-bold text-gray-900 dark:text-white">
                                Show to User (Booking Page)
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={newStaff.showToUser}
                                onChange={(e) =>
                                  setNewStaff({
                                    ...newStaff,
                                    showToUser: e.target.checked,
                                  })
                                }
                              />
                              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-dark-surface after:border-gray-300 dark:border-dark-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div>
                            </label>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed ml-6">
                            If disabled, this staff member will not be visible to users for online bookings.
                          </p>
                        </div>
                      </div>
                    </Motion.div>
                  )}

                  {/* Salary Tab */}
                  {activeTab === "salary" && (
                    <Motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Wage Settings */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                          Wage Settings
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <CustomDropdown
                            label="Wage Type"
                            icon={TrendingUp}
                            placeholder="Select Wage Type"
                            value={newStaff.wageType}
                            onChange={(e) =>
                              setNewStaff({ ...newStaff, wageType: e.target.value })
                            }
                            options={[
                              { value: "Monthly", label: "Monthly" },
                              { value: "Daily", label: "Daily" }
                            ]}
                          />
                          <CustomTextField
                            label={newStaff.wageType === "Daily" ? `Daily Salary (${currencySymbol})` : `Monthly Salary (${currencySymbol})`}
                            icon={TrendingUp}
                            type="number"
                            placeholder={newStaff.wageType === "Daily" ? "e.g. 500" : "e.g. 15000"}
                            value={newStaff.salary}
                            onChange={(e) =>
                              setNewStaff({
                                ...newStaff,
                                salary: e.target.value,
                              })
                            }
                            min="0"
                          />
                          <CustomTextField
                            label={`OT Rate / Hour (${currencySymbol})`}
                            icon={Clock}
                            type="number"
                            placeholder="e.g. 100"
                            value={newStaff.otRatePerHour}
                            onChange={(e) =>
                              setNewStaff({
                                ...newStaff,
                                otRatePerHour: e.target.value,
                              })
                            }
                            min="0"
                          />
                          <CustomTextField
                            label="Paid Leaves / Month"
                            icon={Calendar}
                            type="number"
                            placeholder="e.g. 2"
                            value={newStaff.paidLeaves}
                            onChange={(e) =>
                              setNewStaff({
                                ...newStaff,
                                paidLeaves: e.target.value,
                              })
                            }
                            min="0"
                          />
                        </div>
                      </div>

                      {/* Allowances and Deductions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Allowances */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                              Allowances
                            </h3>
                            <button
                              type="button"
                              onClick={() => setNewStaff({
                                ...newStaff,
                                allowances: [...(newStaff.allowances || []), { name: "", amount: "" }]
                              })}
                              className="text-xs font-bold text-brand-primary hover:text-brand-primary/80 transition-colors"
                            >
                              + Add Allowance
                            </button>
                          </div>
                          {(newStaff.allowances || []).map((allowance, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <div className="flex-1 grid grid-cols-[1fr_1fr_60px] gap-2">
                                <CustomTextField
                                  placeholder="Name (e.g. Food)"
                                  value={allowance.name}
                                  onChange={(e) => {
                                    const newAllowances = [...(newStaff.allowances || [])];
                                    newAllowances[index].name = e.target.value;
                                    setNewStaff({ ...newStaff, allowances: newAllowances });
                                  }}
                                />
                                <CustomTextField
                                  type="number"
                                  placeholder="Amount"
                                  value={allowance.amount}
                                  onChange={(e) => {
                                    const newAllowances = [...(newStaff.allowances || [])];
                                    newAllowances[index].amount = e.target.value;
                                    setNewStaff({ ...newStaff, allowances: newAllowances });
                                  }}
                                />
                                <div className="h-full min-w-[60px]">
                                  <CustomDropdown
                                    value={allowance.isPercentage ? "true" : "false"}
                                    onChange={(e) => {
                                      const newAllowances = [...(newStaff.allowances || [])];
                                      newAllowances[index].isPercentage = e.target.value === "true";
                                      setNewStaff({ ...newStaff, allowances: newAllowances });
                                    }}
                                    options={[
                                      { value: "false", label: currencySymbol },
                                      { value: "true", label: "%" }
                                    ]}
                                    buttonClassName="w-full flex items-center justify-between bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-900 dark:text-gray-100 text-sm font-semibold px-2 py-2.5 rounded-xl outline-none hover:bg-gray-50 dark:hover:bg-dark-card focus:ring-2 focus:ring-brand-primary/20 duration-200"
                                    dropdownClassName="right-0 w-[80px]"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const newAllowances = [...(newStaff.allowances || [])];
                                  newAllowances.splice(index, 1);
                                  setNewStaff({ ...newStaff, allowances: newAllowances });
                                }}
                                className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                          {(!newStaff.allowances || newStaff.allowances.length === 0) && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No allowances added.</p>
                          )}
                        </div>

                        {/* Deductions */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                              Deductions
                            </h3>
                            <button
                              type="button"
                              onClick={() => setNewStaff({
                                ...newStaff,
                                deductions: [...(newStaff.deductions || []), { name: "", amount: "" }]
                              })}
                              className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                            >
                              + Add Deduction
                            </button>
                          </div>
                          {(newStaff.deductions || []).map((deduction, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <div className="flex-1 grid grid-cols-[1fr_1fr_60px] gap-2">
                                <CustomTextField
                                  placeholder="Name (e.g. Tax)"
                                  value={deduction.name}
                                  onChange={(e) => {
                                    const newDeductions = [...(newStaff.deductions || [])];
                                    newDeductions[index].name = e.target.value;
                                    setNewStaff({ ...newStaff, deductions: newDeductions });
                                  }}
                                />
                                <CustomTextField
                                  type="number"
                                  placeholder="Amount"
                                  value={deduction.amount}
                                  onChange={(e) => {
                                    const newDeductions = [...(newStaff.deductions || [])];
                                    newDeductions[index].amount = e.target.value;
                                    setNewStaff({ ...newStaff, deductions: newDeductions });
                                  }}
                                />
                                <div className="h-full min-w-[60px]">
                                  <CustomDropdown
                                    value={deduction.isPercentage ? "true" : "false"}
                                    onChange={(e) => {
                                      const newDeductions = [...(newStaff.deductions || [])];
                                      newDeductions[index].isPercentage = e.target.value === "true";
                                      setNewStaff({ ...newStaff, deductions: newDeductions });
                                    }}
                                    options={[
                                      { value: "false", label: currencySymbol },
                                      { value: "true", label: "%" }
                                    ]}
                                    buttonClassName="w-full flex items-center justify-between bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-900 dark:text-gray-100 text-sm font-semibold px-2 py-2.5 rounded-xl outline-none hover:bg-gray-50 dark:hover:bg-dark-card focus:ring-2 focus:ring-brand-primary/20 duration-200"
                                    dropdownClassName="right-0 w-[80px]"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const newDeductions = [...(newStaff.deductions || [])];
                                  newDeductions.splice(index, 1);
                                  setNewStaff({ ...newStaff, deductions: newDeductions });
                                }}
                                className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                          {(!newStaff.deductions || newStaff.deductions.length === 0) && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No deductions added.</p>
                          )}
                        </div>
                      </div>

                      <hr className="border-gray-200 dark:border-dark-border" />

                      {/* Commission and Incentive Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                            Commission
                          </h3>
                          <CustomTextField
                            label="Commission Percentage"
                            icon={Percent}
                            type="number"
                            placeholder="e.g. 50"
                            value={newStaff.commissionPercentage}
                            onChange={(e) =>
                              setNewStaff({
                                ...newStaff,
                                commissionPercentage: e.target.value,
                              })
                            }
                            min="0"
                            max="100"
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                              Sales Incentive Target
                            </h3>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={newStaff.incentiveEnabled}
                                onChange={(e) =>
                                  setNewStaff({
                                    ...newStaff,
                                    incentiveEnabled: e.target.checked,
                                  })
                                }
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-dark-surface after:border-gray-300 dark:border-dark-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div>
                            </label>
                          </div>
                          
                          {newStaff.incentiveEnabled && (
                            <div className="space-y-3">
                              <CustomTextField
                                label="Target Sales Amount"
                                icon={TrendingUp}
                                type="number"
                                placeholder="e.g. 1000"
                                value={newStaff.incentiveTargetAmount}
                                onChange={(e) =>
                                  setNewStaff({
                                    ...newStaff,
                                    incentiveTargetAmount: e.target.value,
                                  })
                                }
                                min="0"
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <CustomTextField
                                  label="Cycle Days"
                                  icon={Clock}
                                  type="number"
                                  placeholder="e.g. 30"
                                  value={newStaff.incentiveCycleDays}
                                  onChange={(e) =>
                                    setNewStaff({
                                      ...newStaff,
                                      incentiveCycleDays: e.target.value,
                                    })
                                  }
                                  min="0"
                                />
                                {newStaff.incentiveCycleDays > 0 && (
                                  <CustomTextField
                                    label="Cycle Start Date"
                                    icon={Calendar}
                                    type="date"
                                    value={newStaff.incentiveCycleStartDate}
                                    onChange={(e) =>
                                      setNewStaff({
                                        ...newStaff,
                                        incentiveCycleStartDate: e.target.value,
                                      })
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Motion.div>
                  )}

                  {/* Security Tab */}
                  {activeTab === "security" && (
                    <Motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                            Login Credentials
                          </h3>
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                            Optional
                          </span>
                        </div>
                        <div className="bg-gray-50 dark:bg-dark-surface border border-gray-200/80 dark:border-dark-border rounded-xl p-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          Staff login credentials are <span className="font-semibold text-gray-700 dark:text-gray-200">optional</span>. If this team member does not need to log in to the software, you can leave email and password blank and register directly.
                        </div>
                        <CustomTextField
                          label="Email Address (Optional)"
                          icon={Mail}
                          placeholder="email@vijayajalakam.com (Optional)"
                          value={newStaff.email}
                          onChange={(e) =>
                            setNewStaff({ ...newStaff, email: e.target.value })
                          }
                        />
                        <CustomTextField
                          label={`Access Password ${editingStaff ? "(Leave blank to keep current)" : "(Optional)"}`}
                          icon={Lock}
                          placeholder={editingStaff ? "Leave blank to keep current password" : "•••••••• (Optional)"}
                          type="password"
                          value={newStaff.password}
                          onChange={(e) =>
                            setNewStaff({ ...newStaff, password: e.target.value })
                          }
                        />
                      </div>

                      {/* Privilege Selection */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                          Access Control
                        </h3>
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <ShieldCheck size={20} className="text-indigo-600" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-indigo-900 mb-1">
                                Privilege Assignment
                              </p>
                              <p className="text-xs text-indigo-700 leading-relaxed">
                                Assign a privilege to control what features and data this staff member can access. 
                                Leave empty for full access (admin level).
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="relative">
                          <CustomDropdown
                            label="Assign Privilege"
                            icon={ShieldCheck}
                            placeholder="Select privilege (Optional - Full access if empty)"
                            value={newStaff.privilegeId || ""}
                            onChange={(e) =>
                              setNewStaff({ ...newStaff, privilegeId: e.target.value })
                            }
                            options={privileges.map((priv) => ({
                              value: priv._id,
                              label: priv.name,
                              description: priv.description || `${priv.permissions?.length || 0} permissions`,
                            }))}
                            isSearchable={true}
                          />
                          {newStaff.privilegeId && (
                            <button
                              type="button"
                              onClick={() => setNewStaff({ ...newStaff, privilegeId: "" })}
                              className="absolute right-3 top-[38px] p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all z-10"
                              title="Remove privilege assignment"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {newStaff.privilegeId && privileges.length > 0 && (
                          <div className="bg-gray-50 dark:bg-dark-card rounded-xl p-4 space-y-3 border border-gray-200 dark:border-dark-border">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <ShieldCheck size={14} className="text-indigo-600" />
                                Selected Privilege Details
                              </p>
                              <button
                                type="button"
                                onClick={() => setNewStaff({ ...newStaff, privilegeId: "" })}
                                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all"
                                title="Remove privilege"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            {(() => {
                              const selectedPriv = privileges.find(p => p._id === newStaff.privilegeId);
                              if (!selectedPriv) {
                                return (
                                  <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                                    Privilege not found. Please select a valid privilege.
                                  </div>
                                );
                              }
                              return (
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between gap-3 p-3 bg-white dark:bg-dark-surface rounded-lg border border-gray-100 dark:border-dark-border">
                                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Name:</span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-white text-right">{selectedPriv.name}</span>
                                  </div>
                                  {selectedPriv.description && (
                                    <div className="flex items-start justify-between gap-3 p-3 bg-white dark:bg-dark-surface rounded-lg border border-gray-100 dark:border-dark-border">
                                      <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Description:</span>
                                      <span className="text-xs text-gray-700 dark:text-gray-300 text-right flex-1">{selectedPriv.description}</span>
                                    </div>
                                  )}
                                  <div className="flex items-start justify-between gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                    <span className="text-xs text-indigo-700 font-medium">Permissions:</span>
                                    <span className="text-xs font-bold text-indigo-900">
                                      {selectedPriv.permissions?.length || 0} granted
                                    </span>
                                  </div>
                                  {selectedPriv.permissions && selectedPriv.permissions.length > 0 && (
                                    <div className="p-3 bg-white dark:bg-dark-surface rounded-lg border border-gray-100 dark:border-dark-border">
                                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Granted Permissions:</p>
                                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                        {selectedPriv.permissions.slice(0, 15).map((perm, idx) => (
                                          <span 
                                            key={idx}
                                            className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-medium rounded-md border border-indigo-100"
                                          >
                                            {perm.split(':').map(part => 
                                              part.charAt(0).toUpperCase() + part.slice(1).replace(/_/g, ' ')
                                            ).join(' > ')}
                                          </span>
                                        ))}
                                        {selectedPriv.permissions.length > 15 && (
                                          <span className="px-2 py-1 bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-md">
                                            +{selectedPriv.permissions.length - 15} more
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {!newStaff.privilegeId && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <ShieldCheck size={16} className="text-amber-600" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-amber-900 mb-1">
                                  Full Access Mode
                                </p>
                                <p className="text-xs text-amber-700 leading-relaxed">
                                  No privilege assigned. This staff member will have full admin-level access to all features.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Motion.div>
                  )}

                  {/* Education & Qualification Tab */}
                  {activeTab === "education" && (
                    <Motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                            Education & Qualifications
                          </h3>
                          <button
                            type="button"
                            onClick={handleAddQualification}
                            className="px-3 py-1.5 bg-brand-primary text-white text-xs font-bold rounded-lg hover:bg-brand-secondary transition-all flex items-center gap-1.5"
                          >
                            <GraduationCap size={14} />
                            Add Qualification
                          </button>
                        </div>

                        {qualifications.length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 dark:bg-dark-card rounded-xl border-2 border-dashed border-gray-200 dark:border-dark-border">
                            <GraduationCap size={48} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                              No qualifications added yet
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              Click "Add Qualification" to add education details
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {qualifications.map((qual, index) => (
                              <div
                                key={qual.id}
                                className="p-4 bg-gray-50 dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border space-y-3"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                    Qualification #{index + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveQualification(qual.id)}
                                    className="text-red-500 hover:text-red-600 transition-colors"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                  <CustomTextField
                                    label="Degree / Certification"
                                    icon={GraduationCap}
                                    placeholder="e.g. Bachelor of Science"
                                    value={qual.degree}
                                    onChange={(e) =>
                                      handleQualificationChange(
                                        qual.id,
                                        "degree",
                                        e.target.value
                                      )
                                    }
                                  />
                                  <CustomTextField
                                    label="Institution / University"
                                    icon={FileText}
                                    placeholder="e.g. Harvard University"
                                    value={qual.institution}
                                    onChange={(e) =>
                                      handleQualificationChange(
                                        qual.id,
                                        "institution",
                                        e.target.value
                                      )
                                    }
                                  />
                                  <CustomTextField
                                    label="Year of Completion"
                                    icon={Calendar}
                                    type="number"
                                    placeholder="e.g. 2020"
                                    value={qual.year}
                                    onChange={(e) =>
                                      handleQualificationChange(
                                        qual.id,
                                        "year",
                                        e.target.value
                                      )
                                    }
                                    min="1950"
                                    max={new Date().getFullYear()}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
                            Staff Documents
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
                              Click "Add Document" to upload staff documents
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
                                    placeholder="e.g. AADHAR123"
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
                                    placeholder="e.g. Aadhar Card"
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
                                        <p className="text-[10px] text-brand-primary dark:text-blue-400 font-bold ml-1 uppercase tracking-tight">{getFileSizeHint()}</p>
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

                  {/* Shifts Tab */}
                  {activeTab === "shifts" && (
                    <Motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4 flex items-start gap-3">
                        <CalendarClock className="text-brand-primary dark:text-blue-400 shrink-0 mt-0.5" size={20} />
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Weekly Shifts Schedule</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Configure working hours and shift types for each day of the week.</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {newStaff.shifts?.map((shift, index) => (
                          <div key={shift.day} className={`flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-xl border transition-colors ${shift.active ? 'bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border' : 'bg-gray-50 dark:bg-dark-card border-gray-100 dark:border-dark-border opacity-70'}`}>
                            {/* Day Toggle */}
                            <div className="flex items-center gap-3 md:w-32 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const newShifts = [...newStaff.shifts];
                                  newShifts[index] = { ...newShifts[index], active: !newShifts[index].active };
                                  setNewStaff({ ...newStaff, shifts: newShifts });
                                }}
                                className={`w-10 h-5 rounded-full relative transition-colors ${shift.active ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                              >
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white dark:bg-dark-surface transition-transform ${shift.active ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                              <span className={`text-sm font-bold ${shift.active ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{shift.day}</span>
                            </div>

                            {/* Shift Type, Start & End Time */}
                            <div className="flex flex-1 items-center gap-3 flex-wrap sm:flex-nowrap">
                              <div className="flex-1 min-w-[120px]">
                                <CustomDropdown
                                  disabled={!shift.active}
                                  value={shift.shiftType}
                                  onChange={(e) => {
                                    const newShifts = [...newStaff.shifts];
                                    newShifts[index] = { ...newShifts[index], shiftType: e.target.value };
                                    setNewStaff({ ...newStaff, shifts: newShifts });
                                  }}
                                  options={[
                                    { value: "Day Shift", label: "Day Shift" },
                                    { value: "Night Shift", label: "Night Shift" },
                                    { value: "Morning Shift", label: "Morning Shift" },
                                    { value: "Evening Shift", label: "Evening Shift" },
                                  ]}
                                  buttonClassName="w-full h-10 px-3 bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between outline-none hover:bg-gray-100 dark:hover:bg-dark-surface focus:ring-2 focus:ring-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed duration-200"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="time"
                                  disabled={!shift.active}
                                  value={shift.startTime}
                                  onChange={(e) => {
                                    const newShifts = [...newStaff.shifts];
                                    newShifts[index] = { ...newShifts[index], startTime: e.target.value };
                                    setNewStaff({ ...newStaff, shifts: newShifts });
                                  }}
                                  className="h-10 px-3 bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-primary disabled:opacity-50"
                                />
                                <span className="text-gray-400 dark:text-gray-500 font-medium text-sm">to</span>
                                <input
                                  type="time"
                                  disabled={!shift.active}
                                  value={shift.endTime}
                                  onChange={(e) => {
                                    const newShifts = [...newStaff.shifts];
                                    newShifts[index] = { ...newShifts[index], endTime: e.target.value };
                                    setNewStaff({ ...newStaff, shifts: newShifts });
                                  }}
                                  className="h-10 px-3 bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand-primary disabled:opacity-50"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Motion.div>
                  )}
                  
                  {/* Reviews Tab */}
                  {activeTab === "reviews" && editingStaff && (
                    <StaffReviewsTab staffId={editingStaff._id} />
                  )}
                </form>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddOrUpdateStaff}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-medium rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{editingStaff ? "Updating..." : "Registering..."}</span>
                    </>
                  ) : (
                    <span>{editingStaff ? "Update Staff" : "Register Staff"}</span>
                  )}
                </button>
              </div>
            </Motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setStaffToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${staffToDelete?.name} from the team? This will revoke their access to the system.`}
        confirmLabel="Remove Member"
      />

      <UploadStaffModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        showSnack={showSnack}
        onUploadSuccess={refetch}
      />

      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Remove Selected Team Members"
        message={`Are you sure you want to remove ${selectedIds.length} staff members? This will revoke their access to the system.`}
        confirmLabel={`Remove ${selectedIds.length} Members`}
      />
    </div>
  );
};

export default StaffManager;
