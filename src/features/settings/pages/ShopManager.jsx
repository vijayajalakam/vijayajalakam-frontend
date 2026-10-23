import { useEffect, useState } from "react";
import api from "../../../api/axiosInstance";
import {
  ShopSkeleton,
  StatsSkeleton,
} from "../../../components/shared/Skeleton";
import StatsGrid from "../../../components/shared/StatsGrid";
import {
  Store,
  MapPin,
  Phone,
  Edit2,
  Trash2,
  Users,
  Plus,
  Building2,
  Camera,
  Shield,
  Navigation,
} from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { motion as Motion, AnimatePresence } from "framer-motion";
import Modal from "../../../components/shared/Modal";
import CustomTextField from "../../../components/shared/CustomTextField";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import CustomTable from "../../../components/shared/CustomTable";
import Snackbar from "../../../components/shared/Snackbar";
import { validateFileSize, getFileSizeHint } from "../../../utils/fileUploadUtils";
import PageHeader from "../../../components/shared/PageHeader";

const ShopManager = () => {
  const { user, hasPermission } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canManageBranches = isSuperAdmin; // Removed isShopAdmin to enforce granular privileges
  const [shops, setShops] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentShop, setCurrentShop] = useState(null);
  const [formData, setFormData] = useState({
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
  const [previewImage, setPreviewImage] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    shopId: null,
    shopName: "",
  });
  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const fetchShops = async () => {
    try {
      setLoading(true);
      const res = await api.get("/shops");
      if (res.data.success) {
        setShops(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      // alert('Failed to fetch shops'); // Suppress alert on load
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminProfile = async () => {
    try {
      const res = await api.get("/admin/profile");
      if (res.data.success) {
        setAdminProfile(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch admin profile:", err);
    }
  };

  const confirmDelete = (shopId, shopName) => {
    setDeleteModal({
      isOpen: true,
      shopId: shopId,
      shopName: shopName,
    });
  };

  const handleConfirmDelete = async () => {
    if (!canManageBranches && !hasPermission("settings:branches:general:delete")) {
      showSnack("Permission denied", "error");
      return;
    }
    try {
      await api.delete(`/shops/${deleteModal.shopId}`);
      setDeleteModal({ isOpen: false, shopId: null, shopName: "" });
      fetchShops();
      showSnack("Shop deleted successfully", "success");
    } catch (err) {
      console.error(err);
      showSnack(
        err.response?.data?.message || "Failed to delete shop",
        "error",
      );
    }
  };

  useEffect(() => {
    fetchShops();
    fetchAdminProfile();
  }, []);

  const resetForm = () => {
    setFormData({
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
    setPreviewImage(null);
    setCurrentShop(null);
  };

  const handleEdit = (shop = null) => {
    if (shop) {
      setCurrentShop(shop);
      setFormData({
        name: shop.name,
        address: shop.address,
        phone: shop.phone,
        gstNumber: shop.gstNumber || "",
        panNumber: shop.panNumber || "",
        licenseNumber: shop.licenseNumber || "",
        latitude: shop.latitude || "",
        longitude: shop.longitude || "",
        mapAddress: shop.mapAddress || "",
        image: null,
      });
      setPreviewImage(
        shop.image?.url || (typeof shop.image === "string" ? shop.image : null),
      );
    } else {
      resetForm();
      if (adminProfile) {
        const { salon, user: authUser } = adminProfile;
        const fullAddress = [
          salon?.area,
          salon?.state,
          salon?.country,
          salon?.zipCode,
        ]
          .filter(Boolean)
          .join(", ");

        setFormData((prev) => ({
          ...prev,
          name: salon?.shopName || "",
          address: fullAddress || "",
          phone: authUser?.phone || "",
        }));
      }
    }
    setIsModalOpen(true);
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
      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const canSubmit = currentShop
      ? canManageBranches || hasPermission("settings:branches:general:edit")
      : canManageBranches || hasPermission("settings:branches:general:add");
    if (!canSubmit) {
      showSnack("Permission denied", "error");
      return;
    }
    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("address", formData.address);
      data.append("phone", formData.phone);
      data.append("gstNumber", formData.gstNumber);
      data.append("panNumber", formData.panNumber);
      data.append("licenseNumber", formData.licenseNumber);
      if (formData.latitude) data.append("latitude", formData.latitude);
      if (formData.longitude) data.append("longitude", formData.longitude);
      if (formData.mapAddress) data.append("mapAddress", formData.mapAddress);
      if (formData.image) {
        data.append("image", formData.image);
      }

      if (currentShop) {
        await api.put(`/shops/${currentShop._id}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/shops", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setIsModalOpen(false);
      fetchShops();
      resetForm();
      showSnack(
        currentShop ? "Shop updated successfully" : "Shop created successfully",
        "success",
      );
    } catch (err) {
      console.error(err);
      showSnack(err.response?.data?.message || "Failed to save shop", "error");
    }
  };

  return (
    <div className="space-y-3 md:space-y-6">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />
      {loading ? (
        <ShopSkeleton count={3} />
      ) : (
        <Motion.div
          key="grid-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {shops?.map((shop, idx) => (
            <Motion.div
              key={shop._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white dark:bg-dark-surface rounded-[1.2rem] border border-gray-100 dark:border-dark-border overflow-hidden transition-all duration-300 group flex flex-col h-full shadow-none hover:border-brand-primary/20 hover:shadow-xl hover:shadow-brand-primary/5"
            >
              <div className="h-48 overflow-hidden relative bg-gray-50 dark:bg-dark-card/30">
                {shop.image &&
                  (shop.image.url || typeof shop.image === "string") &&
                  shop.image !== "no-photo.jpg" ? (
                  <img
                    src={shop.image.url || shop.image}
                    alt={shop.name}
                    className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src="https://png.pngtree.com/png-vector/20220119/ourmid/pngtree-crossed-camera-icon-image-is-not-available-message-restriction-forbidden-vector-png-image_44027682.jpg"
                      alt="No Image"
                      className="w-32 h-32 object-contain grayscale-[0.2] transition-all duration-700 opacity-20"
                    />
                  </div>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-2.5 py-1 bg-white dark:bg-dark-surface/90 backdrop-blur-md text-brand-primary dark:text-blue-400 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-brand-primary/10 shadow-sm leading-none flex items-center">
                    {shop.shopSlug || "BRANCH"}
                  </span>
                  <div
                    className={`px-2.5 py-1 backdrop-blur-md rounded-full border shadow-sm leading-none flex items-center gap-1.5 ${shop.isActive ? "bg-emerald-500/90 border-emerald-500/20 text-white" : "bg-gray-500/90 border-gray-500/20 text-white"}`}
                  >
                    <div
                      className={`w-1 h-1 rounded-full bg-current ${shop.isActive ? "animate-pulse" : ""}`}
                    />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                      {shop.isActive ? "Live" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 truncate tracking-tight group-hover:text-brand-primary transition-colors">
                    {shop.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                    <MapPin size={10} className="shrink-0" />
                    <span className="text-[10px] font-medium truncate uppercase tracking-widest">
                      {shop.mapAddress || "Location not specified"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5 bg-gray-50 dark:bg-dark-card/50 p-2 rounded-xl border border-gray-100 dark:border-dark-border/50">
                      <p className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">
                        Mobile
                      </p>
                      <p className="text-[11px] font-black text-gray-900 dark:text-white truncate">
                        {shop.phone}
                      </p>
                    </div>
                    <div className="space-y-0.5 bg-gray-50 dark:bg-dark-card/50 p-2 rounded-xl border border-gray-100 dark:border-dark-border/50">
                      <p className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">
                        Team
                      </p>
                      <p className="text-[11px] font-black text-gray-900 dark:text-white">
                        {shop.staffCount || 0} Professionals
                      </p>
                    </div>
                  </div>

                  {/* Legal Section */}
                  <div className="bg-gray-50 dark:bg-dark-card/50 rounded-[0.8rem] border border-gray-100 dark:border-dark-border/50 overflow-hidden">
                    <div className="bg-gray-100 dark:bg-dark-card/30 px-3 py-1.5 border-b border-gray-100 dark:border-dark-border/50">
                      <span className="text-[9px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-[0.15em]">
                        Registration & Legal Details
                      </span>
                    </div>
                    <div className="p-3 grid grid-cols-1 gap-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                          GST
                        </span>
                        <span className="text-gray-900 dark:text-white font-black">
                          {shop.gstNumber || "Not Provided"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                          PAN
                        </span>
                        <span className="text-gray-900 dark:text-white font-black">
                          {shop.panNumber || "Not Provided"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                          License
                        </span>
                        <span className="text-gray-900 dark:text-white font-black">
                          {shop.licenseNumber || "Not Provided"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-dark-border mt-4">
                  {(canManageBranches || hasPermission("settings:branches:general:edit")) && (
                    <button
                      onClick={() => handleEdit(shop)}
                      className="flex-1 h-10 bg-brand-primary/5 text-brand-primary dark:text-blue-400 font-bold text-[11px] uppercase tracking-wider rounded-xl hover:bg-brand-primary hover:text-white transition-all active:scale-95 border border-brand-primary/10 shadow-sm"
                    >
                      Manage Settings
                    </button>
                  )}
                  {(canManageBranches || hasPermission("settings:branches:general:delete")) && (
                    <button
                      onClick={() => confirmDelete(shop._id, shop.name)}
                      className="h-10 px-4 bg-red-50 text-red-500 font-bold text-[11px] uppercase tracking-wider rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95 border border-red-100 shadow-sm"
                      title="Delete Branch"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </Motion.div>
          ))}
        </Motion.div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentShop ? "Edit Branch" : "Add New Branch"}
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
              onClick={handleSubmit}
              className="flex-1 px-4 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-medium rounded-lg transition-all active:scale-95"
            >
              {currentShop ? "Save Changes" : "Create Branch"}
            </button>
          </div>
        }
      >
        <form className="space-y-5">
          <CustomTextField
            label="Branch Name"
            icon={Store}
            placeholder="e.g. Downtown Branch"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <CustomTextField
            label="Phone Number"
            icon={Phone}
            placeholder="Phone Number"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            required
          />

          <div className="pt-4 pb-2">
            <div className="flex items-center gap-2 mb-4 text-brand-primary dark:text-blue-400">
              <Shield size={18} />
              <h3 className="font-bold text-sm uppercase tracking-wider">
                Legal Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-dark-card/50 rounded-2xl border border-gray-100 dark:border-dark-border">
              <CustomTextField
                label="GST Number"
                placeholder="GSTIN"
                value={formData.gstNumber}
                onChange={(e) =>
                  setFormData({ ...formData, gstNumber: e.target.value })
                }
                required
              />
              <CustomTextField
                label="PAN Number"
                placeholder="PAN"
                value={formData.panNumber}
                onChange={(e) =>
                  setFormData({ ...formData, panNumber: e.target.value })
                }
                required
              />
              <CustomTextField
                label="License Number"
                placeholder="License"
                value={formData.licenseNumber}
                onChange={(e) =>
                  setFormData({ ...formData, licenseNumber: e.target.value })
                }
                required
              />
            </div>
          </div>

          {/* Google Map Location */}
          <div className="pt-4 pb-2">
            <div className="flex items-center gap-2 mb-4 text-brand-primary dark:text-blue-400">
              <Navigation size={18} />
              <h3 className="font-bold text-sm uppercase tracking-wider">
                Map Location
              </h3>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-dark-card/50 rounded-2xl border border-gray-100 dark:border-dark-border space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Add latitude & longitude so customers can get directions to this branch. You can find coordinates from{" "}
                <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-brand-primary dark:text-blue-400 underline">Google Maps</a> (right-click on location → copy coordinates).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomTextField
                  label="Latitude"
                  placeholder="e.g. 13.0358"
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData({ ...formData, latitude: e.target.value })
                  }
                />
                <CustomTextField
                  label="Longitude"
                  placeholder="e.g. 77.5970"
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData({ ...formData, longitude: e.target.value })
                  }
                />
              </div>
              {formData.latitude && formData.longitude && !formData.mapAddress && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${formData.latitude}&lon=${formData.longitude}&zoom=16&addressdetails=1`
                      );
                      const data = await res.json();
                      if (data?.address) {
                        const { road, suburb, city, town, village, state, country } = data.address;
                        const parts = [road || suburb, city || town || village, state, country].filter(Boolean);
                        setFormData({ ...formData, mapAddress: parts.join(", ") });
                      }
                    } catch (err) {
                      console.error("Reverse geocoding failed:", err);
                    }
                  }}
                  className="w-full py-2.5 text-xs font-bold text-brand-primary dark:text-blue-400 bg-brand-primary/5 border border-brand-primary/20 rounded-xl hover:bg-brand-primary/10 transition-all"
                >
                   Auto-detect address from coordinates
                </button>
              )}
              <CustomTextField
                label="Map Display Address"
                icon={MapPin}
                placeholder="e.g. Sahakar Nagar Main Road, Bengaluru, Karnataka"
                value={formData.mapAddress}
                onChange={(e) =>
                  setFormData({ ...formData, mapAddress: e.target.value })
                }
              />
              {formData.latitude && formData.longitude && (
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border">
                  <iframe
                    title="Branch Location Preview"
                    width="100%"
                    height="200"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}&z=15&output=embed`}
                  ></iframe>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest px-1">
              Branch Photo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-dark-card border-2 border-dashed border-gray-200 dark:border-dark-border overflow-hidden flex items-center justify-center">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera size={24} className="text-gray-300" />
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
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({ isOpen: false, shopId: null, shopName: "" })
        }
        onConfirm={handleConfirmDelete}
        title="Delete Branch"
        message={`Are you sure you want to delete ${deleteModal.shopName}? This will also delete associated users and data. This action cannot be undone.`}
        confirmText="Delete Branch"
        confirmColor="red"
      />
    </div>
  );
};

export default ShopManager;
