import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Shield,
  Check,
  Loader2,
  Save,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Info,
  Lock,
  LayoutDashboard,
  FileText,
  Users,
  Settings,
} from "lucide-react";
import api from "../../../api/axiosInstance";
import Snackbar from "../../../components/shared/Snackbar";
import { AVAILABLE_PERMISSIONS } from "../config/privilegeConstants";

/** Helper: check if a key is allowed by the shop's restriction list */
function isKeyAllowedByShop(permKey, unrestricted, allowedList) {
  if (unrestricted) return true;
  if (!allowedList?.length) return false;
  if (allowedList.includes("*")) return true;
  return allowedList.some((allowed) => {
    if (allowed === permKey) return true;
    if (permKey.startsWith(`${allowed}:`)) return true;
    if (allowed.startsWith(`${permKey}:`)) return true;
    return false;
  });
}

function getModulePermStrings(groupKey, sectionKey, mod) {
  if (sectionKey) {
    if (mod.actions?.length > 0) {
      return mod.actions.map((a) => `${groupKey}:${sectionKey}:${mod.key}:${a.key}`);
    }
    return [`${groupKey}:${sectionKey}:${mod.key}`];
  }
  if (mod.actions?.length > 0) {
    return mod.actions.map((a) => `${groupKey}:${mod.key}:${a.key}`);
  }
  return [`${groupKey}:${mod.key}`];
}

function getSectionPermStrings(groupKey, section) {
  const perms = [];
  section.modules.forEach((mod) => {
    getModulePermStrings(groupKey, section.key, mod).forEach((p) => perms.push(p));
  });
  return perms;
}

function getGroupPermStrings(group) {
  const perms = [];
  if (group.sections) {
    group.sections.forEach((section) => {
      getSectionPermStrings(group.key, section).forEach((p) => perms.push(p));
    });
  } else if (group.modules?.length > 0) {
    group.modules.forEach((mod) => {
      getModulePermStrings(group.key, null, mod).forEach((p) => perms.push(p));
    });
  } else {
    perms.push(group.key);
  }
  return perms;
}

/** Filter AVAILABLE_PERMISSIONS based on shop restrictions */
function filterCatalogForShop(groups, unrestricted, allowedList) {
  if (unrestricted) return groups;
  const check = (pk) => isKeyAllowedByShop(pk, false, allowedList);
  const out = [];

  for (const group of groups) {
    const g = { ...group };
    if (group.sections) {
      const sections = [];
      for (const section of group.sections) {
        const modules = [];
        for (const mod of section.modules) {
          const allowedActions = mod.actions?.filter((a) => 
            check(`${group.key}:${section.key}:${mod.key}:${a.key}`)
          ) || [];
          
          if (mod.actions?.length) {
            if (allowedActions.length) modules.push({ ...mod, actions: allowedActions });
          } else if (check(`${group.key}:${section.key}:${mod.key}`)) {
            modules.push({ ...mod });
          }
        }
        if (modules.length) sections.push({ ...section, modules });
      }
      if (sections.length) {
        g.sections = sections;
        delete g.modules;
        out.push(g);
      }
    } else if (group.modules?.length) {
      const modules = [];
      for (const mod of group.modules) {
        const allowedActions = mod.actions?.filter((a) => 
          check(`${group.key}:${mod.key}:${a.key}`)
        ) || [];
        
        if (mod.actions?.length) {
          if (allowedActions.length) modules.push({ ...mod, actions: allowedActions });
        } else if (check(`${group.key}:${mod.key}`)) {
          modules.push({ ...mod });
        }
      }
      if (modules.length) {
        g.modules = modules;
        delete g.sections;
        out.push(g);
      }
    } else if (check(group.key)) {
      out.push({ ...g, modules: [], sections: undefined });
    }
  }
  return out;
}

const PrivilegeForm = () => {
  const { id, portalRole } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isHrmSecurity = location.pathname.includes("/hrm/security");
  const returnPath = isHrmSecurity
    ? `/${portalRole || "admin"}/hrm/security`
    : `/${portalRole || "admin"}/settings/more/privileges`;
  const isEditing = !!id;
  const shopPermLoaded = useRef(false);
  const scrollContainerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shopGate, setShopGate] = useState({ unrestricted: true, allowedList: [] });
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [formData, setFormData] = useState({ name: "", description: "", permissions: [] });
  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  const visibleCatalog = useMemo(
    () => filterCatalogForShop(AVAILABLE_PERMISSIONS, shopGate.unrestricted, shopGate.allowedList),
    [shopGate.unrestricted, shopGate.allowedList]
  );

  const visiblePermSet = useMemo(() => {
    const s = new Set();
    visibleCatalog.forEach((g) => getGroupPermStrings(g).forEach((p) => s.add(p)));
    return s;
  }, [visibleCatalog]);

  // Expand wildcard "*" to all available permissions when loading a system Admin role
  useEffect(() => {
    if (formData.permissions.includes("*") && visiblePermSet.size > 0) {
      setFormData((prev) => ({
        ...prev,
        permissions: Array.from(visiblePermSet),
      }));
    }
  }, [formData.permissions, visiblePermSet]);

  const isAssignable = (pk) => shopGate.unrestricted || visiblePermSet.has(pk);

  const getGroupStats = useCallback((group) => {
    const strings = getGroupPermStrings(group);
    const groupTotal = strings.length;
    const groupSelected = strings.filter((s) => formData.permissions.includes(s)).length;
    return { groupTotal, groupSelected };
  }, [formData.permissions]);

  const fetchShopPermissions = useCallback(async () => {
    try {
      const res = await api.get("/privileges/shop-permissions");
      const data = res.data?.data ?? {};
      const effektivUnrestricted = !data.hasRestrictions || (data.permissions || []).includes("*");
      setShopGate({ unrestricted: effektivUnrestricted, allowedList: effektivUnrestricted ? [] : (data.permissions || []) });
    } catch {
      setShopGate({ unrestricted: true, allowedList: [] });
    } finally { shopPermLoaded.current = true; }
  }, []);

  const fetchPrivilege = useCallback(async () => {
    try {
      const res = await api.get(`/privileges/${id}`);
      const priv = res.data.data;
      setFormData({ name: priv.name, description: priv.description || "", permissions: priv.permissions || [] });
    } catch { showSnack("Failed to load privilege", "error"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchShopPermissions();
      if (isEditing) await fetchPrivilege();
      else setLoading(false);
    })();
  }, [isEditing, fetchPrivilege, fetchShopPermissions]);

  useEffect(() => {
    if (visibleCatalog.length > 0 && !activeGroupId) {
      setActiveGroupId(visibleCatalog[0].key);
    }
  }, [visibleCatalog, activeGroupId]);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleAction = (gk, mk, ak, sk) => {
    const pk = sk ? `${gk}:${sk}:${mk}:${ak}` : `${gk}:${mk}:${ak}`;
    if (!isAssignable(pk)) return;
    setFormData((prev) => {
      const exists = prev.permissions.includes(pk);
      return { ...prev, permissions: exists ? prev.permissions.filter((p) => p !== pk) : [...prev.permissions, pk] };
    });
  };

  const handleSelectAllModule = (gk, mod, sk) => {
    const strings = getModulePermStrings(gk, sk, mod).filter(isAssignable);
    if (!strings.length) return;
    setFormData((prev) => {
      const allSelected = strings.every((s) => prev.permissions.includes(s));
      return { ...prev, permissions: allSelected ? prev.permissions.filter((p) => !strings.includes(p)) : Array.from(new Set([...prev.permissions, ...strings])) };
    });
  };

  const handleSelectAllGroup = (gk) => {
    const group = visibleCatalog.find(g => g.key === gk);
    if (!group) return;
    const strings = getGroupPermStrings(group).filter(isAssignable);
    if (!strings.length) return;
    setFormData((prev) => {
      const allSelected = strings.every((s) => prev.permissions.includes(s));
      return { ...prev, permissions: allSelected ? prev.permissions.filter((p) => !strings.includes(p)) : Array.from(new Set([...prev.permissions, ...strings])) };
    });
  };

  const jumpTo = (gk) => {
    setActiveGroupId(gk);
    setIsMobileSidebarOpen(false); // Close mobile sidebar after selection
    document.getElementById(`matrix-group-${gk}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return showSnack("Please enter a privilege name", "error");
    const cleaned = formData.permissions.filter(isAssignable);
    if (cleaned.length === 0) return showSnack("Please select at least one permission", "error");
    
    setSubmitting(true);
    try {
      const payload = { ...formData, permissions: cleaned };
      if (isEditing) await api.put(`/privileges/${id}`, payload);
      else await api.post("/privileges", payload);
      showSnack("Saved successfully", "success");
      setTimeout(() => navigate(returnPath), 800);
    } catch (err) { showSnack(err.response?.data?.message || "Failed to save", "error"); }
    finally { setSubmitting(false); }
  };

  const renderActions = (gk, sk, mk, actions) => (
    <div className="flex flex-wrap gap-2 md:gap-3">
      {actions.map((a) => {
        const pk = sk ? `${gk}:${sk}:${mk}:${a.key}` : `${gk}:${mk}:${a.key}`;
        const active = formData.permissions.includes(pk);
        return (
          <button
            key={a.key}
            type="button"
            onClick={() => toggleAction(gk, mk, a.key, sk)}
            className="flex items-center gap-2 md:gap-2.5 group cursor-pointer transition-all hover:scale-105"
          >
             <div className={`w-4 h-4 md:w-5 md:h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
               active 
                 ? "bg-brand-primary border-brand-primary" 
                 : "bg-white dark:bg-dark-bg border-gray-200 dark:border-dark-border group-hover:border-gray-300"
             }`}>
                {active && <Check size={12} className="text-white md:w-3.5 md:h-3.5" strokeWidth={3} />}
             </div>
             <span className="text-[12px] md:text-[13px] font-medium text-gray-700 dark:text-gray-300">{a.label}</span>
          </button>
        );
      })}
    </div>
  );

  const renderModuleCard = (gk, sk, mod) => {
    const strings = getModulePermStrings(gk, sk, mod).filter(isAssignable);
    const allSelected = strings.length > 0 && strings.every((s) => formData.permissions.includes(s));
    
    return (
      <div key={mod.key} className="bg-white dark:bg-dark-card rounded-xl border border-gray-200/80 dark:border-dark-border hover:border-brand-primary/30 transition-all overflow-hidden">
        <div 
          onClick={() => handleSelectAllModule(gk, mod, sk)}
          className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dark-border cursor-pointer hover:bg-brand-primary/[0.02] transition-colors"
        >
          <h6 className="text-[13px] md:text-[14px] font-bold text-gray-800 dark:text-gray-200">{mod.label}</h6>
          <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
            allSelected 
              ? "bg-brand-primary border-brand-primary" 
              : "bg-white dark:bg-dark-bg border-gray-200 dark:border-dark-border"
          }`}>
            {allSelected && <Check size={14} className="text-white" strokeWidth={3} />}
          </div>
        </div>
        <div className="px-4 py-3.5 bg-gray-50/50 dark:bg-dark-bg/30">
          {renderActions(gk, sk, mod.key, mod.actions || [])}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-white dark:bg-dark-bg gap-6">
        <Loader2 size={32} className="text-brand-primary dark:text-blue-400 animate-spin" />
        <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-white dark:bg-dark-bg flex flex-col overflow-hidden relative font-sans">
      <Snackbar message={snack.message} type={snack.type} onClose={() => setSnack({ ...snack, message: "" })} />

      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-white dark:bg-dark-card shrink-0 border-b border-gray-100 dark:border-dark-border">
        <div className="h-[56px] md:h-[64px] flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
             <button
                onClick={() => navigate(returnPath)}
                className="text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300 transition-colors shrink-0"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                {isEditing ? "Edit Privilege" : "New Privilege"}
              </h1>
          </div>
          
          <div className="hidden md:flex items-center gap-3 shrink-0">
             <button
                onClick={() => navigate(returnPath)}
                className="px-5 py-2 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
             >
                Discard
             </button>
             <button
                onClick={handleSubmit}
                disabled={submitting}
                className="h-10 px-6 bg-brand-primary text-white rounded-lg text-[13px] font-semibold hover:bg-brand-primary/90 active:scale-98 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
             >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Save</span>
             </button>
          </div>

          {/* Mobile Save Button */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="md:hidden h-9 px-4 bg-brand-primary text-white rounded-lg text-[12px] font-semibold hover:bg-brand-primary/90 active:scale-98 disabled:opacity-50 transition-all flex items-center gap-2 shrink-0"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save</span>
          </button>
        </div>

        {/* Mobile: Privilege Name & Description */}
        <div className="md:hidden space-y-3 bg-white dark:bg-dark-card px-4 py-3 border-t border-gray-100 dark:border-dark-border">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Privilege Name"
            className="w-full px-4 h-11 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-[13px] font-medium text-gray-700 dark:text-gray-300 placeholder:text-gray-400 outline-none focus:border-brand-primary/40 focus:ring-4 focus:ring-brand-primary/5 transition-all"
          />
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description (Optional)"
            className="w-full px-4 h-11 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-[13px] font-medium text-gray-700 dark:text-gray-300 placeholder:text-gray-400 outline-none focus:border-brand-primary/40 focus:ring-4 focus:ring-brand-primary/5 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR - Desktop */}
        <aside className="hidden md:flex w-[280px] bg-white dark:bg-dark-card border-r border-gray-100 dark:border-dark-border flex-col pb-6 gap-0 overflow-y-auto scrollbar-hide shrink-0">
           
           <div className="space-y-3 bg-white dark:bg-dark-surface px-6 py-4 border-b border-gray-100 dark:border-dark-border">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Privilege Name"
                    className="w-full px-4 h-11 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-[13px] font-medium text-gray-700 dark:text-gray-300 placeholder:text-gray-400 outline-none focus:border-brand-primary/40 focus:ring-4 focus:ring-brand-primary/5 transition-all"
                  />
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description (Optional)"
                    className="w-full px-4 h-11 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-[13px] font-medium text-gray-700 dark:text-gray-300 placeholder:text-gray-400 outline-none focus:border-brand-primary/40 focus:ring-4 focus:ring-brand-primary/5 transition-all"
                  />
              </div>

           <div className="flex-1">
              <div className="space-y-1">
                {visibleCatalog.map((group) => {
                  const { groupTotal, groupSelected } = getGroupStats(group);
                  const isFully = groupTotal > 0 && groupSelected === groupTotal;
                  const isActive = activeGroupId === group.key;

                  return (
                    <div 
                      key={group.key}
                      className={`flex items-center group/item transition-all ${isActive ? "bg-brand-primary/5 border-r-2 border-brand-primary" : "hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card"}`}
                    >
                       <div 
                        onClick={() => handleSelectAllGroup(group.key)}
                        className="w-10 h-10 flex items-center justify-center cursor-pointer"
                       >
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isFully 
                              ? "bg-brand-primary border-brand-primary" 
                              : "bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border hover:border-gray-300"
                          }`}>
                             {isFully && <Check size={12} className="text-white" strokeWidth={3} />}
                             {groupSelected > 0 && !isFully && <div className="w-2 h-0.5 bg-brand-primary rounded-full" />}
                          </div>
                       </div>
                       <button
                         onClick={() => jumpTo(group.key)}
                         className="flex-1 flex items-center justify-between py-3 pr-4 text-left"
                       >
                         <div className="flex items-center gap-3 min-w-0">
                            <group.icon size={16} className={isActive ? "text-brand-primary" : "text-gray-400 dark:text-gray-500"} />
                            <span className={`text-[13px] font-medium truncate ${isActive ? "text-gray-900 dark:text-white" : "text-gray-600"}`}>{group.label}</span>
                         </div>
                         <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 shrink-0">{groupSelected}/{groupTotal}</span>
                       </button>
                    </div>
                  );
                })}
              </div>
           </div>
        </aside>

        {/* RIGHT PANEL */}
        <main 
          ref={scrollContainerRef}
          className="flex-1 bg-white dark:bg-dark-bg overflow-y-auto scroll-smooth pb-20 md:pb-6"
        >
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-4 md:p-6">
              {visibleCatalog.map((group) => {
                const isMasterAccessOnly = !group.sections && (!group.modules || group.modules.length === 0);
                return (
                 <section
                   key={group.key}
                   id={`matrix-group-${group.key}`}
                   className={isMasterAccessOnly 
                     ? "" 
                     : "col-span-full bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border flex flex-col overflow-hidden"
                   }
                 >
                   {/* GROUP HEADER (Only for multi-permission modules) */}
                   {!isMasterAccessOnly && (
                     <div 
                       onClick={() => handleSelectAllGroup(group.key)}
                       className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-gray-100 dark:border-dark-border cursor-pointer hover:bg-brand-primary/[0.02] transition-colors"
                     >
                        <div className="flex items-center gap-3 md:gap-4">
                           <div className="p-2 md:p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary dark:text-blue-400">
                              <group.icon size={20} />
                           </div>
                           <h2 className="text-[15px] md:text-[16px] font-bold text-gray-900 dark:text-white">{group.label}</h2>
                        </div>
                        <div className={`w-5 h-5 md:w-6 md:h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                          (() => {
                            const strings = getGroupPermStrings(group).filter(isAssignable);
                            const allSelected = strings.length > 0 && strings.every((s) => formData.permissions.includes(s));
                            return allSelected 
                              ? "bg-brand-primary border-brand-primary" 
                              : "bg-white dark:bg-dark-bg border-gray-200 dark:border-dark-border group-hover:border-gray-300";
                          })()
                        }`}>
                          {(() => {
                            const strings = getGroupPermStrings(group).filter(isAssignable);
                            const allSelected = strings.length > 0 && strings.every((s) => formData.permissions.includes(s));
                            return allSelected && <Check size={14} className="text-white md:w-4 md:h-4" strokeWidth={3} />;
                          })()}
                        </div>
                     </div>
                   )}

                   {/* GROUP CONTENT */}
                   <div className={isMasterAccessOnly ? "" : "p-5 md:p-6 space-y-6 bg-gray-50/30 dark:bg-dark-bg/20"}>
                      {group.sections ? (
                        group.sections.map((section) => (
                          <div key={section.key} className="space-y-4">
                             <h5 className="text-[12px] md:text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1">{section.label}</h5>
                             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                                {section.modules.map(mod => renderModuleCard(group.key, section.key, mod))}
                             </div>
                          </div>
                        ))
                      ) : (group.modules?.length > 0) ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                           {group.modules.map(mod => renderModuleCard(group.key, null, mod))}
                         </div>
                      ) : (
                        <div 
                          onClick={() => {
                            const pk = group.key;
                            setFormData(prev => ({ ...prev, permissions: prev.permissions.includes(pk) ? prev.permissions.filter(p => p !== pk) : [...prev.permissions, pk] }));
                          }}
                          className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border p-4 md:p-5 rounded-2xl flex items-center justify-between hover:border-brand-primary/40 hover:bg-brand-primary/[0.02] cursor-pointer transition-all"
                        >
                           <div className="flex items-center gap-4 md:gap-5 min-w-0">
                              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary dark:text-blue-400 shrink-0">
                                <group.icon size={20} className="md:w-6 md:h-6" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-[14px] md:text-[15px] font-bold text-gray-900 dark:text-white truncate">{group.label}</h4>
                                <p className="text-[11px] md:text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">Enable full access for this module</p>
                              </div>
                           </div>
                           <div className={`w-5 h-5 md:w-6 md:h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                             formData.permissions.includes(group.key)
                               ? "bg-brand-primary border-brand-primary" 
                               : "bg-white dark:bg-dark-bg border-gray-200 dark:border-dark-border"
                           }`}>
                              {formData.permissions.includes(group.key) && <Check size={14} className="text-white md:w-4 md:h-4" strokeWidth={3} />}
                           </div>
                        </div>
                      )}
                   </div>
                 </section>
                );
              })}
           </div>
        </main>
      </div>

      {/* MOBILE FLOATING ACTION BUTTON */}
      {isMobile && (
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="md:hidden fixed bottom-6 right-6 z-50 h-14 px-6 bg-brand-primary text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2 font-semibold text-[14px]"
        >
          <Shield size={20} />
          <span>Power</span>
        </button>
      )}

      {/* MOBILE BOTTOM SHEET */}
      {isMobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-50 animate-in fade-in"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          
          {/* Bottom Sheet */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-card rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom max-h-[70vh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border">
              <h3 className="text-[16px] font-bold text-gray-900 dark:text-white">Select Module</h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">Choose a module to configure permissions</p>
            </div>

            {/* Module List */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="space-y-2">
                {visibleCatalog.map((group) => {
                  const { groupTotal, groupSelected } = getGroupStats(group);
                  const isFully = groupTotal > 0 && groupSelected === groupTotal;
                  const isActive = activeGroupId === group.key;

                  return (
                    <div 
                      key={group.key}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        isActive 
                          ? "bg-brand-primary/10 border-2 border-brand-primary" 
                          : "bg-gray-50 dark:bg-dark-bg border-2 border-transparent"
                      }`}
                    >
                       <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAllGroup(group.key);
                        }}
                        className="shrink-0"
                       >
                          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                            isFully 
                              ? "bg-brand-primary border-brand-primary" 
                              : "bg-white dark:bg-dark-bg border-gray-300 dark:border-gray-600"
                          }`}>
                             {isFully && <Check size={14} className="text-white" strokeWidth={3} />}
                             {groupSelected > 0 && !isFully && <div className="w-2.5 h-0.5 bg-brand-primary rounded-full" />}
                          </div>
                       </div>
                       <button
                         onClick={() => jumpTo(group.key)}
                         className="flex-1 flex items-center justify-between text-left min-w-0"
                       >
                         <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`p-2 rounded-lg ${isActive ? "bg-brand-primary/20" : "bg-white dark:bg-dark-card"}`}>
                              <group.icon size={18} className={isActive ? "text-brand-primary" : "text-gray-400 dark:text-gray-500"} />
                            </div>
                            <span className={`text-[14px] font-semibold truncate ${isActive ? "text-brand-primary" : "text-gray-700 dark:text-gray-300"}`}>
                              {group.label}
                            </span>
                         </div>
                         <span className={`text-[12px] font-bold shrink-0 ml-2 ${isActive ? "text-brand-primary dark:text-blue-400" : "text-gray-400"}`}>
                           {groupSelected}/{groupTotal}
                         </span>
                       </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PrivilegeForm;
