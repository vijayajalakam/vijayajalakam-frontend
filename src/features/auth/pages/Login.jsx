import { useState, useEffect } from "react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useNavigate, Link, useParams } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { getPortalRole } from "../../../utils/portalUtils";



const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login, googleLogin, user } = useAuth();
  const navigate = useNavigate();
  const { shopSlug } = useParams();

  // Redirect if user is already logged in (but not if they just logged out)
  useEffect(() => {
    const isLoggedOut = localStorage.getItem("isLoggedOut") === "true";
    
    if (user && !isLoggedOut) {
      const rolePrefix = getPortalRole(user.role);
      if (rolePrefix === "staff") {
        navigate("/staff/bookings", { replace: true });
      } else if (rolePrefix === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [user, navigate]);




  
//======================= GOOGLE SIGN IN ===============================
const googleLoginFn = async (credential)=>{
  setIsLoading(true);
  setError("");
  try {
    const user = await googleLogin(credential, shopSlug);
    console.log("Login: Google Auth result:", user ? "Success" : "Failed");
    if (user) {
      const rolePrefix = getPortalRole(user.role);
      let redirectPath = "/";
      if (rolePrefix === "staff") {
        redirectPath = "/staff/bookings";
      } else if (rolePrefix === "admin") {
        redirectPath = "/admin/dashboard";
      }

      window.history.replaceState(null, '', redirectPath);
      window.location.href = redirectPath;
    } else {
      setError("Google authentication succeeded but no user data was returned.");
    }
  } catch (err) {
    console.error("Google Login Error:", err);
    setError("Google authentication failed. Please try again.");
  } finally {
    setIsLoading(false);
  }
}



  


  
//======================= GOOGLE SIGN IN ===============================




  


  

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Login: Form submitted", { email });
    setError("");
    setIsLoading(true);
    try {
      
      const user = await login(email, password, shopSlug);
      console.log("Login: Auth successful", user);


      if (user) {
        const rolePrefix = getPortalRole(user.role);
        let redirectPath = "/";
        if (rolePrefix === "staff") {
          redirectPath = "/staff/bookings";
        } else if (rolePrefix === "admin") {
          redirectPath = "/admin/dashboard";
        }

        window.history.replaceState(null, '', redirectPath);
        window.location.href = redirectPath;
      } else {
        console.warn("Login: Auth succeeded but user is undefined");
        setError("Invalid credentials or account mismatch. Please try again.");
      }
    } catch (_err) {
      console.error("Login Error:", _err);
      if (_err.response) {
        console.error("Response Data:", _err.response.data);
        setError(
          _err.response.data?.message ||
            "Invalid credentials. Please try again.",
        );
      } else if (_err.request) {
        setError(
          "Unable to connect to the server. Please check your internet connection or try again later.",
        );
      } else {
        alert('error message found ');
        setError(_err.message || "An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-light-bg font-outfit text-luxury-charcoal overflow-hidden relative selection:bg-luxury-gold selection:text-white">
      {/* Noise Overlay */}
      <div
        className="fixed inset-0 z-0 opacity-[0.02] pointer-events-none bg-repeat mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Abstract Background Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-200 h-200 bg-luxury-gold/10 rounded-full blur-[150px] pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-20%] left-[-10%] w-150 h-150 bg-blue-100/50 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />

      {/* Left Side: Brand Story (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-5 flex-col justify-center px-16 xl:px-24 relative z-10 border-r border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface/50 backdrop-blur-3xl shadow-2xl">
        <Motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-20">
            <span className="text-luxury-gold text-xs font-semibold uppercase tracking-[0.4em] px-4 py-2 border border-luxury-gold/30 rounded-full bg-white dark:bg-dark-surface backdrop-blur-sm inline-block shadow-sm">
              VIJAYAJALAKAM
            </span>
          </div>

          <h1 className="text-6xl xl:text-7xl font-playfair font-bold text-luxury-charcoal leading-[1.05] tracking-tight mb-8">
            Manage Your <br />
            <span className="text-luxury-gold font-light">Business</span>
          </h1>
          <p className="text-lg xl:text-xl text-gray-500 dark:text-gray-400 font-light max-w-md leading-relaxed">
            Access your dashboard, manage appointments, and track your business
            performance.
          </p>
        </Motion.div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-6 flex flex-col justify-center items-center lg:items-start px-6 sm:px-12 relative z-10 w-full bg-light-bg">
        <Motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-120 bg-white dark:bg-dark-surface/80 backdrop-blur-2xl border border-gray-200 dark:border-dark-border p-10 sm:p-14 rounded-4xl shadow-xl shadow-gray-200/50 relative lg:ml-12"
        >
          {/* Decorative Corner accents */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t-[3px] border-l-[3px] border-luxury-gold/40 rounded-tl-4xl opacity-70 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-[3px] border-r-[3px] border-luxury-gold/40 rounded-br-4xl opacity-70 pointer-events-none" />

          {/* Back Button */}
          <button
            onClick={() => navigate("/")}
            className="mb-6 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-luxury-gold transition-colors group"
            aria-label="Go back to landing page"
          >
            <ArrowLeft 
              size={18} 
              className="group-hover:-translate-x-1 transition-transform" 
            />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-playfair text-luxury-charcoal mb-3">
              Login
            </h2>
            <p className="text-gray-500 dark:text-gray-400 font-light text-sm tracking-wide">
              Enter your credentials to access your account.
            </p>
          </div>

          {error && (
            <Motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50/80 border border-red-200 text-red-600 px-5 py-4 mb-8 flex items-start gap-3 text-sm font-light relative overflow-hidden rounded-xl shadow-sm"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </Motion.div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3"
              >
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-gray-500 group-focus-within:text-luxury-gold transition-colors">
                  <Mail size={18} strokeWidth={1.5} />
                </div>
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  spellCheck={false}
                  required
                  className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-luxury-charcoal rounded-xl py-4 pl-12 pr-4 text-sm font-light focus:outline-none focus:ring-1 focus:ring-luxury-gold/50 focus:border-luxury-gold/70 transition-all placeholder:text-gray-400 dark:text-gray-500 disabled:opacity-50 shadow-sm"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest"
                >
                  Password
                </label>
                <Link
                  to={shopSlug ? `/${shopSlug}/forgot-password` : "/forgot-password"}
                  className="text-xs font-medium text-luxury-gold hover:text-luxury-gold-light transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-gray-500 group-focus-within:text-luxury-gold transition-colors">
                  <Lock size={18} strokeWidth={1.5} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-luxury-charcoal rounded-xl py-4 pl-12 pr-12 text-sm font-light focus:outline-none focus:ring-1 focus:ring-luxury-gold/50 focus:border-luxury-gold/70 transition-all placeholder:text-gray-400 dark:text-gray-500 disabled:opacity-50 shadow-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-gray-500 hover:text-luxury-charcoal transition-colors focus-visible:outline-none focus-visible:text-luxury-gold"
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={1.5} />
                  ) : (
                    <Eye size={18} strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 mt-8 font-outfit text-sm font-semibold tracking-widest uppercase text-white bg-luxury-charcoal hover:bg-black transition-all flex justify-center items-center gap-3 group rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-gray-300/50"
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>LOGIN</span>
                  <ChevronRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform text-luxury-gold"
                  />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Or authorize via
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
          </div>

{/* GOOGLE SIGN UP BUTTON START */}
<div className="w-full flex justify-center opacity-90 hover:opacity-100 transition-opacity">
  <GoogleLogin
    onSuccess={(response) => {
      console.log("ID TOKEN:", response.credential);
      // send to backend
      googleLoginFn(response.credential);
    }}
    onError={() => {
      console.error("Google Login Failed");
    }}
    theme="outline"
    shape="pill"
    size="large"
    text="continue_with"
  />
</div>
{/* GOOGLE SIGN UP BUTTON END */}



          <div className="mt-10 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-light">
              Don't have an account?{" "}
              <Link
                to={shopSlug ? `/${shopSlug}/register` : "/register"}
                className="text-luxury-charcoal border-b border-luxury-charcoal hover:text-luxury-gold hover:border-luxury-gold pb-0.5 font-medium transition-colors"
                autoFocus={false}
              >
                Sign Up
              </Link>
            </p>
          </div>
        </Motion.div>

        {/* Global Footer (Mobile Only) */}
        <div className="mt-12 text-center lg:hidden">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-semibold mb-2">
            © {new Date().getFullYear()} Vijayajalakam. SECURE ACCESS.
          </p>
          <div className="flex justify-center gap-4 text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest">
            <Link to="/privacy-policy" className="hover:text-luxury-gold transition-colors">Privacy Policy</Link>
            <Link to="/terms-and-conditions" className="hover:text-luxury-gold transition-colors">Terms & Conditions</Link>
          </div>
        </div>
      </div>

      {/* Global Footer (Desktop) */}
      <div className="absolute bottom-6 left-16 xl:left-24 hidden lg:flex flex-col gap-2 z-10">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-semibold">
          © {new Date().getFullYear()} Vijayajalakam. SECURE ACCESS PORTAL.
        </p>
        <div className="flex gap-6 text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest">
          <Link to="/privacy-policy" className="hover:text-luxury-gold pointer-events-auto transition-colors">Privacy Policy</Link>
          <Link to="/terms-and-conditions" className="hover:text-luxury-gold pointer-events-auto transition-colors">Terms & Conditions</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
