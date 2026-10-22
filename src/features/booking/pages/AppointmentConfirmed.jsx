import React, { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Check } from "lucide-react";
import { clearBookingFlow } from "../../../store/slices/bookingFlowSlice";

const AppointmentConfirmed = () => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const appointmentId = location.state?.appointmentId;

  // Play booking confirmation chime
  useEffect(() => {
    try {
      const audio = new Audio("/audio/invoice.mp3");
      audio.play().catch((err) => console.log("Audio play failed:", err));
    } catch (e) {
      console.error("Audio error:", e);
    }
  }, []);

  useEffect(() => {
    // After 2 seconds, go to the booking details.
    const timer = setTimeout(() => {
      dispatch(clearBookingFlow());
      if (appointmentId) {
        // Desktop: open the Bookings list and show this booking in the right detail panel.
        // Mobile: open the standalone full-screen booking details page.
        const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
        if (isDesktop) {
          navigate(`/${shopSlug}/user/bookings`, {
            replace: true,
            state: { selectedBookingId: appointmentId },
          });
        } else {
          navigate(`/${shopSlug}/user/booking/${appointmentId}`, { replace: true });
        }
      } else {
        navigate(`/${shopSlug}/user/home`, { replace: true });
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [appointmentId, dispatch, navigate, shopSlug]);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center text-white"
      style={{
        background: "radial-gradient(circle at 30% 30%, #a5d8e6 0%, #6b5bff 35%, #4f3eff 60%, #2e1ed1 90%)",
      }}
    >
      {/* Animated checkmark */}
      <div className="mb-6 animate-fadeInScale">
        <Check size={96} strokeWidth={3} className="text-white drop-shadow-lg" />
      </div>

      {/* Title */}
      <h1
        className="text-[42px] font-bold text-center leading-tight px-6"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        Appointment<br />confirmed
      </h1>

      <style>{`
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-fadeInScale {
          animation: fadeInScale 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default AppointmentConfirmed;
