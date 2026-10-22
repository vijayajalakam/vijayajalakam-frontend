import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { clearBookingFlow } from "../../../store/slices/bookingFlowSlice";

/**
 * Hook to manage booking flow exit confirmation.
 * Returns { showExitSheet, openExit, cancelExit, confirmExit }.
 * On confirm, clears the booking flow state and navigates to the shop's home > services section.
 */
export const useExitBooking = () => {
  const navigate = useNavigate();
  const { shopSlug } = useParams();
  const dispatch = useDispatch();
  const [showExitSheet, setShowExitSheet] = useState(false);

  const openExit = useCallback(() => setShowExitSheet(true), []);
  const cancelExit = useCallback(() => setShowExitSheet(false), []);

  const confirmExit = useCallback(() => {
    dispatch(clearBookingFlow());
    setShowExitSheet(false);
    // Navigate to shop home with hash to scroll to services
    const target = shopSlug ? `/${shopSlug}/user/home#services` : "/user/home";
    navigate(target, { replace: true });
  }, [dispatch, navigate, shopSlug]);

  return { showExitSheet, openExit, cancelExit, confirmExit };
};
