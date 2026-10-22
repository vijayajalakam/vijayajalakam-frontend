import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Edit3,
  Trash2,
  Shield,
  RefreshCw,
  Lock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "../../../api/axiosInstance";
import Snackbar from "../../../components/shared/Snackbar";
import PageHeader from "../../../components/shared/PageHeader";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import CustomTable from "../../../components/shared/CustomTable";
import { TableSkeleton, ManagerCardSkeleton } from "../../../components/shared/Skeleton";

const PrivilegeManagement = () => {
  const navigate = useNavigate();
  const { shopSlug, portalRole } = useParams();
  const [privileges, setPrivileges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    privilegeId: null,
    privilegeName: "",
  });
  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const fetchPrivileges = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/privileges");
      setPrivileges(response.data.data);
    } catch (error) {
      console.error("Error fetching privileges:", error);
      showSnack(
        error.response?.data?.message || "Failed to fetch privileges",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrivileges();
  }, [fetchPrivileges]);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const confirmDelete = (privilegeId, privilegeName) => {
    setDeleteModal({
      isOpen: true,
      privilegeId,
      privilegeName,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/privileges/${deleteModal.privilegeId}`);
      showSnack("Privilege deleted successfully", "success");
      setDeleteModal({ isOpen: false, privilegeId: null, privilegeName: "" });
      fetchPrivileges();
    } catch (error) {
      console.error("Error deleting privilege:", error);
      showSnack(
        error.response?.data?.message || "Failed to delete privilege",
        "error",
      );
    }
  };

  const filteredPrivileges = privileges.filter(
    (priv) =>
      priv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      priv.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const columns = [
    {
      header: "Privilege Identity",
      render: (privilege) => (
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-brand-primary/[0.04] border border-brand-primary/10 flex items-center justify-center shrink-0">
            <Shield size={20} className="text-brand-primary dark:text-blue-400" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 dark:text-white text-[14px] leading-tight">
              {privilege.name}
            </div>
            {privilege.isDefault ? (
              <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1">
                <CheckCircle2 size={10} />
                System Default
              </span>
            ) : (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1 italic">
                {privilege.description || "Custom configuration"}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Capability Overview",
      align: "center",
      render: (privilege) => (
        <div className="flex items-center justify-center">
          <div className="px-3 py-1.5 bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl flex items-center gap-2">
            <Lock size={12} className="text-gray-400 dark:text-gray-500" />
            <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-tighter">
              {privilege.permissions?.length || 0} Access Keys
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (privilege) => (
        <div className="flex justify-end gap-1.5 pr-2">
          <button
            onClick={() =>
              navigate(
                `/${shopSlug}/${portalRole}/settings/more/privileges/edit/${privilege._id}`,
              )
            }
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-brand-primary dark:text-blue-400 hover:bg-brand-primary/5 rounded-xl transition-all active:scale-90"
            title="Edit Configuration"
          >
            <Edit3 size={16} />
          </button>
          {!privilege.isDefault && (
            <button
              onClick={() => confirmDelete(privilege._id, privilege.name)}
              className="w-9 h-9 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
              title="Delete Privilege"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const renderExpandedContent = (privilege) => (
    <div className="px-6 py-4 bg-gray-50/50 dark:bg-dark-bg/20 rounded-2xl border border-gray-100 dark:border-dark-border mt-2 animate-in fade-in slide-in-from-top-1">
      <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100 dark:border-dark-border">
        <Lock size={14} className="text-gray-400 dark:text-gray-500" />
        <h4 className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Active Permission Paths</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {privilege.permissions?.slice(0, 20).map((p, idx) => (
          <span key={idx} className="px-2 py-1 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-400">
            {p.split(':').pop().replace(/_/g, ' ')}
          </span>
        ))}
        {privilege.permissions?.length > 20 && (
          <span className="px-2 py-1 text-[10px] font-black text-brand-primary dark:text-blue-400 uppercase tracking-widest">
            + {privilege.permissions.length - 20} More
          </span>
        )}
      </div>
    </div>
  );

  // Mobile Card Component
  const renderMobileCard = (privilege) => {
    const isExpanded = expandedCard === privilege._id;
    
    return (
      <div 
        key={privilege._id}
        className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden transition-all"
      >
        {/* Card Header */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-brand-primary/[0.08] flex items-center justify-center shrink-0">
              <Shield size={22} className="text-brand-primary dark:text-blue-400" strokeWidth={2.5} />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white text-[15px] leading-tight truncate">
                    {privilege.name}
                  </h3>
                  {privilege.isDefault ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1.5">
                      <CheckCircle2 size={10} />
                      System Default
                    </span>
                  ) : (
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {privilege.description || "Custom configuration"}
                    </p>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() =>
                      navigate(
                        `/${shopSlug}/${portalRole}/settings/more/privileges/edit/${privilege._id}`,
                      )
                    }
                    className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-brand-primary dark:text-blue-400 hover:bg-brand-primary/5 rounded-xl transition-all active:scale-90"
                  >
                    <Edit3 size={16} />
                  </button>
                  {!privilege.isDefault && (
                    <button
                      onClick={() => confirmDelete(privilege._id, privilege.name)}
                      className="w-9 h-9 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Access Keys Badge */}
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-dark-bg rounded-xl">
                <Lock size={12} className="text-gray-400 dark:text-gray-500" />
                <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">
                  {privilege.permissions?.length || 0} Access Keys
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Section */}
        {privilege.permissions?.length > 0 && (
          <>
            <button
              onClick={() => setExpandedCard(isExpanded ? null : privilege._id)}
              className="w-full px-4 py-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-between hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-bg/50 transition-colors"
            >
              <span className="text-[12px] font-semibold text-gray-600 dark:text-gray-400">
                {isExpanded ? 'Hide' : 'View'} Permissions
              </span>
              {isExpanded ? (
                <ChevronUp size={16} className="text-gray-400 dark:text-gray-500" />
              ) : (
                <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />
              )}
            </button>
            
            {isExpanded && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/20">
                <div className="flex flex-wrap gap-2">
                  {privilege.permissions?.slice(0, 15).map((p, idx) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-1 bg-white dark:bg-dark-card rounded-lg text-[10px] font-semibold text-gray-600 dark:text-gray-400"
                    >
                      {p.split(':').pop().replace(/_/g, ' ')}
                    </span>
                  ))}
                  {privilege.permissions?.length > 15 && (
                    <span className="px-2.5 py-1 text-[10px] font-black text-brand-primary dark:text-blue-400">
                      + {privilege.permissions.length - 15} More
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 md:space-y-6 pb-10 md:pb-6">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />

        {/* Unified Table Container */}
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
          {/* Top Header Bar */}
          <div className="p-4 md:p-5 border-b border-gray-100 dark:border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <h2 className="text-[16px] md:text-lg font-bold text-gray-900 dark:text-white">Staff Privileges</h2>
             <div className="flex items-center gap-3 w-full sm:w-auto">
               <div className="relative group flex-1 sm:w-64">
                 <input
                   type="text"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   placeholder="Filter identities..."
                   className="w-full h-10 pl-4 pr-4 bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:ring-4 focus:ring-brand-primary/5 transition-all"
                 />
               </div>
               <button
                 onClick={() => navigate(`/${shopSlug}/${portalRole}/settings/more/privileges/new`)}
                 className="shrink-0 h-10 px-4 md:px-5 bg-brand-primary text-white rounded-xl text-sm font-bold hover:bg-brand-primary/90 transition-all flex items-center gap-2"
               >
                 <span className="text-lg leading-none mb-[2px]">+</span>
                 <span className="hidden sm:inline">New Privilege</span>
                 <span className="sm:hidden">New</span>
               </button>
             </div>
          </div>

          {/* Content */}
          {isMobile ? (
            <div className="space-y-3 p-4">
              {loading ? (
                <ManagerCardSkeleton count={4} />
              ) : filteredPrivileges.length === 0 ? (
                <div className="bg-gray-50 dark:bg-dark-bg rounded-2xl border border-gray-100 dark:border-dark-border p-8 text-center">
                  <Shield size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    No customized privileges found.
                  </p>
                </div>
              ) : (
                filteredPrivileges.map((privilege) => renderMobileCard(privilege))
              )}
            </div>
          ) : (
            <CustomTable
              columns={columns}
              data={filteredPrivileges}
              loading={loading}
              emptyMessage="No customized privileges found."
              expandable={true}
              expandedContent={renderExpandedContent}
            />
          )}
        </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({ isOpen: false, privilegeId: null, privilegeName: "" })
        }
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to permanently remove the "${deleteModal.privilegeName}" privilege?`}
        confirmText="Confirm Delete"
        confirmColor="red"
      />
    </div>
  );
};

export default PrivilegeManagement;
