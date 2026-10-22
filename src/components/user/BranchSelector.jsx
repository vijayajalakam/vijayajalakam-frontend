import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Store, ArrowRight, MapPin, Navigation } from "lucide-react";
import { useGetShopsQuery } from "../../store/api/tenantEndpoints";
import { setBranch, clearBranch, selectSelectedBranchId } from "../../store/slices/userAppSlice";
import { useAuth } from "../../features/auth/hooks/useAuth";
import api from "../../api/axiosInstance";

import { useParams } from "react-router-dom";

// Haversine formula to calculate distance between two coordinates (in km)
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Premium Branch Selector
 * Handles automatic and manual branch selection for the shopping experience.
 * Shows distance from user and auto-selects nearest branch.
 */
const BranchSelector = ({ forceShow = false, onClose }) => {
  const { shopSlug } = useParams();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const selectedBranchId = useSelector(selectSelectedBranchId);
  const { data: branches = [], isLoading } = useGetShopsQuery(shopSlug, {
    refetchOnMountOrArgChange: true
  });
  const [saving, setSaving] = useState(false);

  // Get user location from localStorage
  const userLocation = useMemo(() => {
    try {
      const saved = localStorage.getItem("vijayajalakam_user_location");
      if (saved) {
        const loc = JSON.parse(saved);
        if (loc.lat && loc.lng) return { lat: loc.lat, lng: loc.lng };
      }
    } catch {}
    return null;
  }, []);

  // Calculate distance for each branch and sort by nearest
  const branchesWithDistance = useMemo(() => {
    if (!branches || branches.length === 0) return [];
    return branches.map((branch) => {
      let distance = null;
      if (userLocation && branch.latitude && branch.longitude) {
        distance = Math.round(haversineDistance(userLocation.lat, userLocation.lng, branch.latitude, branch.longitude));
      }
      return { ...branch, distance };
    }).sort((a, b) => {
      // Sort by distance (nearest first), null distances go last
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  }, [branches, userLocation]);

  useEffect(() => {
    // If selected branch doesn't exist in current shop's branches, clear it
    if (selectedBranchId && branches.length > 0) {
      const exists = branches.some(b => b._id === selectedBranchId);
      if (!exists) {
        dispatch(clearBranch());
      }
    }
  }, [branches, selectedBranchId, dispatch]);

  useEffect(() => {
    // If user is logged in and has a selected branch in database, sync it to localStorage
    if (user?.selectedBranchId && !selectedBranchId) {
      const userBranch = branches.find(b => b._id === user.selectedBranchId);
      if (userBranch) {
        dispatch(
          setBranch({
            id: userBranch._id,
            name: userBranch.name,
            address: userBranch.mapAddress || userBranch.address,
          })
        );
      }
    }
  }, [user, branches, selectedBranchId, dispatch]);

  useEffect(() => {
    // Auto-select: if only one branch, select it; if multiple, select nearest
    if (branches.length === 0 || selectedBranchId || user?.selectedBranchId) return;

    if (branches.length === 1) {
      const branch = branches[0];
      dispatch(
        setBranch({
          id: branch._id,
          name: branch.name,
          address: branch.mapAddress || branch.address,
        })
      );
      if (user) {
        api.put('/user/selected-branch', { branchId: branch._id }).catch(console.error);
      }
    } else if (branchesWithDistance.length > 1 && branchesWithDistance[0].distance !== null) {
      // Auto-select nearest branch
      const nearest = branchesWithDistance[0];
      dispatch(
        setBranch({
          id: nearest._id,
          name: nearest.name,
          address: nearest.mapAddress || nearest.address,
        })
      );
      if (user) {
        api.put('/user/selected-branch', { branchId: nearest._id }).catch(console.error);
      }
    }
  }, [branches, branchesWithDistance, selectedBranchId, user, dispatch]);

  // If already selected and not forced, or still loading, don't show the full UI
  if ((selectedBranchId && !forceShow) || (user?.selectedBranchId && !forceShow) || isLoading) {
    return null;
  }

  // Only show if there are multiple branches and user hasn't selected one yet
  if (branches.length <= 1 && !forceShow) {
    return null;
  }

  const handleSelect = async (branch) => {
    setSaving(true);
    try {
      dispatch(
        setBranch({
          id: branch._id,
          name: branch.name,
          address: branch.mapAddress || branch.address,
        })
      );
      if (user) {
        await api.put('/user/selected-branch', { branchId: branch._id });
      }
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving branch selection:', error);
      if (onClose) onClose();
    } finally {
      setSaving(false);
    }
  };

  // Format distance text
  const getDistanceLabel = (distance) => {
    if (distance === null || distance === undefined) return null;
    if (distance < 1) return "<1 km";
    return `${distance} km`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white dark:bg-dark-surface/20 backdrop-blur-3xl">
      <div className="max-w-2xl w-full glass-effect rounded-[2rem] p-6 sm:p-8 shadow-2xl border border-white/50 animate-fade-up">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-user-accent rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-black/10">
            <Store size={28} className="text-white" />
          </div>
          <h2 className="serif-display text-2xl sm:text-3xl font-bold mb-2">Select a Branch</h2>
          <p className="text-user-text-muted font-medium text-sm">Choose a location to explore services and products.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {branchesWithDistance.map((branch, index) => {
            const distanceLabel = getDistanceLabel(branch.distance);
            const isNearest = index === 0 && branch.distance !== null;
            return (
              <button
                key={branch._id}
                onClick={() => handleSelect(branch)}
                disabled={saving}
                className={`group p-5 rounded-[1.5rem] border text-left transition-all hover:bg-user-accent hover:border-user-accent shadow-sm hover:shadow-2xl hover:shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isNearest ? 'bg-indigo-50 border-indigo-200' : 'bg-white dark:bg-dark-surface border-black/[0.03]'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      isNearest ? 'bg-indigo-100 group-hover:bg-white dark:bg-dark-surface/10' : 'bg-user-accent-soft group-hover:bg-white dark:bg-dark-surface/10'
                    }`}>
                      {isNearest ? (
                        <Navigation size={18} className="text-indigo-600 group-hover:text-white" />
                      ) : (
                        <MapPin size={18} className="text-user-accent group-hover:text-white" />
                      )}
                    </div>
                    {isNearest && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 group-hover:text-white/80 bg-indigo-100 group-hover:bg-white dark:bg-dark-surface/10 px-2 py-0.5 rounded-full">
                        Nearest
                      </span>
                    )}
                  </div>
                  <ArrowRight 
                    size={16} 
                    className="text-user-gold opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" 
                  />
                </div>
                <h3 className="font-bold text-base group-hover:text-white transition-colors">{branch.name}</h3>
                <p className="text-xs text-user-text-muted group-hover:text-white/60 transition-colors mt-1 line-clamp-1">
                  {distanceLabel && (
                    <span className="font-semibold text-gray-700 dark:text-gray-300 group-hover:text-white/80">{distanceLabel}{'>'} </span>
                  )}
                  {branch.mapAddress || branch.address || "Main Street, City Centre"}
                </p>
              </button>
            );
          })}
        </div>

        {branches.length === 0 && !isLoading && (
          <div className="text-center py-8 opacity-50 italic text-sm">
            No active branches found.
          </div>
        )}

        {saving && (
          <div className="text-center mt-4 text-sm text-user-text-muted">
            Saving your selection...
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchSelector;
