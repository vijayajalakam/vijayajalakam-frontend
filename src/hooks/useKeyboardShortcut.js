import { useEffect, useRef } from "react";

/**
 * Custom hook to handle keyboard shortcuts
 * @param {string} key - The key to listen for (e.g., 'n', 'Enter')
 * @param {function} callback - Function to execute when shortcut is pressed
 * @param {object} options - Configuration options
 * @param {boolean} options.ctrl - Whether Ctrl key is required (default: false)
 * @param {boolean} options.shift - Whether Shift key is required (default: false)
 * @param {boolean} options.alt - Whether Alt key is required (default: false)
 * @param {boolean} options.preventDefault - Whether to call e.preventDefault() (default: true)
 * @param {boolean} options.disabled - Whether the shortcut is disabled (default: false)
 */
export const useKeyboardShortcut = (key, callback, options = {}) => {
  const {
    ctrl = false,
    shift = false,
    alt = false,
    preventDefault = true,
    disabled = false,
  } = options;

  // Use a ref to store the latest callback to avoid stale closures 
  // without needing to re-attach the event listener every time the callback changes.
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e) => {
      const keyMatch = e.key.toLowerCase() === key.toLowerCase();
      
      const isModifierValid = 
        (ctrl ? (e.ctrlKey || e.metaKey) : true) &&
        (shift ? e.shiftKey : true) &&
        (alt ? e.altKey : true);

      if (keyMatch && isModifierValid) {
        // Additional check: don't trigger if typing in a textarea or input (unless specified)
        const isTyping = 
          document.activeElement?.tagName === "TEXTAREA" || 
          (document.activeElement?.tagName === "INPUT" && key.toLowerCase() !== "enter");

        if (isTyping && key.toLowerCase() !== "enter") return;

        if (preventDefault) e.preventDefault();
        if (callbackRef.current) {
          callbackRef.current(e);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, ctrl, shift, alt, preventDefault, disabled]);
};
