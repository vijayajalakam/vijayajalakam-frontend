import { useState, useEffect, useRef } from "react";
import { 
  useGetShopsQuery, 
  useLazyGetSlotSettingsQuery, 
  useLazyGetBlockSlotsQuery 
} from "../../../store/api/tenantEndpoints";
import { 
  useUpdateSlotSettingsMutation, 
  useUpdateBlockSlotsMutation 
} from "../../../store/api/tenantCrudEndpoints";
import {
  Calendar,
  Clock,
  Lock,
  Check,
  Building,
  ChevronDown,
} from "lucide-react";
import moment from "moment";
import CustomDatePicker from "../../../components/shared/CustomDatePicker";
import { motion as Motion, AnimatePresence } from "framer-motion";
import Snackbar from "../../../components/shared/Snackbar";
import { useAuth } from "../../auth/hooks/useAuth";

const SlotManager = () => {
  const { hasPermission } = useAuth();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [settings, setSettings] = useState({
    operatingHours: [],
    maxBookingWindow: 30,
  });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    moment().format("YYYY-MM-DD"),
  );
  const [daySlots, setDaySlots] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [isFullDayBlocked, setIsFullDayBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  const [apiError, setApiError] = useState("");
  const [snack, setSnack] = useState({ message: "", type: "success" });
  const showSnack = (message, type = "success") => setSnack({ message, type });

  // RTK Queries
  const { data: shopsRaw, isLoading: loadingShops } = useGetShopsQuery("");
  const [getSlotSettings] = useLazyGetSlotSettingsQuery();
  const [getBlockSlots] = useLazyGetBlockSlotsQuery();
  const [updateSlotSettings] = useUpdateSlotSettingsMutation();
  const [updateBlockSlots] = useUpdateBlockSlotsMutation();

  // Track initialization to prevent saving on mount
  const isSettingsInitialized = useRef(false);
  const isBlocksInitialized = useRef(false);

  // Auto-save settings when operatingHours change
  useEffect(() => {
    if (!isSettingsInitialized.current) return;
    if (!hasPermission("services:slots:general:edit_schedule")) return;
    if (!selectedBranch || settings.operatingHours.length === 0) return;

    const saveSettings = async () => {
      try {
        await updateSlotSettings({
          ...settings,
          branchId: selectedBranch,
        }).unwrap();
        showSnack("Schedule updated successfully", "success");
      } catch (err) {
        const msg = err?.data?.message || err?.message || "Failed to save schedule";
        showSnack(msg, "error");
      }
    };

    const timeoutId = setTimeout(saveSettings, 500);
    return () => clearTimeout(timeoutId);
  }, [settings, selectedBranch, hasPermission]);

  // Auto-save block slots when they change
  useEffect(() => {
    if (!isBlocksInitialized.current) return;
    if (!hasPermission("services:slots:general:block_slots")) return;
    if (!selectedBranch || !selectedDate) return;

    const saveBlocks = async () => {
      try {
        await updateBlockSlots({
          date: selectedDate,
          slots: blockedSlots,
          isFullDayBlocked,
          reason: blockReason,
          branchId: selectedBranch,
        }).unwrap();
        showSnack("Block slots updated successfully", "success");
      } catch (err) {
        const msg = err?.data?.message || err?.message || "Failed to update block slots";
        showSnack(msg, "error");
      }
    };

    const timeoutId = setTimeout(saveBlocks, 500);
    return () => clearTimeout(timeoutId);
  }, [
    blockedSlots,
    isFullDayBlocked,
    blockReason,
    selectedBranch,
    selectedDate,
    hasPermission
  ]);

  const handleSettingsChange = (updater) => {
    setSettings((prev) => {
      return typeof updater === "function" ? updater(prev) : updater;
    });
  };

  useEffect(() => {
    if (shopsRaw && shopsRaw.length > 0) {
      setBranches(shopsRaw);
      if (!selectedBranch) setSelectedBranch(shopsRaw[0]._id);
    } else if (shopsRaw?.length === 0) {
      setApiError("No branches found. Please create a branch first.");
    }
  }, [shopsRaw, selectedBranch]);

  useEffect(() => {
    if (selectedBranch) {
      const fetchSettings = async () => {
        try {
          setLoading(true);
          setApiError("");
          isSettingsInitialized.current = false;
          const res = await getSlotSettings(selectedBranch).unwrap();
          if (res) {
            setSettings(res);
            if (!res?.operatingHours?.length) {
              setApiError("Slot settings loaded but no operating hours found.");
            }
          }
        } catch (err) {
          const msg = err?.data?.message || err?.message || "Failed to load slot settings";
          setApiError(msg);
          console.error("Failed to fetch settings", err);
        } finally {
          setLoading(false);
          setTimeout(() => {
            isSettingsInitialized.current = true;
          }, 100);
        }
      };
      fetchSettings();
    }
  }, [selectedBranch, getSlotSettings]);

  useEffect(() => {
    if (!loading && selectedBranch) {
      const fetchBlocked = async () => {
        try {
          isBlocksInitialized.current = false;
          const res = await getBlockSlots({ date: selectedDate, branchId: selectedBranch }).unwrap();
          if (res) {
            setBlockedSlots(res.slots || []);
            setIsFullDayBlocked(res.isFullDayBlocked || false);
            setBlockReason(res.reason || "");
          } else {
            setBlockedSlots([]);
            setIsFullDayBlocked(false);
            setBlockReason("");
          }
        } catch (err) {
          const msg = err?.data?.message || err?.message || "Failed to load blocked slots";
          setApiError(msg);
          setBlockedSlots([]);
          setIsFullDayBlocked(false);
          setBlockReason("");
        } finally {
          setTimeout(() => {
            isBlocksInitialized.current = true;
          }, 100);
        }
      };
      fetchBlocked();
    }
  }, [selectedDate, loading, selectedBranch, getBlockSlots]);

  useEffect(() => {
    const dayName = moment(selectedDate).format("dddd");
    const daySettings = settings.operatingHours?.find((h) => h.day === dayName);

    let generated = [];
    if (daySettings && daySettings.isOpen) {
      generated = generateTimeSlots(
        daySettings.startTime,
        daySettings.endTime,
        daySettings.slotDuration,
      );
    }
    setDaySlots(generated);
  }, [selectedDate, settings]);

  const generateTimeSlots = (start, end, duration) => {
    const slots = [];
    let current = moment(start, "HH:mm");
    const endTime = moment(end, "HH:mm");

    while (current.isBefore(endTime)) {
      slots.push(current.format("hh:mm A"));
      current.add(duration, "minutes");
    }
    return slots;
  };

  const handleBlockToggle = (slot) => {
    setBlockedSlots((prev) => {
      return prev.includes(slot)
        ? prev.filter((s) => s !== slot)
        : [...prev, slot];
    });
  };

  const handleUpdateIsFullDay = (val) => {
    setIsFullDayBlocked(val);
  };

  const handleUpdateBlockReason = (val) => {
    setBlockReason(val);
  };

  const selectedBranchObj = branches.find((b) => b._id === selectedBranch);

  return (
    <div className="space-y-6 pb-12">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />

      {apiError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-1 bg-red-100 dark:bg-red-800/30 rounded-lg text-red-500 shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-700 dark:text-red-300">{apiError}</p>
            <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">Check permissions or contact support</p>
          </div>
          <button onClick={() => setApiError("")} className="p-1 hover:bg-red-100 dark:hover:bg-red-800/30 rounded-lg text-red-400 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 border border-gray-100 dark:border-dark-border flex flex-col gap-4 animate-pulse">
              <div className="w-1/3 h-6 bg-gray-100 dark:bg-dark-card rounded-lg"></div>
              <div className="w-1/4 h-4 bg-gray-100 dark:bg-dark-card rounded-lg mb-4"></div>
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-full h-12 bg-gray-50 dark:bg-dark-card rounded-xl"
                ></div>
              ))}
            </div>
          </div>
          <div>
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 border border-gray-100 dark:border-dark-border flex flex-col gap-4 animate-pulse h-full">
              <div className="w-1/2 h-6 bg-gray-100 dark:bg-dark-card rounded-lg"></div>
              <div className="w-1/3 h-4 bg-gray-100 dark:bg-dark-card rounded-lg mb-4"></div>
              <div className="w-full h-10 bg-gray-50 dark:bg-dark-card rounded-xl"></div>
              <div className="w-full h-12 bg-gray-50 dark:bg-dark-card rounded-xl"></div>
              <div className="w-full h-32 bg-gray-50 dark:bg-dark-card rounded-xl mt-4"></div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Branch Selector */}
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <Building size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Select Branch
                </h3>
                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                  Configure slots for each branch independently
                </p>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 dark:border-dark-border rounded-xl hover:border-brand-primary/30 hover:bg-white dark:bg-dark-surface transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  {selectedBranchObj?.image?.url ? (
                    <img
                      src={selectedBranchObj.image.url}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                      <Building size={16} className="text-brand-primary dark:text-blue-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">
                      {selectedBranchObj?.name || "Select a branch"}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                      {selectedBranchObj?.mapAddress || selectedBranchObj?.address || ""}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${branchDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {branchDropdownOpen && (
                  <Motion.div
                    initial={{ opacity: 0, y: -5, scaleY: 0.95 }}
                    animate={{ opacity: 1, y: 0, scaleY: 1 }}
                    exit={{ opacity: 0, y: -5, scaleY: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl overflow-hidden"
                  >
                    {branches.map((branch) => (
                      <button
                        key={branch._id}
                        onClick={() => {
                          setSelectedBranch(branch._id);
                          setBranchDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3 hover:bg-brand-primary/5 transition-all text-left ${
                          selectedBranch === branch._id
                            ? "bg-brand-primary/5 border-l-2 border-brand-primary"
                            : ""
                        }`}
                      >
                        {branch.image?.url ? (
                          <img
                            src={branch.image.url}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-card flex items-center justify-center">
                            <Building size={16} className="text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                        <div>
                          <p
                            className={`font-bold text-sm ${selectedBranch === branch._id ? "text-brand-primary" : "text-gray-700 dark:text-gray-300"}`}
                          >
                            {branch.name}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">
                            {branch.mapAddress || branch.address}
                          </p>
                        </div>
                        {selectedBranch === branch._id && (
                          <Check
                            size={16}
                            className="ml-auto text-brand-primary dark:text-blue-400"
                          />
                        )}
                      </button>
                    ))}
                  </Motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {!selectedBranch ? (
            <Motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-dark-surface rounded-2xl p-12 border border-gray-100 dark:border-dark-border flex flex-col items-center justify-center text-center shadow-none"
            >
              <div className="w-16 h-16 bg-gray-50 dark:bg-dark-card rounded-2xl flex items-center justify-center mb-4">
                <Building size={28} className="text-gray-300" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                Select a Branch
              </h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 max-w-sm">
                Choose a branch above to configure its weekly schedule and
                manage slot blocking.
              </p>
            </Motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Weekly Schedule */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 border border-gray-100 dark:border-dark-border shadow-none">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                    <div className="p-2.5 bg-brand-primary/5 text-brand-primary dark:text-blue-400 rounded-xl">
                      <Clock size={20} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                        Weekly Schedule
                      </h3>
                      <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
                        Set standard hours for{" "}
                        <span className="text-brand-primary dark:text-blue-400 font-bold">
                          {selectedBranchObj?.name}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Common Header */}
                    <div className="flex items-center gap-4 px-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      <div className="w-36">Day</div>
                      <div className="flex-1 grid grid-cols-4 gap-3 text-center">
                        <div>Opening Time</div>
                        <div>Closing Time</div>
                        <div>Slot Duration</div>
                        <div>Booking Capacity</div>
                      </div>
                    </div>

                    {settings.operatingHours?.map((dayConfig, index) => (
                      <Motion.div
                        key={dayConfig.day}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`relative group border rounded-2xl p-3 transition-all duration-200 ${
                          dayConfig.isOpen
                            ? "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border hover:border-brand-primary/20"
                            : "bg-gray-50 dark:bg-dark-card/50 border-transparent opacity-70"
                        }`}
                      >
                        <div className="flex flex-wrap md:flex-nowrap items-center gap-4">
                          {/* Day & Toggle */}
                          <div className="w-full md:w-36 flex items-center justify-between md:justify-start gap-3">
                            <div
                              onClick={() => {
                                handleSettingsChange((prev) => {
                                  const newHours = [...prev.operatingHours];
                                  newHours[index] = {
                                    ...newHours[index],
                                    isOpen: !newHours[index].isOpen,
                                  };
                                  return { ...prev, operatingHours: newHours };
                                });
                              }}
                              className={`relative w-10 h-6 rounded-full cursor-pointer transition-all duration-300 ease-in-out ${
                                dayConfig.isOpen
                                  ? "bg-brand-primary"
                                  : "bg-gray-200 dark:bg-dark-border"
                              }`}
                            >
                              <Motion.div
                                className="absolute top-1 left-1 bg-white dark:bg-dark-surface w-4 h-4 rounded-full border border-gray-100 dark:border-dark-border"
                                animate={{ x: dayConfig.isOpen ? 16 : 0 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 500,
                                  damping: 30,
                                }}
                              />
                            </div>
                            <span
                              className={`font-bold text-sm ${dayConfig.isOpen ? "text-gray-900 dark:text-white" : "text-gray-400"}`}
                            >
                              {dayConfig.day}
                            </span>
                          </div>

                          {/* Inputs */}
                          <div
                            className={`flex-1 grid grid-cols-4 gap-3 transition-opacity duration-200 ${!dayConfig.isOpen ? "opacity-30 pointer-events-none" : ""}`}
                          >
                            <div className="relative group/input">
                              <input
                                type="time"
                                value={dayConfig.startTime}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleSettingsChange((prev) => {
                                    const newHours = [...prev.operatingHours];
                                    newHours[index] = {
                                      ...newHours[index],
                                      startTime: val,
                                    };
                                    return {
                                      ...prev,
                                      operatingHours: newHours,
                                    };
                                  });
                                }}
                                className="w-full bg-gray-50/50 group-hover/input:bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg px-2 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/5 transition-all text-center shadow-none"
                              />
                            </div>
                            <div className="relative group/input">
                              <input
                                type="time"
                                value={dayConfig.endTime}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleSettingsChange((prev) => {
                                    const newHours = [...prev.operatingHours];
                                    newHours[index] = {
                                      ...newHours[index],
                                      endTime: val,
                                    };
                                    return {
                                      ...prev,
                                      operatingHours: newHours,
                                    };
                                  });
                                }}
                                className="w-full bg-gray-50/50 group-hover/input:bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg px-2 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/5 transition-all text-center shadow-none"
                              />
                            </div>
                            <div className="relative group/input">
                              <input
                                type="number"
                                value={dayConfig.slotDuration}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  handleSettingsChange((prev) => {
                                    const newHours = [...prev.operatingHours];
                                    newHours[index] = {
                                      ...newHours[index],
                                      slotDuration: val,
                                    };
                                    return {
                                      ...prev,
                                      operatingHours: newHours,
                                    };
                                  });
                                }}
                                className="w-full bg-gray-50/50 group-hover/input:bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg px-2 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/5 transition-all text-center shadow-none"
                              />
                            </div>
                            <div className="relative group/input">
                              <input
                                type="number"
                                placeholder={settings.staffCount || 0}
                                value={dayConfig.bookingCapacity || ""}
                                onChange={(e) => {
                                  let val = e.target.value === "" ? 0 : Number(e.target.value);
                                  if (val < 0) val = 0;
                                  handleSettingsChange((prev) => {
                                    const newHours = [...prev.operatingHours];
                                    newHours[index] = {
                                      ...newHours[index],
                                      bookingCapacity: val,
                                    };
                                    return {
                                      ...prev,
                                      operatingHours: newHours,
                                    };
                                  });
                                }}
                                className={`w-full bg-gray-50/50 group-hover/input:bg-white dark:bg-dark-surface border rounded-lg px-2 py-2 text-xs font-bold outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/5 transition-all text-center shadow-none ${
                                  !dayConfig.bookingCapacity || dayConfig.bookingCapacity === 0
                                    ? "text-brand-primary border-brand-primary/20"
                                    : "text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-border"
                                }`}
                              />
                              {(!dayConfig.bookingCapacity || dayConfig.bookingCapacity === 0) && (
                                <div className="absolute top-[-14px] left-0 right-0 flex justify-center">
                                  <span className="text-[8px] font-bold text-brand-primary dark:text-blue-400 bg-brand-primary/5 px-1 rounded">
                                    AUTO
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {!dayConfig.isOpen && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="bg-white dark:bg-dark-surface/90 backdrop-blur-sm px-3 py-1 rounded-lg text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest border border-gray-100 dark:border-dark-border">
                              Closed
                            </span>
                          </div>
                        )}
                      </Motion.div>
                    ))}
                  </div>

                  {/* Max Booking Window */}
                  <div className="mt-6 pt-5 border-t border-gray-100 dark:border-dark-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Maximum Booking Window</h4>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">How far in advance customers can book</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="730"
                          value={settings.maxBookingWindow || 60}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(730, Number(e.target.value) || 60));
                            handleSettingsChange((prev) => ({ ...prev, maxBookingWindow: val }));
                          }}
                          className="w-16 px-2 py-2 text-center text-sm font-bold bg-gray-50 border border-gray-100 dark:border-dark-border rounded-xl outline-none focus:bg-white dark:bg-dark-surface focus:border-brand-primary transition-all"
                        />
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">days</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {[
                        { label: "2 weeks", value: 14 },
                        { label: "1 month", value: 30 },
                        { label: "2 months", value: 60 },
                        { label: "6 months", value: 180 },
                        { label: "1 year", value: 365 },
                      ].map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => handleSettingsChange((prev) => ({ ...prev, maxBookingWindow: preset.value }))}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                            settings.maxBookingWindow === preset.value
                              ? "bg-brand-primary text-white"
                              : "bg-gray-50 dark:bg-dark-card text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-card"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-full flex flex-col space-y-4">
                <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 border border-gray-100 dark:border-dark-border h-full flex flex-col relative top-0 shadow-none">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50 flex-none">
                    <div className="p-2.5 bg-red-50 text-red-500 rounded-xl">
                      <Lock size={20} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                        Block Slots
                      </h3>
                      <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
                        Manage exceptions for{" "}
                        <span className="text-red-500 font-bold">
                          {selectedBranchObj?.name}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="p-2 bg-gray-50 dark:bg-dark-card rounded-xl flex-none">
                      <CustomDatePicker
                        label="Select Date"
                        value={selectedDate}
                        onChange={setSelectedDate}
                        className="p-2"
                      />
                    </div>

                    <div
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-white dark:bg-dark-surface border border-transparent hover:border-gray-100 dark:border-dark-border transition-all flex-none"
                      onClick={() => handleUpdateIsFullDay(!isFullDayBlocked)}
                    >
                      <span className="font-bold text-sm text-gray-700 dark:text-gray-300">
                        Block Full Day
                      </span>
                      <div
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-300 ${isFullDayBlocked ? "bg-red-500" : "bg-gray-300"}`}
                      >
                        <Motion.div
                          className="bg-white dark:bg-dark-surface w-4 h-4 rounded-full border border-gray-100 dark:border-dark-border"
                          animate={{ x: isFullDayBlocked ? 16 : 0 }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-none">
                      <input
                        type="text"
                        placeholder="Reason (Optional)"
                        value={blockReason}
                        onChange={(e) =>
                          handleUpdateBlockReason(e.target.value)
                        }
                        className="w-full p-3 bg-gray-50 border border-gray-100 dark:border-dark-border rounded-xl text-sm font-medium text-gray-900 dark:text-white outline-none focus:bg-white dark:bg-dark-surface focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/5 transition-all placeholder:text-gray-400"
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-50 flex-1 flex flex-col min-h-0">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center justify-between text-sm flex-none">
                        <span>Available Slots</span>
                        <span className="text-[10px] font-bold text-brand-primary dark:text-blue-400 bg-brand-primary/5 px-2 py-0.5 rounded border border-brand-primary/10">
                          {daySlots.length}
                        </span>
                      </h4>

                      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[150px]">
                        {isFullDayBlocked ? (
                          <Motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center h-full min-h-[120px] bg-red-50 rounded-xl border border-dashed border-red-200 text-red-400"
                          >
                            <Lock size={20} className="mb-1" />
                            <p className="font-bold text-xs">Blocked</p>
                          </Motion.div>
                        ) : daySlots.length > 0 ? (
                          <div className="grid grid-cols-3 gap-1.5 pb-2">
                            {daySlots.map((slot) => (
                              <Motion.button
                                key={slot}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleBlockToggle(slot)}
                                className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all border ${
                                  blockedSlots.includes(slot)
                                    ? "bg-red-500 text-white border-red-500"
                                    : "bg-white dark:bg-dark-surface text-gray-600 dark:text-gray-400 border-gray-100 dark:border-dark-border hover:border-brand-primary/30 hover:bg-brand-primary/5"
                                }`}
                              >
                                {slot}
                              </Motion.button>
                            ))}
                          </div>
                        ) : (
                          <Motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-full min-h-[120px] bg-gray-50 dark:bg-dark-card rounded-xl border border-dashed border-gray-200 dark:border-dark-border text-gray-400 dark:text-gray-500"
                          >
                            <Clock size={24} className="mb-1 opacity-20" />
                            <p className="font-bold text-xs">Closed</p>
                          </Motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SlotManager;
