import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { ThemeContext, DEFAULT_PRIMARY_COLOR } from "./ThemeContext";

// Derive a lighter shade (~60% lighter) and a soft tint for ring/hover effects
function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function lighten(hex, amount = 0.4) {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function applyPrimaryColor(color) {
  const root = document.documentElement;
  const [r, g, b] = hexToRgb(color);
  // Override the Tailwind v4 @theme CSS variables at runtime
  root.style.setProperty("--color-brand-primary", color);
  root.style.setProperty("--color-brand-secondary", lighten(color, 0.15));
  root.style.setProperty("--color-brand-accent", lighten(color, 0.35));
  root.style.setProperty("--color-brand-primary-rgb", `${r}, ${g}, ${b}`);
  // Also set on :root via a style tag for maximum compatibility
  let styleTag = document.getElementById("__primary-color-override__");
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "__primary-color-override__";
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = `:root {
    --color-brand-primary: ${color} !important;
    --color-brand-secondary: ${lighten(color, 0.15)} !important;
    --color-brand-accent: ${lighten(color, 0.35)} !important;
    --color-brand-primary-rgb: ${r}, ${g}, ${b} !important;
  }`;
}

const ThemeProviderInner = ({ children }) => {
  const { user } = useAuth();
  const hasInitialized = useRef(false);
  const userIdRef = useRef(null);

  // Initialize theme from localStorage first (per-user preference)
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return "light";
    
    // Try to get user-specific theme preference first
    const savedTheme = localStorage.getItem("vijayajalakam-user-theme");
    if (savedTheme) return savedTheme;
    
    // Fallback to legacy key
    const legacyTheme = localStorage.getItem("vijayajalakam-theme");
    if (legacyTheme) return legacyTheme;
    
    return "light";
  });

  const [primaryColor, setPrimaryColorState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_PRIMARY_COLOR;
    
    const savedColor = localStorage.getItem("vijayajalakam-primary-color");
    if (savedColor) return savedColor;
    
    // Fallback to legacy key
    const legacyColor = localStorage.getItem("vijayajalakam-primary-color");
    return legacyColor || DEFAULT_PRIMARY_COLOR;
  });

  // Custom setTheme that persists to localStorage
  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem("vijayajalakam-user-theme", newTheme);
    
    // Also keep legacy key for compatibility
    localStorage.setItem("vijayajalakam-theme", newTheme);
  }, []);

  // Sync theme from user preference ONLY on first login or user change
  useEffect(() => {
    if (user) {
      const currentUserId = user._id || user.id;
      
      // Check if this is a new user login
      if (userIdRef.current !== currentUserId) {
        userIdRef.current = currentUserId;
        
        // Only sync from user preference if localStorage doesn't have a saved theme yet
        const savedTheme = localStorage.getItem("vijayajalakam-user-theme");
        
        if (!savedTheme && user.theme) {
          // First time login - use user's saved theme preference
          setTheme(user.theme);
        }
        
        // Always sync primary color from user preference
        const userColor = user.primaryColor || DEFAULT_PRIMARY_COLOR;
        setPrimaryColorState(userColor);
        localStorage.setItem("vijayajalakam-primary-color", userColor);
        applyPrimaryColor(userColor);
      }
    } else {
      // User logged out - reset user ID
      userIdRef.current = null;
    }
  }, [user, setTheme]);

  // Apply/remove .dark class on <html> whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    // Ensure localStorage is always in sync
    localStorage.setItem("vijayajalakam-user-theme", theme);
    localStorage.setItem("vijayajalakam-theme", theme);
  }, [theme]);

  // Apply primary color CSS variable whenever it changes
  useEffect(() => {
    applyPrimaryColor(primaryColor);
    localStorage.setItem("vijayajalakam-primary-color", primaryColor);
    localStorage.setItem("vijayajalakam-primary-color", primaryColor);
  }, [primaryColor]);

  const setPrimaryColor = useCallback((color) => {
    setPrimaryColorState(color);
    localStorage.setItem("vijayajalakam-primary-color", color);
    localStorage.setItem("vijayajalakam-primary-color", color);
  }, []);

  const value = { theme, setTheme, primaryColor, setPrimaryColor };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProviderInner;
