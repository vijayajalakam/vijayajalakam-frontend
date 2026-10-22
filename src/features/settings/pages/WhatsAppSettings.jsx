import React, { useState, useEffect, useMemo, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { io } from "socket.io-client";
import {
  MessageCircle,
  Power,
  Loader2,
  CheckCircle2,
  XCircle,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  ScanLine,
  Send,
} from "lucide-react";
import api, { getSocketURL } from "../../../api/axiosInstance";
import { useAuth } from "../../auth/hooks/useAuth";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import {
  useGetWhatsappStatusQuery,
  useInitializeWhatsappMutation,
  useDisconnectWhatsappMutation,
  useSendTestMessageMutation,
} from "../../../store/api/whatsappEndpoints";

const WhatsAppSettings = () => {
  const { user } = useAuth();
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState({
    isConnected: false,
    phoneNumber: null,
    loading: true,
    isReconnecting: false,
  });
  const [isInitializing, setIsInitializing] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [qrExpired, setQrExpired] = useState(false);
  // Track if we ever had a QR code shown (to detect scan-in-progress)
  const [hadQr, setHadQr] = useState(false);

  // Test Message State
  const [testPhone, setTestPhone] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testError, setTestError] = useState("");
  const [testSuccess, setTestSuccess] = useState("");
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const testPhoneInitialized = useRef(false);

  // RTK Query Hooks
  const { data: statusRes, refetch: refetchStatus } = useGetWhatsappStatusQuery(undefined, {
    pollingInterval: 3000,
    skip: !status.loading && !qrCode && !hadQr && !isInitializing && !(status.isConnected && !status.phoneNumber),
  });
  const [initializeWhatsapp] = useInitializeWhatsappMutation();
  const [disconnectWhatsapp] = useDisconnectWhatsappMutation();
  const [sendTestMessage] = useSendTestMessageMutation();

  // Update testPhone only once when user profile first loads
  useEffect(() => {
    if (user?.phone && !testPhoneInitialized.current) {
      testPhoneInitialized.current = true;
      // Basic sanitization: remove non-numeric characters
      const sanitized = user.phone.replace(/\D/g, "");
      setTestPhone(sanitized);
    }
  }, [user?.phone]);

  useEffect(() => {
    // Initialize socket connection
    const socketUrl = getSocketURL();

    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("Socket.io connected:", newSocket.id);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket.io connection error:", error);
    });

    // Join shop room
    if (user?.shopId) {
      newSocket.emit("join-shop", user.shopId);
    }

    // Listen for QR code
    newSocket.on("whatsapp-qr", (data) => {
      console.log("QR Code received:", data);
      setHadQr(true);
      setQrCode(data.qr);
      setQrExpired(false);
      setConnectionError(null);
      setIsInitializing(false);
      setStatus({
        isConnected: false,
        phoneNumber: null,
        loading: false,
      });
    });

    // Listen for QR expiry
    newSocket.on("whatsapp-qr-expired", () => {
      console.log("QR Code expired");
      setQrExpired(true);
      setQrCode(null);
    });

    // Listen for status updates
    newSocket.on("whatsapp-status", (data) => {
      console.log("Status update:", data);
      if (data.status === "connected") {
        setStatus({
          isConnected: true,
          phoneNumber: data.phoneNumber,
          loading: false,
          isReconnecting: false,
        });
        setQrCode(null);
        setQrExpired(false);
        setConnectionError(null);
        setIsInitializing(false);
        setHadQr(false);
      } else if (data.status === "authenticating") {
        // QR was scanned, authentication in progress
        console.log("QR scanned, authenticating...");
        setQrCode(null);
        setStatus({
          isConnected: false,
          phoneNumber: null,
          loading: true,
          isReconnecting: false,
        });
        setHadQr(true);
      } else if (data.status === "reconnecting") {
        // Silent reconnection — keep showing as connected with subtle indicator
        console.log("Reconnecting:", data.message);
        setStatus((prev) => ({
          ...prev,
          isReconnecting: true,
          // Keep isConnected: true — don't flip to disconnected
        }));
        // Don't touch QR, errors, or initializing state
      } else if (data.status === "retrying") {
        // Auto-retry in progress (initial connection attempt)
        console.log("Retrying connection:", data.message);
        setConnectionError(null);
        setQrCode(null);
        setStatus({
          isConnected: false,
          phoneNumber: null,
          loading: true,
          isReconnecting: false,
        });
      } else if (data.status === "disconnected") {
        setStatus({
          isConnected: false,
          phoneNumber: null,
          loading: false,
          isReconnecting: false,
        });
        setQrCode(null);
        setIsInitializing(false);
        setHadQr(false);
      } else if (data.status === "failed") {
        setConnectionError(
          data.message || "Connection failed. Please try again.",
        );
        setQrCode(null);
        setIsInitializing(false);
        setStatus({
          isConnected: false,
          phoneNumber: null,
          loading: false,
          isReconnecting: false,
        });
        setHadQr(false);
      }
    });

    return () => {
      if (user?.shopId) {
        newSocket.emit("leave-shop", user.shopId);
      }
      newSocket.close();
    };
  }, [user?.shopId]);

  // Derive scanning state: QR was shown, then disappeared, but not yet connected/failed
  const isScanning = useMemo(() => {
    return (
      !qrCode && hadQr && !status.isConnected && !qrExpired && !connectionError
    );
  }, [qrCode, hadQr, status.isConnected, qrExpired, connectionError]);

  // Fetch initial status on mount using RTK Query result
  useEffect(() => {
    if (statusRes?.success) {
      const statusData = statusRes.data;
      console.log("Fetched status:", statusData);

      setStatus((prev) => ({
        ...prev,
        isConnected: statusData.isConnected,
        phoneNumber: statusData.phoneNumber,
        loading: false,
        isReconnecting: statusData.isReconnecting || false,
      }));

      if (statusData.qrCode) {
        setQrCode(statusData.qrCode);
        setQrExpired(false);
        setIsInitializing(false);
      } else if (statusData.isConnected) {
        // If connected, clear QR code
        setQrCode(null);
        setQrExpired(false);
        setHadQr(false);
        setIsInitializing(false);
      }
    }
  }, [statusRes]);

  const handleInitialize = async () => {
    setIsInitializing(true);
    setConnectionError(null);
    setQrExpired(false);
    setQrCode(null);
    setHadQr(false);
    setStatus({
      isConnected: false,
      phoneNumber: null,
      loading: true,
      isReconnecting: false,
    });
    try {
      const response = await initializeWhatsapp().unwrap();
      if (response.success) {
        console.log("WhatsApp initialization started, waiting for QR code...");
        // Don't set isInitializing to false here - let the socket event handle it
      }
    } catch (error) {
      console.error("Error initializing WhatsApp:", error);
      setConnectionError(
        error.data?.message || "Failed to initialize WhatsApp",
      );
      setStatus({
        isConnected: false,
        phoneNumber: null,
        loading: false,
      });
      setIsInitializing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await disconnectWhatsapp().unwrap();
      if (response.success) {
        setStatus({
          isConnected: false,
          phoneNumber: null,
          loading: false,
        });
        setQrCode(null);
        setQrExpired(false);
        setConnectionError(null);
        setHadQr(false);
      }
    } catch (error) {
      console.error("Error disconnecting WhatsApp:", error);
      alert(error.data?.message || "Failed to disconnect WhatsApp");
    }
  };

  const formatPhoneNumber = (number) => {
    if (!number) return "";
    return `+${number.slice(0, 2)} ${number.slice(2, 7)} ${number.slice(7)}`;
  };

  const handleSendTestMessage = async () => {
    if (!testPhone.trim()) {
      setTestError("Please enter a phone number");
      return;
    }
    setIsSendingTest(true);
    setTestError("");
    setTestSuccess("");
    try {
      const response = await sendTestMessage({
        phoneNumber: testPhone.trim(),
        message:
          "Hello! This is a test message from your Vijayajalakam ERP powered by FABRIOWN. if you receive this, it means your connection is working perfectly!",
      }).unwrap();
      if (response.success) {
        setTestSuccess("Test message sent successfully!");
        setTestPhone("");
      } else {
        setTestError(response.message || "Failed to send test message");
      }
    } catch (error) {
      console.error("Error sending test message:", error);
      setTestError(
        error.data?.message || "Failed to send test message",
      );
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Connection Status Card */}
      <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-4 sm:p-6 w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
              <MessageCircle
                size={20}
                className="text-green-600 dark:text-green-400 sm:w-6 sm:h-6"
              />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                WhatsApp Integration
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connect your WhatsApp to send invoices
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {isScanning ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Loader2
                  size={16}
                  className="animate-spin text-blue-600 dark:text-blue-400"
                />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Linking...
                </span>
              </div>
            ) : status.loading && !qrCode ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                <Loader2
                  size={16}
                  className="animate-spin text-gray-600 dark:text-gray-400"
                />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Connecting...
                </span>
              </div>
            ) : status.isConnected ? (
              <button
                onClick={() => setShowDisconnectConfirm(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all border border-red-100 dark:border-red-800/50 group"
              >
                <Power
                  size={14}
                  className="group-hover:rotate-12 transition-transform"
                />
                <span className="text-sm font-semibold">Disconnect</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30">
                <XCircle size={16} className="text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">
                  Disconnected
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Connected State */}
        {status.isConnected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
              <Smartphone
                size={20}
                className="text-green-600 dark:text-green-400"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-300">
                  Connected Device
                </p>
                <p className="text-lg font-bold text-green-700 dark:text-green-400">
                  {status.phoneNumber
                    ? formatPhoneNumber(status.phoneNumber)
                    : "Linked Device"}
                </p>
              </div>
            </div>

            {/* Test Message Section */}
            <div className="p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center gap-2 mb-4">
                <Send size={18} className="text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-blue-900 dark:text-blue-300 text-sm">
                  Test WhatsApp Message
                </h3>
              </div>

              {testError && (
                <div className="mb-4 p-3 rounded-xl bg-red-100/50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} />
                  {testError}
                </div>
              )}

              {testSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-green-100/50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  {testSuccess}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
                <input
                  type="text"
                  placeholder="WhatsApp Number"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="flex-1 w-full h-11 px-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-dark-card text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-gray-400"
                />
                <button
                  onClick={handleSendTestMessage}
                  disabled={isSendingTest || !testPhone.trim()}
                  className="w-full sm:w-auto px-4 h-11 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                >
                  {isSendingTest ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Send Test
                </button>
              </div>
              <p className="mt-3 text-[10px] text-blue-600/70 dark:text-blue-400/50 leading-relaxed">
                Enter a phone number with country code (without +) to send a
                quick test message.
              </p>
            </div>
          </div>
        )}

        {/* Scanning / Linking State — shown after QR was scanned */}
        {isScanning && !status.isConnected && !qrCode && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center p-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-4">
                <Loader2 size={40} className="animate-spin text-blue-500" />
              </div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                Linking your device...
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 text-center">
                Please wait while we complete the connection. This may take a
                few seconds.
              </p>
            </div>
          </div>
        )}

        {/* QR Code State */}
        {!status.isConnected && qrCode && !isScanning && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="bg-white dark:bg-dark-surface p-4 rounded-xl mb-4 shadow-sm">
                <QRCodeSVG value={qrCode} size={256} level="H" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Scan QR Code with WhatsApp
                </p>
                <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 text-left">
                  <li>1. Open WhatsApp on your phone</li>
                  <li>
                    2. Tap Menu or Settings and select{" "}
                    <strong>Linked Devices</strong>
                  </li>
                  <li>
                    3. Tap on <strong>Link a Device</strong>
                  </li>
                  <li>
                    4. Point your phone to this screen to capture the code
                  </li>
                </ol>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <AlertTriangle
                size={16}
                className="text-amber-600 dark:text-amber-400 shrink-0"
              />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                QR code will refresh automatically. Scan it within 60 seconds.
              </p>
            </div>

            <button
              onClick={handleInitialize}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              <RefreshCw size={18} />
              Generate New QR Code
            </button>
          </div>
        )}

        {/* QR Expired State */}
        {!status.isConnected &&
          qrExpired &&
          !qrCode &&
          !status.loading &&
          !isScanning && (
            <div className="space-y-4">
              <div className="text-center p-6 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle size={32} className="text-amber-500" />
                </div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-300 mb-1">
                  QR Code Expired
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  The QR code has expired. Generate a new one to connect.
                </p>
              </div>

              <button
                onClick={handleInitialize}
                disabled={isInitializing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInitializing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating QR Code...
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    Generate New QR Code
                  </>
                )}
              </button>
            </div>
          )}

        {/* Error State */}
        {connectionError && !qrCode && !status.isConnected && !isScanning && (
          <div className="space-y-4">
            <div className="text-center p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto mb-3">
                <XCircle size={32} className="text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-900 dark:text-red-300 mb-1">
                Connection Failed
              </p>
              <p className="text-xs text-red-700 dark:text-red-400">
                {connectionError}
              </p>
            </div>

            <button
              onClick={handleInitialize}
              disabled={isInitializing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInitializing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  Try Again
                </>
              )}
            </button>
          </div>
        )}

        {/* Disconnected State (initial) */}
        {!status.isConnected &&
          !qrCode &&
          !qrExpired &&
          !connectionError &&
          !status.loading &&
          !isScanning && (
            <div className="space-y-4">
              <div className="text-center p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle size={32} className="text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  WhatsApp Not Connected
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Connect your WhatsApp to start sending invoices
                </p>
              </div>

              <button
                onClick={handleInitialize}
                disabled={isInitializing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInitializing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Power size={18} />
                    Connect WhatsApp
                  </>
                )}
              </button>
            </div>
          )}
      </div>

      {/* Info Card - Only show when not connected and no QR code */}
      {!status.isConnected && !qrCode && !isScanning && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-5">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
              <MessageCircle
                size={20}
                className="text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm mb-1">
                How it works
              </h4>
              <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                <li>• Connect your WhatsApp by scanning the QR code</li>
                <li>
                  • Invoices will be automatically sent to customers with phone
                  numbers
                </li>
                <li>
                  • Your WhatsApp stays connected even after server restarts
                </li>
                <li>• You can disconnect anytime from this page</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={showDisconnectConfirm}
        onClose={() => setShowDisconnectConfirm(false)}
        onConfirm={handleDisconnect}
        title="Disconnect WhatsApp"
        message="Are you sure you want to disconnect WhatsApp? You will need to scan the QR code again to reconnect."
        confirmLabel="Disconnect"
        type="danger"
      />
    </div>
  );
};

export default WhatsAppSettings;
