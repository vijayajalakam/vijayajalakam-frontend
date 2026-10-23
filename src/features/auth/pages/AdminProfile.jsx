import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  Building2,
  Globe,
  MessageCircle,
  Camera,
  Shield,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Infinity as InfinityIcon,
  Sparkles,
  LogOut,
  Store,
  Plus,
  Edit2,
  Trash2,
  Users,
  Navigation,
} from "lucide-react";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import Modal from "../../../components/shared/Modal";

import {
  useGetAdminProfileQuery,
  useUpdateSalonProfileWithImageMutation,
  useGetShopsListQuery,
  useCreateShopMutation,
  useUpdateShopMutation,
  useDeleteShopMutation,
} from "../../../store/api/tenantCrudEndpoints";
import CustomTextField from "../../../components/shared/CustomTextField";
import { ProfileSkeleton } from "../../../components/shared/Skeleton";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import Snackbar from "../../../components/shared/Snackbar";
import {
  validateFileSize,
  getFileSizeHint,
} from "../../../utils/fileUploadUtils";



/* ─── Avatar Upload ──────────────────────────────────────────── */
const AvatarUpload = ({ previewImage, onImageChange, salonName }) => {
  const initials = salonName
    ? salonName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SH";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <div className="w-28 h-28 rounded-2xl overflow-hidden ring-4 ring-white shadow-lg bg-gradient-to-br from-brand-primary/20 to-blue-100">
          {previewImage ? (
            <img
              src={previewImage}
              alt="Shop Logo"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-primary to-blue-600">
              <span className="text-white text-3xl font-bold">{initials}</span>
            </div>
          )}
        </div>
        <label
          htmlFor="logo-upload"
          className="absolute -bottom-2 -right-2 p-2 bg-brand-primary text-white rounded-xl cursor-pointer shadow-md hover:bg-brand-secondary transition-colors ring-2 ring-white"
        >
          <Camera size={14} />
          <input
            type="file"
            id="logo-upload"
            accept="image/*"
            className="hidden"
            onChange={onImageChange}
          />
        </label>
      </div>
      <p className="text-[10px] text-brand-primary dark:text-blue-400 font-bold uppercase tracking-tight mt-1">
        {getFileSizeHint()}
      </p>
    </div>
  );
};

/* ─── Section wrapper ────────────────────────────────────────── */
const Section = ({
  title,
  icon: Icon,
  delay = 0,
  children,
  cols = 3,
  action,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border p-6"
  >
    <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100 dark:border-dark-border">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary dark:text-blue-400">
          <Icon size={18} />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          {title}
        </h3>
      </div>
      {action && <div>{action}</div>}
    </div>
    <div className={cols ? `grid grid-cols-1 md:grid-cols-${cols} gap-5` : ""}>
      {children}
    </div>
  </motion.div>
);

/* ─── Main Component ─────────────────────────────────────────── */
const AdminProfile = () => {
  const {
    hasPermission,
    salonConfig,
    user: authUser,
    logout,
    isAdmin,
  } = useAuth();
  const { data: profileData, isLoading: initialLoading } = useGetAdminProfileQuery();
  const { data: shops = [], isLoading: branchLoading } = useGetShopsListQuery();
  const [updateSalonProfile, { isLoading: loading }] = useUpdateSalonProfileWithImageMutation();
  const [createShop] = useCreateShopMutation();
  const [updateShop] = useUpdateShopMutation();
  const [deleteShop] = useDeleteShopMutation();

  const [formData, setFormData] = useState({
    salonName: "",
    ownerName: "",
    country: "",
    state: "",
    area: "",
    zipCode: "",
    mobile: "",
    whatsapp: "",
    ownerWhatsappNumbers: [],
    email: "",
    aboutText: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [snack, setSnack] = useState({ message: "", type: "success" });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Branch States
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState(null);
  const [branchFormData, setBranchFormData] = useState({
    name: "",
    address: "",
    phone: "",
    gstNumber: "",
    panNumber: "",
    licenseNumber: "",
    latitude: "",
    longitude: "",
    mapAddress: "",
    image: null,
  });
  const [branchPreview, setBranchPreview] = useState(null);
  const [branchDeleteModal, setBranchDeleteModal] = useState({
    isOpen: false,
    id: null,
    name: "",
  });

  const showSnack = (message, type = "success") => setSnack({ message, type });

  const isShopAdmin = isAdmin || authUser?.role === "SHOP_ADMIN";
  const canEditProfile =
    isShopAdmin || hasPermission("settings:profile:general:edit");
  const canAddBranch = false;
  const canEditBranch =
    isShopAdmin || hasPermission("settings:profile:general:edit");
  const canDeleteBranch = false;

  useEffect(() => {
    if (profileData) {
      const { user, salon, logo } = profileData;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        salonName: salon?.salonName || "",
        ownerName: salon?.ownerName || "",
        country: salon?.country || "",
        state: salon?.state || "",
        area: salon?.area || "",
        zipCode: salon?.zipCode || "",
        mobile: user?.phone || "",
        whatsapp: salon?.whatsapp || "",
        ownerWhatsappNumbers: salon?.ownerWhatsappNumbers || [],
        email: user?.email || "",
        aboutText: salon?.aboutText || "",
      });
      if (logo) setPreviewImage(logo);
    }
  }, [profileData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === "ownerWhatsappNumbers") {
          data.append(key, JSON.stringify(formData[key]));
        } else {
          data.append(key, formData[key]);
        }
      });
      data.append("name", formData.ownerName);
      data.append("phone", formData.mobile);
      if (imageFile) data.append("image", imageFile);

      await updateSalonProfile(data).unwrap();
      showSnack("Profile updated successfully!", "success");
    } catch (err) {
      showSnack(
        err?.data?.message || err?.message || "Failed to update profile",
        "error"
      );
    }
  };

  // Branch Logic
  const handleEditBranch = (branch = null) => {
    if (branch) {
      setCurrentBranch(branch);
      setBranchFormData({
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        gstNumber: branch.gstNumber || "",
        panNumber: branch.panNumber || "",
        licenseNumber: branch.licenseNumber || "",
        latitude: branch.latitude || "",
        longitude: branch.longitude || "",
        mapAddress: branch.mapAddress || "",
        image: null,
      });
      setBranchPreview(
        branch.image?.url ||
          (typeof branch.image === "string" ? branch.image : null),
      );
    } else {
      setBranchFormData({
        name: formData.salonName,
        address: `${formData.area}, ${formData.state}, ${formData.country}`,
        phone: formData.mobile,
        gstNumber: "",
        panNumber: "",
        licenseNumber: "",
        latitude: "",
        longitude: "",
        mapAddress: "",
        image: null,
      });
      setBranchPreview(null);
      setCurrentBranch(null);
    }
    setIsBranchModalOpen(true);
  };

  const handleBranchImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validation = validateFileSize(file);
      if (!validation.isValid) {
        showSnack(validation.message, "error");
        return;
      }
      setBranchFormData({ ...branchFormData, image: file });
      setBranchPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitBranch = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.keys(branchFormData).forEach((key) => {
        if (key === "image" && branchFormData[key])
          data.append(key, branchFormData[key]);
        else if (key !== "image") data.append(key, branchFormData[key]);
      });

      if (currentBranch) {
        await updateShop({ id: currentBranch._id, formData: data }).unwrap();
      } else {
        await createShop(data).unwrap();
      }
      setIsBranchModalOpen(false);
      showSnack(currentBranch ? "Branch updated" : "Branch created", "success");
    } catch (err) {
      showSnack(
        err?.data?.message || err?.message || "Failed to save branch",
        "error"
      );
    }
  };

  const confirmDeleteBranch = (id, name) =>
    setBranchDeleteModal({ isOpen: true, id, name });

  const handleConfirmDeleteBranch = async () => {
    try {
      await deleteShop(branchDeleteModal.id).unwrap();
      setBranchDeleteModal({ isOpen: false, id: null, name: "" });
      showSnack("Branch deleted", "success");
    } catch (err) {
      showSnack(err?.data?.message || err?.message || "Failed to delete branch", "error");
    }
  };

  if (initialLoading) return <ProfileSkeleton />;

  return (
    <div className="space-y-3 md:space-y-6">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border p-6"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <AvatarUpload
              previewImage={previewImage}
              onImageChange={handleImageChange}
              salonName={formData.salonName}
            />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {formData.salonName || "Your Shop"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {formData.ownerName || authUser?.name || "Owner"}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                {formData.email}
              </p>
              <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
                {formData.country && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-dark-border rounded-lg text-xs text-gray-600 dark:text-gray-300">
                    <Globe size={11} /> {formData.country}
                  </span>
                )}
                {formData.mobile && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-dark-border rounded-lg text-xs text-gray-600 dark:text-gray-300">
                    <Phone size={11} /> {formData.mobile}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={loading || !canEditProfile}
                className={`flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 transition-all ${!canEditProfile || loading ? "opacity-50 cursor-not-allowed" : "hover:bg-brand-secondary"}`}
              >
                <Save size={16} />
                {loading ? "Saving..." : "Save Changes"}
              </motion.button>
            </div>
          </div>
        </motion.div>

        <Section title="Business Information" icon={Building2} delay={0.2}>
          <CustomTextField
            label="Shop Name"
            name="salonName"
            value={formData.salonName}
            onChange={handleChange}
            icon={Building2}
            placeholder="Enter shop name"
          />
          <CustomTextField
            label="Owner Name"
            name="ownerName"
            value={formData.ownerName}
            onChange={handleChange}
            icon={User}
            placeholder="Enter owner name"
          />
          <CustomTextField
            label="Country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            icon={Globe}
            placeholder="Country"
          />
          <CustomTextField
            label="State"
            name="state"
            value={formData.state}
            onChange={handleChange}
            icon={MapPin}
            placeholder="State"
          />
          <CustomTextField
            label="Area / City"
            name="area"
            value={formData.area}
            onChange={handleChange}
            icon={MapPin}
            placeholder="Area"
          />
          <CustomTextField
            label="Zip Code"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleChange}
            icon={MapPin}
            placeholder="Zip Code"
          />
        </Section>

        <Section title="Contact Information" icon={Phone} delay={0.25}>
          <CustomTextField
            label="Mobile Number"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            icon={Phone}
            placeholder="Enter mobile number"
          />
          <CustomTextField
            label="WhatsApp Number"
            name="whatsapp"
            value={formData.whatsapp}
            onChange={handleChange}
            icon={MessageCircle}
            placeholder="Enter WhatsApp number"
          />
          <CustomTextField
            label="Email Address"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled
            icon={Mail}
            placeholder="Email address"
          />
        </Section>

        <Section title="Owner WhatsApp Numbers" icon={MessageCircle} delay={0.25} cols={0}>
          <div className="w-full">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              WhatsApp Numbers for Day Closing Reports
            </label>
            <div className="space-y-3">
              {(formData.ownerWhatsappNumbers || []).map((num, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Phone size={16} />
                    </div>
                    <input
                      type="text"
                      value={num}
                      onChange={(e) => {
                        const newNums = [...(formData.ownerWhatsappNumbers || [])];
                        newNums[idx] = e.target.value;
                        setFormData({ ...formData, ownerWhatsappNumbers: newNums });
                      }}
                      placeholder="e.g. +919876543210"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newNums = [...(formData.ownerWhatsappNumbers || [])];
                      newNums.splice(idx, 1);
                      setFormData({ ...formData, ownerWhatsappNumbers: newNums });
                    }}
                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    ownerWhatsappNumbers: [...(formData.ownerWhatsappNumbers || []), ""],
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-brand-primary dark:text-blue-400 bg-brand-primary/10 hover:bg-brand-primary hover:text-white rounded-xl transition-all"
              >
                <Plus size={16} /> Add WhatsApp Number
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Add multiple owner WhatsApp numbers to receive the Day Closing Report directly via WhatsApp.
            </p>
          </div>
        </Section>

        {/* About Section */}
        <Section title="About Your Shop" icon={Building2} delay={0.25} cols={0}>
          <div className="w-full">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              About Text
            </label>
            <textarea
              name="aboutText"
              value={formData.aboutText}
              onChange={handleChange}
              rows={4}
              placeholder={`At ${formData.salonName || "your shop"}, we prioritize delivering an exceptional experience...`}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary resize-none transition-all"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">This text will be shown in the "About" section on your shop's public page. Leave empty for a default message.</p>
          </div>
        </Section>
      </form>

      {/* Salon Location & Contact Section */}
      <Section
        title="Salon Location & Contact"
        icon={Store}
        delay={0.3}
        cols={0}
        action={
          canAddBranch && (
            <button
              onClick={() => handleEditBranch()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary/10 text-brand-primary dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-brand-primary hover:text-white transition-all"
            >
              <Plus size={14} /> Add Branch
            </button>
          )
        }
      >
        {branchLoading ? (
          <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm italic">
            Loading branches...
          </div>
        ) : shops.length === 0 ? (
          <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm border-2 border-dashed border-gray-100 dark:border-dark-border rounded-2xl">
            No branches found. Start by adding one.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shops.map((shop) => (
              <div
                key={shop._id}
                className="bg-gray-50/50 dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl group transition-all hover:border-brand-primary/30 hover:shadow-md overflow-hidden"
              >
                {/* Map Preview */}
                {shop.latitude && shop.longitude && (
                  <div className="w-full h-[120px] relative">
                    <iframe
                      title={`${shop.name} location`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://www.google.com/maps?q=${shop.latitude},${shop.longitude}&z=15&output=embed`}
                    ></iframe>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary dark:text-blue-400 overflow-hidden shrink-0">
                      {shop.image?.url ? (
                        <img
                          src={shop.image.url}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Store size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {shop.name}
                      </h4>
                      <p className="text-[10px] text-brand-primary dark:text-blue-400 font-bold mt-1 flex items-center gap-1">
                        <Phone size={10} /> {shop.phone}
                      </p>
                      {shop.mapAddress && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 mt-1">
                          <MapPin size={10} /> {shop.mapAddress}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {canEditBranch && (
                        <button
                          onClick={() => handleEditBranch(shop)}
                          className="p-1.5 bg-white dark:bg-dark-border text-gray-400 hover:text-brand-primary dark:text-blue-400 rounded-lg shadow-sm border border-gray-100 dark:border-dark-border"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                      {canDeleteBranch && (
                        <button
                          onClick={() => confirmDeleteBranch(shop._id, shop.name)}
                          className="p-1.5 bg-white dark:bg-dark-border text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-lg shadow-sm border border-gray-100 dark:border-dark-border"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border divide-y sm:divide-y-0 sm:divide-x sm:flex sm:flex-row divide-gray-100 dark:divide-dark-border"
      >
        <div className="p-6 flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Subscription</span>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
              {!salonConfig?.planExpiryDate ? "Lifetime" : "Active"}
            </span>
          </div>
          {!salonConfig?.planExpiryDate ? (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
              <Sparkles size={14} className="text-violet-500" />
              <span>No expiry — enjoy forever</span>
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Expires <span className="font-medium text-gray-700 dark:text-gray-300">{new Date(salonConfig.planExpiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </p>
          )}
        </div>

        <div className="p-6 flex items-center justify-between flex-1">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">Sign out</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Logout from your account safely.</p>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-2.5 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-xl transition-all"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </motion.div>

      {/* Branch Modal */}
      <Modal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        title={currentBranch ? "Edit Branch" : "Add Branch"}
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setIsBranchModalOpen(false)}
              className="flex-1 h-11 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitBranch}
              className="flex-1 h-11 bg-brand-primary text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-brand-primary/20 hover:bg-brand-secondary"
            >
              Save Branch
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <CustomTextField
            label="Branch Name"
            icon={Store}
            placeholder="e.g. Main Branch"
            value={branchFormData.name}
            onChange={(e) =>
              setBranchFormData({ ...branchFormData, name: e.target.value })
            }
          />
          <CustomTextField
            label="Phone"
            icon={Phone}
            placeholder="Phone number"
            value={branchFormData.phone}
            onChange={(e) =>
              setBranchFormData({ ...branchFormData, phone: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <CustomTextField
              label="GST Number"
              value={branchFormData.gstNumber}
              onChange={(e) =>
                setBranchFormData({
                  ...branchFormData,
                  gstNumber: e.target.value,
                })
              }
            />
            <CustomTextField
              label="PAN Number"
              value={branchFormData.panNumber}
              onChange={(e) =>
                setBranchFormData({
                  ...branchFormData,
                  panNumber: e.target.value,
                })
              }
            />
          </div>

          <CustomTextField
            label="Licence Number"
            value={branchFormData.licenseNumber}
            onChange={(e) =>
              setBranchFormData({
                ...branchFormData,
                licenseNumber: e.target.value,
              })
            }
          />

          {/* Google Map Location */}
          <div className="pt-3 pb-1">
            <div className="flex items-center gap-2 mb-3 text-brand-primary dark:text-blue-400">
              <Navigation size={16} />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Map Location
              </span>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-dark-card/80 rounded-xl border border-gray-100 dark:border-dark-border space-y-3">
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Add coordinates so customers can get directions. Right-click on{" "}
                <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-brand-primary dark:text-blue-400 underline">Google Maps</a>{" "}
                → copy coordinates.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <CustomTextField
                  label="Latitude"
                  placeholder="e.g. 13.0358"
                  value={branchFormData.latitude}
                  onChange={(e) =>
                    setBranchFormData({ ...branchFormData, latitude: e.target.value })
                  }
                />
                <CustomTextField
                  label="Longitude"
                  placeholder="e.g. 77.5970"
                  value={branchFormData.longitude}
                  onChange={(e) =>
                    setBranchFormData({ ...branchFormData, longitude: e.target.value })
                  }
                />
              </div>
              {branchFormData.latitude && branchFormData.longitude && !branchFormData.mapAddress && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${branchFormData.latitude}&lon=${branchFormData.longitude}&zoom=16&addressdetails=1`
                      );
                      const data = await res.json();
                      if (data?.address) {
                        const { road, suburb, city, town, village, state, country } = data.address;
                        const parts = [road || suburb, city || town || village, state, country].filter(Boolean);
                        setBranchFormData({ ...branchFormData, mapAddress: parts.join(", ") });
                      }
                    } catch (err) {
                      console.error("Reverse geocoding failed:", err);
                    }
                  }}
                  className="w-full py-2 text-xs font-bold text-brand-primary dark:text-blue-400 bg-brand-primary/5 border border-brand-primary/20 rounded-lg hover:bg-brand-primary/10 transition-all"
                >
                   Auto-detect address from coordinates
                </button>
              )}
              <CustomTextField
                label="Map Display Address"
                icon={MapPin}
                placeholder="e.g. Sahakar Nagar Main Road, Bengaluru"
                value={branchFormData.mapAddress}
                onChange={(e) =>
                  setBranchFormData({ ...branchFormData, mapAddress: e.target.value })
                }
              />
              {branchFormData.latitude && branchFormData.longitude && (
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border mt-2">
                  <iframe
                    title="Branch Location Preview"
                    width="100%"
                    height="160"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://www.google.com/maps?q=${branchFormData.latitude},${branchFormData.longitude}&z=15&output=embed`}
                  ></iframe>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest">
              Branch Photo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gray-50 dark:bg-dark-card border-2 border-dashed border-gray-200 dark:border-dark-border flex items-center justify-center overflow-hidden">
                {branchPreview ? (
                  <img
                    src={branchPreview}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera size={20} className="text-gray-300" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleBranchImageChange}
                className="text-xs text-gray-500 dark:text-gray-400"
              />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={branchDeleteModal.isOpen}
        onClose={() =>
          setBranchDeleteModal({ isOpen: false, id: null, name: "" })
        }
        onConfirm={handleConfirmDeleteBranch}
        title="Delete Branch"
        message={`Are you sure you want to delete ${branchDeleteModal.name}? This action cannot be undone.`}
        type="danger"
      />

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Sign Out"
        confirmLabel="Sign Out"
        message="Are you sure you want to sign out?"
        type="danger"
      />
    </div>
  );
};

export default AdminProfile;
