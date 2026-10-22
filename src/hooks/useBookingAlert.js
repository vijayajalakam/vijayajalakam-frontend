import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useDispatch } from "react-redux";
import { getSocketURL } from "../api/axiosInstance";
import { incrementBadgeCount } from "../store/slices/bookingBadgeSlice";
import { appApi } from "../store/api/appApi";

const bookingAudio = new Audio("/audio/bookings.mp3");
bookingAudio.preload = "auto";

const ALERT_DURATION_MS = 10000;

export function useBookingAlert({ shopIdStr, enabled, isAdminBookings }) {
  const dispatch = useDispatch();
  const [alert, setAlert] = useState(null);
  const dismissTimerRef = useRef(null);
  const isAdminBookingsRef = useRef(isAdminBookings);

  useEffect(() => {
    isAdminBookingsRef.current = isAdminBookings;
  }, [isAdminBookings]);

  const dismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setAlert(null);
  }, []);

  const showAlert = useCallback(
    (data) => {
      try {
        bookingAudio.currentTime = 0;
        bookingAudio.play().catch((e) => console.log("Audio play failed:", e));
      } catch (err) {
        console.error("Audio playback error:", err);
      }

      setAlert({ ...data, receivedAt: Date.now() });

      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      dismissTimerRef.current = setTimeout(() => {
        setAlert(null);
        dismissTimerRef.current = null;
      }, ALERT_DURATION_MS);
    },
    [],
  );

  useEffect(() => {
    if (!enabled || !shopIdStr) return;

    const cleanShopId = String(shopIdStr);
    const socketUrl = getSocketURL();
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket Connect Error]", err.message, err);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });

    const handleJoin = () => {
      socket.emit("join-shop", cleanShopId);
      console.log(`[Socket] Admin joined shop room: shop-${cleanShopId}`);
    };

    if (socket.connected) {
      handleJoin();
    } else {
      socket.on("connect", handleJoin);
    }

    const handleNewBooking = (data) => {
      console.log("[Socket] Received new-booking event payload:", data);
      showAlert(data);
      
      if (!isAdminBookingsRef.current) {
        dispatch(incrementBadgeCount(1));
      }

      // Trigger automatic RTK Query background refetches
      dispatch(
        appApi.util.invalidateTags([
          { type: "Appointment" },
          { type: "Dashboard" },
          { type: "Notification" },
        ])
      );

      // Trigger a global custom event for standard components to refresh in the background
      window.dispatchEvent(new CustomEvent("new-booking-received", { detail: data }));
    };

    socket.on("new-booking", handleNewBooking);

    return () => {
      socket.off("new-booking", handleNewBooking);
      socket.emit("leave-shop", cleanShopId);
      socket.disconnect();
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [enabled, shopIdStr, showAlert, dispatch]);

  return { alert, dismiss };
}
