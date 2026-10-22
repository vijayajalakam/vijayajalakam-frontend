import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { Signpost, MailCheck, Mailbox, KeyRound, ChevronLeft, Hexagon, Loader2, CheckCircle } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const [updatePasswordLoader, setUpdatePasswordLoader] = useState(false);
  const { shopSlug } = useParams();
  const {
    SEND_EMAIL_OTP_API,
    UPDATE_PASSWORD_FOR_FORGET_PASSWORD_API,
    VERIFY_FORGET_PASSWORD_OTP_API
  } = useAuth();
  const [canResend, setCanResend] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const otpRefs = useRef([]);

  useEffect(() => {
    if (step !== 'otp') return;
    setTimer(60);
    setCanResend(false);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const handleSendOtp = async () => {
    setError('');
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const result = await SEND_EMAIL_OTP_API({ email });
      if (result?.success) {
        setStep('otp');
      } else {
        setError(result?.message ?? 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = (e) => {
    const pasteData = e.clipboardData.getData('text').trim().slice(0, 6);
    if (!/^\d+$/.test(pasteData)) return;

    const newOtp = [...otp];
    pasteData.split('').forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);

    const lastIndex = Math.min(pasteData.length - 1, 5);
    otpRefs.current[lastIndex]?.focus();
    
    e.preventDefault();
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    const otpCode = otp.join('');
    if (otpCode.length === 6 && step === 'otp' && !loading) {
      handleVerifyOtp();
    }
  }, [otp, step]);

  const handleVerifyOtp = async () => {
    setError('');
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      const result = await VERIFY_FORGET_PASSWORD_OTP_API({
        email,
        otp: otpCode,
      });
        
      if (result?.success) {
        setFormData({ password: '', confirmPassword: '' });
        setStep('reset');
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewPasswordSettingFn = async () => {
    if (!formData?.password || !formData?.password?.trim() || formData?.password?.length < 6) {
      setError("Please enter a valid password (min 6 characters).");
      return;
    }
    if (formData?.password !== formData?.confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    const otpCode = otp.join('');
    setUpdatePasswordLoader(true);
    setError('');
    try {
      const result = await UPDATE_PASSWORD_FOR_FORGET_PASSWORD_API({
        password: formData?.password,
        confirmPassword: formData?.confirmPassword,
        email,
        otp: otpCode,
      });
      if (result?.success) {
        setStep('success');
      } else {
        setError(result?.message || "Failed to update password.");
      }
    } catch(err) {
      setError("An error occurred while updating the password.");
    } finally {
      setUpdatePasswordLoader(false);
    }
  };

  const handleResend = async () => {
    setOtp(['', '', '', '', '', '']);
    setError('');
    setLoading(true);
    try {
     const result = await SEND_EMAIL_OTP_API({ email });
     if (!result?.success) {
        setError('Failed to send OTP. Please try again.');
      }
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const evaluatePasswordStrength = (password) => {
    if (!password) return { label: "", segments: 0, color: "bg-gray-200 dark:bg-dark-border" };
    if (password.length < 6) return { label: "Weak", segments: 1, color: "bg-red-500", textClass: "text-red-500" };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { label: "Excellent", segments: 4, color: "bg-green-500", textClass: "text-green-500" };
    }
    if (password.length >= 6) {
      return { label: "Good", segments: 2, color: "bg-yellow-500", textClass: "text-yellow-500" };
    }
    return { label: "Weak", segments: 1, color: "bg-red-500", textClass: "text-red-500" };
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-dark-card text-gray-800 dark:text-gray-100 font-sans items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-white dark:bg-dark-surface rounded-3xl shadow-xl shadow-gray-200/50 p-8 sm:p-10 border border-gray-100 dark:border-dark-border">
        
        {/* STEP 1: Email */}
        {step === 'email' && (
          <div className="w-full flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-blue-50 text-[#2563eb] rounded-2xl flex items-center justify-center mb-6">
              <KeyRound size={32} strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white text-center">Forgot Password?</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center leading-relaxed">
              No worries, we'll send you reset instructions.
            </p>

            <div className="w-full space-y-5">
              <div className="text-left w-full">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-2">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-gray-500 group-focus-within:text-[#2563eb] transition-colors">
                    <MailCheck size={18} />
                  </div>
                  <input
                    type="email"
                    className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-200 dark:border-dark-border rounded-xl text-[14px] font-medium text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#2563eb]/50 focus:bg-white dark:bg-dark-surface focus:ring-4 focus:ring-[#2563eb]/10 transition-all"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                  />
                </div>
                {error && <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>}
              </div>

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full h-12 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl transition duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Reset Password'}
              </button>

              <button
                onClick={() => navigate(shopSlug ? `/${shopSlug}/login` : "/login")}
                className="w-full h-12 text-sm font-bold text-gray-500 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <ChevronLeft size={16} /> Back to Login
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Verify OTP */}
        {step === 'otp' && (
          <div className="w-full flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-blue-50 text-[#2563eb] rounded-2xl flex items-center justify-center mb-6">
              <Mailbox size={32} strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white text-center">Check your email</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center leading-relaxed">
              We sent a verification code to<br/>
              <span className="font-bold text-gray-800 dark:text-gray-100">{email}</span>
            </p>

            <div className="w-full space-y-6">
              <div className="flex justify-between gap-2 max-w-full mx-auto">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={handlePaste}
                    className="w-12 h-14 text-center text-xl font-black bg-gray-50 border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:border-[#2563eb]/50 focus:bg-white dark:bg-dark-surface focus:ring-4 focus:ring-[#2563eb]/10 transition-all text-gray-900 dark:text-white"
                  />
                ))}
              </div>
              {error && <p className="text-red-500 text-xs mt-2 text-center font-medium">{error}</p>}

              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full h-12 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl transition duration-300 flex items-center justify-center gap-2 mt-6 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Verify Code'}
              </button>

              <div className="text-center mt-6">
                {canResend ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Didn't receive the email?{' '}
                    <button onClick={handleResend} className="font-bold text-[#2563eb] hover:underline">
                      Click to resend
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
                    Resend code in <span className="text-gray-700 dark:text-gray-300 font-bold">{timer}s</span>
                  </p>
                )}
              </div>
              
              <button
                onClick={() => navigate(shopSlug ? `/${shopSlug}/login` : "/login")}
                className="w-full h-12 text-sm font-bold text-gray-500 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <ChevronLeft size={16} /> Back to Login
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Reset Password */}
        {step === 'reset' && (
          <div className="w-full flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-blue-50 text-[#2563eb] rounded-2xl flex items-center justify-center mb-6">
              <Signpost size={32} strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white text-center">Set new password</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center leading-relaxed">
              Your new password must be different from previously used passwords.
            </p>

            <div className="w-full space-y-5 text-left">
              {(() => {
                const strength = evaluatePasswordStrength(formData.password);
                return (
                  <>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-2">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    className="w-full h-12 px-4 bg-gray-50 border border-gray-200 dark:border-dark-border rounded-xl text-[14px] font-medium text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#2563eb]/50 focus:bg-white dark:bg-dark-surface focus:ring-4 focus:ring-[#2563eb]/10 transition-all"
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  />
                  {formData.password.length >= 6 && (
                    <CheckCircle size={18} className="absolute right-4 top-[15px] text-green-500" />
                  )}
                </div>
                
                {/* Strength Indicator */}
                <div className="mt-3">
                  <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-dark-card">
                    {[1, 2, 3, 4].map((seg) => (
                      <div key={seg} className={`flex-1 transition-colors duration-300 ${strength.segments >= seg ? strength.color : 'bg-transparent'}`}></div>
                    ))}
                  </div>
                  {strength.label && (
                    <p className="text-xs font-bold mt-2">
                      <span className="text-gray-400 dark:text-gray-500">Strength: </span>
                      <span className={strength.textClass}>{strength.label}</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-2">Confirm Password</label>
                <input
                  type="password"
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-200 dark:border-dark-border rounded-xl text-[14px] font-medium text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#2563eb]/50 focus:bg-white dark:bg-dark-surface focus:ring-4 focus:ring-[#2563eb]/10 transition-all"
                  placeholder="••••••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>

              {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

              <button
                onClick={handleNewPasswordSettingFn}
                disabled={updatePasswordLoader}
                className="w-full h-12 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl transition duration-300 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
              >
                {updatePasswordLoader ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : 'Reset Password'}
              </button>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* STEP 4: Success */}
        {step === 'success' && (
          <div className="w-full flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mb-6 relative">
              <CheckCircle size={32} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white text-center">Password reset</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center leading-relaxed">
              Your password has been successfully reset.<br/>Click below to log in magically.
            </p>

            <div className="w-full mt-2">
              <button
                onClick={() => navigate(shopSlug ? `/${shopSlug}/login` : "/login")}
                className="w-full h-12 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl transition duration-300 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
              >
                Continue to Login
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ForgotPasswordPage;