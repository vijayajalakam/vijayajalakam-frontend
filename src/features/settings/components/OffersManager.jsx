import React, { useState, useEffect, useMemo } from "react";
import { Tag, Check, Save, Plus, Trash2, Edit2, Loader2, Search, Scissors, Package, ChevronRight, ChevronDown } from "lucide-react";
import api from "../../../api/axiosInstance";
import Snackbar from "../../../components/shared/Snackbar";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import { useCurrency } from "../../../hooks/useCurrency";

const hasSelectedChild = (node, formData) => {
  let selected = false;
  if (node.type === "department") selected = formData.applicableDepartments.includes(node.id);
  else if (node.type === "serviceCategory") selected = formData.applicableServiceCategories.includes(node.id);
  else if (node.type === "productCategory") selected = formData.applicableProductCategories.includes(node.id);
  else if (node.type === "service") selected = formData.applicableServices.includes(node.id);
  else if (node.type === "product") selected = formData.applicableProducts.includes(node.id);
  else if (node.type === "variant") selected = formData.applicableVariants.includes(node.id);
  
  if (selected) return true;
  if (node.children && node.children.length > 0) {
    return node.children.some(child => hasSelectedChild(child, formData));
  }
  return false;
};

const TreeNode = ({ node, formData, toggleItemSelection, level = 0, searchQuery }) => {
  const [expanded, setExpanded] = useState(() => hasSelectedChild(node, formData) || !!searchQuery);

  useEffect(() => {
    if (searchQuery) {
      setExpanded(true);
    }
  }, [searchQuery]);
  const hasChildren = node.children && node.children.length > 0;
  
  let isSelected = false;
  if (node.type === "department") isSelected = formData.applicableDepartments.includes(node.id);
  else if (node.type === "serviceCategory") isSelected = formData.applicableServiceCategories.includes(node.id);
  else if (node.type === "productCategory") isSelected = formData.applicableProductCategories.includes(node.id);
  else if (node.type === "service") isSelected = formData.applicableServices.includes(node.id);
  else if (node.type === "product") isSelected = formData.applicableProducts.includes(node.id);
  else if (node.type === "variant") isSelected = formData.applicableVariants.includes(node.id);

  const handleToggle = (e) => {
    e.stopPropagation();
    toggleItemSelection(node, !isSelected);
  };

  return (
    <div className="flex flex-col w-full">
      <div 
        className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-colors hover:bg-gray-50 dark:hover:bg-dark-card/50 cursor-pointer ${isSelected ? "bg-brand-primary/5" : ""}`}
        style={{ paddingLeft: `${(level * 1.5) + 0.75}rem` }}
      >
        <div 
          className="w-5 h-5 flex items-center justify-center shrink-0 cursor-pointer text-gray-400 hover:text-gray-600"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          {hasChildren ? (expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : <div className="w-4" />}
        </div>
        
        <div 
          className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 transition-colors cursor-pointer ${isSelected ? "bg-brand-primary border-brand-primary" : "border-gray-300 dark:border-dark-border"}`}
          onClick={handleToggle}
        >
          {isSelected && <Check size={14} className="text-white" />}
        </div>
        
        <div 
          className="min-w-0 flex-1 flex flex-col justify-center cursor-pointer"
          onClick={() => { if (hasChildren) setExpanded(!expanded); else handleToggle(new Event('click')); }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{node.name}</span>
            {node.subtitle && <span className="text-xs text-gray-400">({node.subtitle})</span>}
          </div>
        </div>
      </div>
      
      {expanded && hasChildren && (
        <div className="flex flex-col border-l border-gray-100 dark:border-dark-border ml-5 mt-1 mb-2">
          {node.children.map(child => (
            <TreeNode key={`${child.type}-${child.id}`} node={child} formData={formData} toggleItemSelection={toggleItemSelection} level={level + 1} searchQuery={searchQuery} />
          ))}
        </div>
      )}
    </div>
  );
};

const OffersManager = () => {
  const { currencySymbol } = useCurrency();
  const [offers, setOffers] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [variants, setVariants] = useState([]);

  const [loadingOffers, setLoadingOffers] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Left pane states
  const [selectedOfferId, setSelectedOfferId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    discountType: "percentage",
    discountValue: 0,
    endTime: "",
    applicableType: "all",
    applicableServices: [],
    applicableProducts: [],
    applicableDepartments: [],
    applicableServiceCategories: [],
    applicableProductCategories: [],
    applicableVariants: [],
  });
  const [isEditing, setIsEditing] = useState(false);

  // Right pane states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("services"); // "services" or "products"

  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  useEffect(() => {
    fetchOffers();
    fetchItems();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoadingOffers(true);
      const res = await api.get("/offers");
      setOffers(res.data.data || []);
    } catch (err) {
      console.error("Failed to load offers:", err);
      showSnack("Failed to load offers", "error");
    } finally {
      setLoadingOffers(false);
    }
  };

  const fetchItems = async () => {
    try {
      setLoadingItems(true);
      // Depending on the backend setup, admin routes might be used
      const [svcRes, prodRes, deptRes, catRes, pcatRes, varRes] = await Promise.all([
        api.get("/admin/services?limit=1000"), // Assuming reasonable amount or need pagination
        api.get("/products?limit=1000"), // Public or admin endpoint for products
        api.get("/departments"),
        api.get("/categories"),
        api.get("/product-categories"),
        api.get("/variants")
      ]);
      setServices(svcRes.data.data || svcRes.data || []);
      setProducts(prodRes.data.data || prodRes.data?.products || []);
      setDepartments(deptRes.data.data || []);
      setServiceCategories(catRes.data.data || []);
      setProductCategories(pcatRes.data.data || []);
      setVariants(varRes.data.data || []);
    } catch (err) {
      console.error("Failed to load items:", err);
      // Gracefully ignore error, lists will be empty
    } finally {
      setLoadingItems(false);
    }
  };

  const handleCreateOrUpdateOffer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return showSnack("Offer name is required", "error");
    if (formData.discountValue < 0) return showSnack("Discount value cannot be negative", "error");
    if (!formData.endTime) return showSnack("End time is required", "error");

    setSubmitting(true);
    try {
      if (isEditing && selectedOfferId) {
        await api.put(`/offers/${selectedOfferId}`, formData);
        showSnack("Offer updated successfully");
      } else {
        await api.post("/offers", formData);
        showSnack("Offer created successfully");
        setFormData({
          name: "",
          discountType: "percentage",
          discountValue: 0,
          endTime: "",
          applicableType: "all",
          applicableServices: [],
          applicableProducts: [],
          applicableDepartments: [],
          applicableServiceCategories: [],
          applicableProductCategories: [],
          applicableVariants: [],
        });
      }
      fetchOffers();
    } catch (err) {
      showSnack(err.response?.data?.error || err.response?.data?.message || "Operation failed", "error");
    } finally {
      setSubmitting(false);
      setIsEditing(false);
      setSelectedOfferId(null);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState(null);

  const handleDeleteOffer = (e, id) => {
    e.stopPropagation();
    setOfferToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteOffer = async () => {
    try {
      await api.delete(`/offers/${offerToDelete}`);
      showSnack("Offer deleted");
      if (selectedOfferId === offerToDelete) {
        setSelectedOfferId(null);
        setFormData({
          name: "",
          discountType: "percentage",
          discountValue: 0,
          endTime: "",
          applicableType: "all",
          applicableServices: [],
          applicableProducts: [],
          applicableDepartments: [],
          applicableServiceCategories: [],
          applicableProductCategories: [],
          applicableVariants: [],
        });
        setIsEditing(false);
      }
      fetchOffers();
    } catch (err) {
      showSnack("Failed to delete offer", "error");
    } finally {
      setShowDeleteConfirm(false);
      setOfferToDelete(null);
    }
  };

  const handleEditClick = (e, offer) => {
    e.stopPropagation();
    setIsEditing(true);
    setSelectedOfferId(offer._id);
    setFormData({
      name: offer.name,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      endTime: offer.endTime ? new Date(offer.endTime).toISOString().slice(0, 16) : "",
      applicableType: offer.applicableType || "all",
      applicableServices: offer.applicableServices || [],
      applicableProducts: offer.applicableProducts || [],
      applicableDepartments: offer.applicableDepartments || [],
      applicableServiceCategories: offer.applicableServiceCategories || [],
      applicableProductCategories: offer.applicableProductCategories || [],
      applicableVariants: offer.applicableVariants || [],
    });
  };

  const toggleItemSelection = (node, isChecking) => {
    // Collect all nodes to update (this node and all descendants)
    const nodesToUpdate = [];
    const traverse = (n) => {
      nodesToUpdate.push(n);
      if (n.children) {
        n.children.forEach(traverse);
      }
    };
    traverse(node);

    setFormData((prev) => {
      const updates = { ...prev };
      
      const getField = (type) => {
        if (type === "service") return "applicableServices";
        if (type === "product") return "applicableProducts";
        if (type === "department") return "applicableDepartments";
        if (type === "serviceCategory") return "applicableServiceCategories";
        if (type === "productCategory") return "applicableProductCategories";
        if (type === "variant") return "applicableVariants";
        return null;
      };

      // Add or remove this node and all descendants
      nodesToUpdate.forEach(n => {
        const field = getField(n.type);
        if (field) {
          const currentList = updates[field] || [];
          if (isChecking) {
            if (!currentList.includes(n.id)) updates[field] = [...currentList, n.id];
          } else {
            updates[field] = currentList.filter(id => id !== n.id);
          }
        }
      });

      // If unchecking, we must also uncheck all ancestors because they no longer fully apply
      if (!isChecking) {
        // We find ancestors by searching the trees
        const uncheckAncestors = (trees) => {
          let foundTargetInSubtree = false;
          for (const t of trees) {
            if (t.id === node.id && t.type === node.type) {
              return true;
            }
            if (t.children && uncheckAncestors(t.children)) {
              foundTargetInSubtree = true;
              const field = getField(t.type);
              if (field) {
                updates[field] = (updates[field] || []).filter(id => id !== t.id);
              }
            }
          }
          return foundTargetInSubtree;
        };
        uncheckAncestors(serviceTree);
        uncheckAncestors(productTree);
      } else {
        // If checking, we must check if all children of a parent are now selected. If so, select the parent.
        const checkAncestors = (trees) => {
          let foundTargetInSubtree = false;
          let allTreesSelected = true;

          for (const t of trees) {
            let isThisSelected = false;
            
            if (t.id === node.id && t.type === node.type) {
              isThisSelected = true;
              foundTargetInSubtree = true;
            } else if (t.children && t.children.length > 0) {
              const childResult = checkAncestors(t.children);
              if (childResult.foundTarget) foundTargetInSubtree = true;
              isThisSelected = childResult.allSelected;
              
              if (isThisSelected) {
                 const field = getField(t.type);
                 if (field) {
                   const list = updates[field] || [];
                   if (!list.includes(t.id)) updates[field] = [...list, t.id];
                 }
              }
            } else {
              const field = getField(t.type);
              isThisSelected = !!(field && (updates[field] || []).includes(t.id));
            }

            if (!isThisSelected) {
              allTreesSelected = false;
            }
          }
          
          return { foundTarget: foundTargetInSubtree, allSelected: allTreesSelected };
        };
        checkAncestors(serviceTree);
        checkAncestors(productTree);
      }

      return updates;
    });
  };



  const serviceTree = useMemo(() => {
    if (!departments.length) return [];
    
    return departments.map(dept => {
      const deptServices = services.filter(s => s.pricing?.some(p => p.department?._id === dept._id || p.department === dept._id));
      
      const catIds = new Set();
      deptServices.forEach(s => {
        const cats = s.categories || [];
        cats.forEach(c => catIds.add(c._id || c));
      });
      
      const deptCats = serviceCategories.filter(c => catIds.has(c._id));
      
      const catNodes = deptCats.map(cat => {
        const catServices = deptServices.filter(s => {
          const cats = s.categories || [];
          return cats.some(c => (c._id || c) === cat._id);
        });
        
        const srvNodes = catServices.map(srv => {
          const varNodes = (srv.variants || []).map(v => {
            const vObj = v.variantId || {};
            const vName = vObj.name || v.name || "Variant";
            const vId = vObj._id || v._id;
            const vPrice = v.pricing?.find(p => p.department === dept._id || p.department?._id === dept._id)?.price || 0;
            return { type: "variant", id: vId, name: vName, subtitle: currencySymbol + vPrice };
          });
          
          const sPrice = srv.pricing?.find(p => p.department === dept._id || p.department?._id === dept._id)?.price || 0;
          return { type: "service", id: srv._id, name: srv.name, subtitle: srv.useVariants ? "" : currencySymbol + sPrice, children: varNodes };
        });
        
        return { type: "serviceCategory", id: cat._id, name: cat.name, children: srvNodes };
      });
      
      const uncatServices = deptServices.filter(s => !s.categories || s.categories.length === 0);
      const uncatSrvNodes = uncatServices.map(srv => {
        const varNodes = (srv.variants || []).map(v => {
            const vObj = v.variantId || {};
            const vName = vObj.name || v.name || "Variant";
            const vId = vObj._id || v._id;
            const vPrice = v.pricing?.find(p => p.department === dept._id || p.department?._id === dept._id)?.price || 0;
            return { type: "variant", id: vId, name: vName, subtitle: currencySymbol + vPrice };
        });
        const sPrice = srv.pricing?.find(p => p.department === dept._id || p.department?._id === dept._id)?.price || 0;
        return { type: "service", id: srv._id, name: srv.name, subtitle: srv.useVariants ? "" : currencySymbol + sPrice, children: varNodes };
      });
      
      return { type: "department", id: dept._id, name: dept.name, children: [...catNodes, ...uncatSrvNodes] };
    });
  }, [departments, serviceCategories, services, currencySymbol]);

  const productTree = useMemo(() => {
    if (!productCategories.length && !products.length) return [];
    
    const catNodes = productCategories.map(cat => {
      const catProducts = products.filter(p => p.category === cat.name || p.category === cat._id);
      const prodNodes = catProducts.map(prod => {
        const varNodes = (prod.variants || []).map(v => {
            const vObj = v.variantId || {};
            const vName = vObj.name || v.name || "Variant";
            const vId = vObj._id || v._id;
            return { type: "variant", id: vId, name: vName, subtitle: currencySymbol + (v.sellingPrice || v.price || 0) };
        });
        return { type: "product", id: prod._id, name: prod.name, subtitle: prod.useVariants ? "" : currencySymbol + (prod.sellingPrice || prod.price || 0), children: varNodes };
      });
      return { type: "productCategory", id: cat._id, name: cat.name, children: prodNodes };
    });
    
    const catNamesAndIds = new Set(productCategories.map(c => c.name));
    productCategories.forEach(c => catNamesAndIds.add(c._id));
    
    const uncatProducts = products.filter(p => !p.category || !catNamesAndIds.has(p.category));
    const uncatProdNodes = uncatProducts.map(prod => {
        const varNodes = (prod.variants || []).map(v => {
            const vObj = v.variantId || {};
            const vName = vObj.name || v.name || "Variant";
            const vId = vObj._id || v._id;
            return { type: "variant", id: vId, name: vName, subtitle: currencySymbol + (v.sellingPrice || v.price || 0) };
        });
        return { type: "product", id: prod._id, name: prod.name, subtitle: prod.useVariants ? "" : currencySymbol + (prod.sellingPrice || prod.price || 0), children: varNodes };
    });
    
    return [...catNodes, ...uncatProdNodes];
  }, [productCategories, products, currencySymbol]);

  // Filter trees based on search
  const filterTree = (nodes, query) => {
    if (!query) return nodes;
    const lowerQuery = query.toLowerCase();
    
    return nodes.map(node => {
      const match = node.name.toLowerCase().includes(lowerQuery);
      if (node.children) {
        const filteredChildren = filterTree(node.children, query);
        if (match || filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
      } else if (match) {
        return node;
      }
      return null;
    }).filter(Boolean);
  };

  const displayServiceTree = filterTree(serviceTree, searchQuery);
  const displayProductTree = filterTree(productTree, searchQuery);

  return (
    <div className="flex flex-col md:flex-row h-auto md:h-[600px] bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border rounded-xl overflow-hidden mt-6">
      {snack.message && (
        <Snackbar message={snack.message} type={snack.type} onClose={() => setSnack({ message: "", type: "success" })} />
      )}

      <aside className="w-full md:w-[350px] lg:w-[400px] flex flex-col h-[500px] md:h-auto md:min-h-0 bg-white dark:bg-dark-card border-b md:border-b-0 md:border-r border-gray-100 dark:border-dark-border">
        <div className="p-4 border-b border-gray-100 dark:border-dark-border">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Tag size={20} className="text-brand-primary dark:text-blue-400" />
            Manage Offers
          </h2>
        </div>

        {/* Create/Edit Form */}
        <div className="p-4 bg-gray-50/50 dark:bg-dark-bg/20 border-b border-gray-100 dark:border-dark-border">
          <form onSubmit={handleCreateOrUpdateOffer} className="space-y-3">
            <div>
              <label className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Offer Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none"
                placeholder="e.g. Summer Sale"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Discount</label>
                <CustomDropdown
                  value={formData.discountType}
                  onChange={e => setFormData({ ...formData, discountType: e.target.value })}
                  options={[
                    { value: "percentage", label: "Percentage (%)" },
                    { value: "amount", label: "Fixed Amount" }
                  ]}
                  buttonClassName="w-full flex items-center justify-between bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm px-3 py-[9px] outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div className="flex-1">
                <label className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Value</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.discountValue}
                  onChange={e => setFormData({ ...formData, discountValue: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1 block">End Date & Time</label>
              <input
                type="datetime-local"
                required
                value={formData.endTime}
                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Applies To</label>
              <CustomDropdown
                value={formData.applicableType}
                onChange={e => setFormData({ ...formData, applicableType: e.target.value })}
                options={[
                  { value: "all", label: "All Items" },
                  { value: "all_services", label: "All Services" },
                  { value: "all_products", label: "All Products" },
                  { value: "specific", label: "Specific Items (Select on Right)" }
                ]}
                buttonClassName="w-full flex items-center justify-between bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm px-3 py-[9px] outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {isEditing ? <Save size={16} /> : <Plus size={16} />}
                {isEditing ? "Update Offer" : "Create Offer"}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedOfferId(null);
                    setFormData({
                      name: "",
                      discountType: "percentage",
                      discountValue: 0,
                      endTime: "",
                      applicableType: "all",
                      applicableServices: [],
                      applicableProducts: [],
                      applicableDepartments: [],
                      applicableServiceCategories: [],
                      applicableProductCategories: [],
                      applicableVariants: [],
                    });
                  }}
                  className="px-3 py-2 bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-dark-border text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Offer List */}
        <div className="flex-1 overflow-y-auto">
          {loadingOffers ? (
            <div className="flex justify-center p-8"><Loader2 size={24} className="animate-spin text-brand-primary dark:text-blue-400" /></div>
          ) : offers.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">No offers created yet.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-dark-border">
              {offers.map(offer => {
                const isActive = new Date(offer.endTime) > new Date();
                const isSelected = selectedOfferId === offer._id;
                return (
                  <div 
                    key={offer._id}
                    onClick={(e) => handleEditClick(e, offer)}
                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors border-l-4 ${isSelected ? "border-brand-primary bg-brand-primary/5" : "border-transparent hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-card"}`}
                  >
                    <div>
                      <h3 className={`font-bold ${isSelected ? "text-brand-primary" : "text-gray-900 dark:text-white"}`}>
                        {offer.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="text-brand-primary dark:text-blue-400 font-medium">
                          {offer.discountType === 'percentage' ? `${offer.discountValue}% Off` : `Fixed: ${currencySymbol}${offer.discountValue}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${isActive ? "bg-emerald-100 text-emerald-700 dark:text-emerald-400" : "bg-red-100 text-red-700"}`}>
                          {isActive ? "Active" : "Expired"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => handleDeleteOffer(e, offer._id)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-lg hover:bg-white dark:bg-dark-surface/50 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT PANE (Item Selection) */}
      <main className="flex-1 flex flex-col h-[600px] md:h-auto md:min-h-0 bg-white dark:bg-dark-bg relative">
        {formData.applicableType !== "specific" && (
          <div className="absolute inset-0 bg-white/60 dark:bg-dark-bg/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center">
            <Tag size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Specific Items Not Required</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md text-center">
              This offer is set to apply to {formData.applicableType === "all" ? "All Items" : formData.applicableType === "all_services" ? "All Services" : "All Products"}. Select "Specific Items" from the dropdown to manually choose eligible items.
            </p>
          </div>
        )}

        <div className="p-4 border-b border-gray-100 dark:border-dark-border sticky top-0 bg-white dark:bg-dark-bg z-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Select Applicable Items
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex bg-gray-100 dark:bg-dark-card p-1 rounded-lg overflow-x-auto [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setActiveTab("services")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === "services" ? "bg-white dark:bg-dark-surface shadow-sm text-brand-primary dark:text-blue-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
              >
                <Scissors size={16} /> Services
              </button>
              <button
                onClick={() => setActiveTab("products")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === "products" ? "bg-white dark:bg-dark-surface shadow-sm text-brand-primary dark:text-blue-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
              >
                <Package size={16} /> Products
              </button>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input 
                type="text" 
                placeholder="Search items..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 border border-gray-200 dark:border-dark-border rounded-lg text-sm bg-gray-50 dark:bg-dark-card outline-none text-gray-900 dark:text-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 w-full"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loadingItems ? (
            <div className="flex justify-center p-12"><Loader2 size={32} className="animate-spin text-brand-primary dark:text-blue-400" /></div>
          ) : activeTab === "services" ? (
            <div className="flex flex-col w-full">
              {displayServiceTree.map(node => (
                <TreeNode 
                  key={`${selectedOfferId || 'new'}-${node.type}-${node.id}`} 
                  node={node} 
                  formData={formData} 
                  toggleItemSelection={toggleItemSelection} 
                  searchQuery={searchQuery}
                />
              ))}
              {displayServiceTree.length === 0 && (
                <div className="text-center text-gray-400 p-4">No matching services found</div>
              )}
            </div>
          ) : (
            <div className="flex flex-col w-full">
              {displayProductTree.map(node => (
                <TreeNode 
                  key={`${selectedOfferId || 'new'}-${node.type}-${node.id}`} 
                  node={node} 
                  formData={formData} 
                  toggleItemSelection={toggleItemSelection} 
                  searchQuery={searchQuery}
                />
              ))}
              {displayProductTree.length === 0 && (
                <div className="text-center text-gray-400 p-4">No matching products found</div>
              )}
            </div>
          )}
        </div>
      </main>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setOfferToDelete(null);
        }}
        onConfirm={confirmDeleteOffer}
        title="Delete Offer"
        message="Are you sure you want to delete this offer?"
        confirmLabel="Delete"
      />
    </div>
  );
};

export default OffersManager;
