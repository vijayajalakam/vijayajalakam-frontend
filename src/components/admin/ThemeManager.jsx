import { useState, useEffect, useRef, useCallback } from "react";
import { Check, Sun, Moon, Palette, RefreshCw, Plus, X } from "lucide-react";
import { useTheme, DEFAULT_PRIMARY_COLOR } from "../../components/shared/ThemeContext";
import Snackbar from "../../components/shared/Snackbar";
import { ThemeSkeleton } from "../shared/Skeleton";
import ColorPicker from "./ColorPicker";
import {
  useUpdateUserThemeMutation,
  useUpdateUserPrimaryColorMutation,
} from "../../store/api/tenantCrudEndpoints";
import { useAuth } from "../../features/auth/hooks/useAuth";

const PRESET_COLORS = [
  { label: "Navy Blue",  hex: "#172554" },
  { label: "Royal Blue", hex: "#1e40af" },
  { label: "Crimson",    hex: "#991b1b" },
  { label: "Emerald",    hex: "#065f46" },
  { label: "Purple",     hex: "#581c87" },
  { label: "Orange",     hex: "#c2410c" },
  { label: "Charcoal",   hex: "#1f2937" },
  { label: "Teal",       hex: "#0f766e" },
  { label: "Brown",      hex: "#92400e" },
];

function isValidHex(val) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val);
}

const ThemeManager = () => {
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme();
  const { hasPermission, isAdmin, updateUser } = useAuth();
  const [updateUserTheme] = useUpdateUserThemeMutation();
  const [updateUserPrimaryColor] = useUpdateUserPrimaryColorMutation();

  const [saving, setSaving] = useState(false);
  const [savingColor, setSavingColor] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showCustom, setShowCustom] = useState(false);
  const [snack, setSnack] = useState({ message: "", type: "success" });
  const pickerAnchorRef = useRef(null);
  const pickerPopupRef = useRef(null);

  // pickerColor tracks the live color inside the picker (not yet saved)
  const [pickerColor, setPickerColor] = useState(primaryColor);

  useEffect(() => { setPickerColor(primaryColor); }, [primaryColor]);

  // Close picker on outside click — no revert since color is auto-saved
  useEffect(() => {
    if (!showCustom) return;
    const handler = (e) => {
      if (
        pickerPopupRef.current && !pickerPopupRef.current.contains(e.target) &&
        pickerAnchorRef.current && !pickerAnchorRef.current.contains(e.target)
      ) {
        setShowCustom(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCustom]);

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const showSnack = (message, type = "success") => setSnack({ message, type });
  const canEdit = isAdmin || hasPermission("settings:manage:theme:edit");

  // ── Light / Dark ────────────────────────────────────────────────────────
  const handleThemeChange = async (newTheme) => {
    if (newTheme === theme || !canEdit) return;
    const prev = theme;
    setSaving(true);
    try {
      setTheme(newTheme);
      updateUser({ theme: newTheme });
      await updateUserTheme({ theme: newTheme }).unwrap();
      showSnack(`${newTheme === "light" ? "Light" : "Dark"} mode applied`);
    } catch {
      setTheme(prev);
      updateUser({ theme: prev });
      showSnack("Failed to update theme", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Primary color ────────────────────────────────────────────────────────
  const applyColor = async (color) => {
    if (!canEdit || !isValidHex(color)) return;
    const prev = primaryColor;
    setSavingColor(true);
    try {
      setPrimaryColor(color);
      updateUser({ primaryColor: color });
      await updateUserPrimaryColor({ primaryColor: color }).unwrap();
      showSnack("Primary color updated");
    } catch {
      setPrimaryColor(prev);
      updateUser({ primaryColor: prev });
      showSnack("Failed to update color", "error");
    } finally {
      setSavingColor(false);
    }
  };

  const handlePresetClick = (hex) => {
    if (!canEdit) return;
    setPickerColor(hex);
    applyColor(hex);
  };

  // Called live as user drags in the picker — debounce save by 600ms
  const saveTimer = useRef(null);
  const handlePickerChange = useCallback((hex) => {
    setPickerColor(hex);
    setPrimaryColor(hex); // instant visual preview
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      applyColor(hex);
    }, 600);
  }, []);  // eslint-disable-line

  const handleReset = () => handlePresetClick(DEFAULT_PRIMARY_COLOR);

  // Is the current primaryColor a custom (non-preset) color?
  const isCustomColor = !PRESET_COLORS.some(
    (c) => c.hex.toLowerCase() === primaryColor.toLowerCase()
  );

  const themes = [
    { id: "light", name: "Light Mode", icon: Sun,  sub: "Default" },
    { id: "dark",  name: "Dark Mode",  icon: Moon, sub: "Easier on eyes" },
  ];

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-4 sm:p-6 space-y-8">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />

      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-dark-border">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
          <Palette size={20} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Theme Settings</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Personalize your workspace — changes apply only to your account
          </p>
        </div>
      </div>

      {initialLoading ? (
        <ThemeSkeleton />
      ) : (
        <>
          {/* ── Primary Color ── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Primary Color</h4>
              <button
                onClick={handleReset}
                disabled={savingColor || !canEdit}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <RefreshCw size={12} />
                Reset default
              </button>
            </div>

            {/* Swatches row */}
            <div className="flex flex-wrap gap-3 items-center">
              {PRESET_COLORS.map((c) => {
                const isSelected = !isCustomColor && primaryColor.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    title={c.label}
                    onClick={() => handlePresetClick(c.hex)}
                    disabled={savingColor || !canEdit}
                    className="relative w-10 h-10 rounded-full transition-transform hover:scale-110 focus:outline-none flex-shrink-0"
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && (
                      <span
                        className="absolute inset-0 flex items-center justify-center rounded-full"
                        style={{ boxShadow: `0 0 0 2px white, 0 0 0 4px ${c.hex}` }}
                      >
                        <Check size={16} className="text-white" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Custom color swatch — shown only when a custom color is active */}
              {isCustomColor && (
                <button
                  title="Current custom color"
                  onClick={() => setShowCustom(true)}
                  disabled={savingColor || !canEdit}
                  className="relative w-10 h-10 rounded-full transition-transform hover:scale-110 focus:outline-none flex-shrink-0"
                  style={{
                    backgroundColor: primaryColor,
                    boxShadow: `0 0 0 2px white, 0 0 0 4px ${primaryColor}`,
                  }}
                >
                  <span className="absolute inset-0 flex items-center justify-center rounded-full">
                    <Check size={16} className="text-white" strokeWidth={3} />
                  </span>
                </button>
              )}

              {/* + Add custom color button — rainbow ring */}
              <div className="relative flex-shrink-0">
                <button
                  ref={pickerAnchorRef}
                  title="Add custom color"
                  onClick={() => setShowCustom((v) => !v)}
                  disabled={savingColor || !canEdit}
                  className="relative w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none disabled:opacity-50"
                  style={{
                    background: "conic-gradient(#ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0000ff, #8000ff, #ff00ff, #ff0000)",
                    padding: "5px",
                  }}
                >
                  <span className="w-full h-full rounded-full bg-white dark:bg-dark-card flex items-center justify-center">
                    {showCustom
                      ? <X size={13} strokeWidth={2.5} className="text-gray-800 dark:text-gray-200" />
                      : <Plus size={13} strokeWidth={2.5} className="text-gray-800 dark:text-gray-200" />
                    }
                  </span>
                </button>

                {/* ── Floating picker popup — anchored to the + button ── */}
                {showCustom && (
                  <div
                    ref={pickerPopupRef}
                    className="absolute z-50 top-0 left-[calc(100%+10px)]"
                    style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.18))" }}
                  >
                    <ColorPicker color={pickerColor} onChange={handlePickerChange} />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── Display Mode ── */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Display Mode</h4>
            <div className="flex flex-wrap gap-4">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  disabled={saving || !canEdit}
                  className={`relative group rounded-xl border-2 p-1.5 transition-all duration-300 cursor-pointer text-left w-full sm:w-64 flex-shrink-0 ${
                    theme === t.id
                      ? "border-[var(--color-brand-primary)] ring-2 ring-[var(--color-brand-primary)]/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="rounded-xl overflow-hidden">
                    <div className={`${t.id === "light" ? "bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border" : "bg-gray-900 border-b border-gray-800"} px-4 py-3 flex items-center gap-2`}>
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                      <div className={`ml-auto w-16 h-2 rounded-full ${t.id === "light" ? "bg-gray-100 dark:bg-dark-card" : "bg-gray-700"}`} />
                    </div>
                    <div className={`${t.id === "light" ? "bg-gray-50 dark:bg-dark-card" : "bg-gray-950"} px-4 py-5 flex gap-3`}>
                      <div className="w-12 space-y-2">
                        {[0,1,2,3].map((i) => (
                          <div key={i} className={`h-2 rounded-full ${i === 2 ? (t.id === "light" ? "bg-[var(--color-brand-primary)]/30" : "bg-blue-500/40") : (t.id === "light" ? "bg-gray-200 dark:bg-dark-border" : "bg-gray-700")}`} />
                        ))}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className={`h-8 rounded-lg border ${t.id === "light" ? "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border" : "bg-gray-800 border-gray-700"}`} />
                        <div className="flex gap-2">
                          <div className={`h-6 flex-1 rounded-lg border ${t.id === "light" ? "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border" : "bg-gray-800 border-gray-700"}`} />
                          <div className={`h-6 flex-1 rounded-lg border ${t.id === "light" ? "bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border" : "bg-gray-800 border-gray-700"}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme === t.id ? "bg-[var(--color-brand-primary)] text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
                        <t.icon size={18} />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-bold text-gray-900 dark:text-white block">{t.name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{t.sub}</span>
                      </div>
                    </div>
                    {theme === t.id && (
                      <div className="w-6 h-6 rounded-full bg-[var(--color-brand-primary)] flex items-center justify-center">
                        <Check size={14} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default ThemeManager;
