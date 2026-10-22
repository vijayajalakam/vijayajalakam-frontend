import { useState, useEffect } from 'react';
import { useAuth } from '../../../features/auth/hooks/useAuth';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { User, Mail, Phone, Lock, Eye, EyeOff, UserPlus, ChevronRight, AlertCircle } from 'lucide-react';
import { getPortalRole } from '../../../utils/portalUtils';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { register, user } = useAuth();
    const navigate = useNavigate();
    const { shopSlug } = useParams();

    // Redirect if user is already logged in (but not if they just logged out)
    useEffect(() => {
        const isLoggedOut = localStorage.getItem("isLoggedOut") === "true";
        if (user && !isLoggedOut) {
            const rolePrefix = getPortalRole(user.role);
            if (user.role === "SHOP_ADMIN" || user.role === "staff") {
                const userShopSlug = user.shopSlug || shopSlug;
                if (rolePrefix === "staff") {
                    navigate(`/${userShopSlug}/staff/bookings`, { replace: true });
                } else {
                    navigate(`/${userShopSlug}/${rolePrefix}/dashboard`, { replace: true });
                }
            } else {
                const basePath = shopSlug ? `/${shopSlug}` : "";
                if (rolePrefix === "staff") {
                    navigate(`${basePath}/staff/bookings`, { replace: true });
                } else if (rolePrefix === "shop-admin" || rolePrefix === "admin") {
                    navigate(`${basePath}/${rolePrefix}/dashboard`, { replace: true });
                } else {
                    const redirectPath = shopSlug ? `/${shopSlug}/user/home` : "/";
                    navigate(redirectPath, { replace: true });
                }
            }
        }
    }, [user, navigate, shopSlug]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const user = await register(formData, shopSlug);
            if (user) {
                // Wait a bit to ensure state is updated
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const userShopSlug = (user.role === "SHOP_ADMIN" || user.role === "staff") ? (user.shopSlug || shopSlug) : shopSlug;
                const basePath = userShopSlug ? `/${userShopSlug}` : '';
                
                // Determine redirect path based on user role
                let redirectPath;
                if (user.role === 'admin' || user.role === 'staff' || user.role === 'SHOP_ADMIN' || user.role === 'SUPER_ADMIN') {
                    const portalRole = user.role === 'admin' || user.role === 'SHOP_ADMIN' || user.role === 'SUPER_ADMIN' ? 'admin' : 'staff';
                    if (portalRole === 'staff') {
                        redirectPath = `${basePath}/staff/bookings`;
                    } else {
                        redirectPath = `${basePath}/shop-admin/dashboard`;
                    }
                } else {
                    // Regular users go to shop home if in portal, else landing
                    redirectPath = userShopSlug ? `${basePath}/user/home` : "/";
                }

                // Clear history and redirect to prevent back button issues
                window.history.replaceState(null, '', redirectPath);
                window.location.href = redirectPath;
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-light-bg font-outfit text-luxury-charcoal overflow-hidden relative selection:bg-luxury-gold selection:text-white">
            {/* Noise Overlay */}
            <div 
                className="fixed inset-0 z-0 opacity-[0.02] pointer-events-none bg-repeat mix-blend-multiply"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />

            {/* Abstract Background Orbs */}
            <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-luxury-gold/10 rounded-full blur-[150px] pointer-events-none mix-blend-multiply" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />

            {/* Left Side: Brand Story (Hidden on Mobile) */}
            <div className="hidden lg:flex flex-[5] flex-col justify-center px-16 xl:px-24 relative z-10 border-r border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface/50 backdrop-blur-3xl shadow-2xl">
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
                        Join Our <br />
                        <span className="italic text-luxury-gold font-light">Community</span>
                    </h1>
                    <p className="text-lg xl:text-xl text-gray-500 dark:text-gray-400 font-light max-w-md leading-relaxed">
                        Experience personalized care and seamless booking. Create your account today and unlock a world of elegance.
                    </p>
                </Motion.div>
            </div>

            {/* Right Side: The Register Dossier */}
            <div className="flex-[6] flex flex-col justify-center items-center lg:items-start px-6 sm:px-12 py-12 relative z-10 w-full bg-light-bg overflow-y-auto">
                <Motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-[480px] bg-white dark:bg-dark-surface/80 backdrop-blur-2xl border border-gray-200 dark:border-dark-border p-10 sm:p-14 rounded-[2rem] shadow-xl shadow-gray-200/50 relative lg:ml-12 my-auto"
                >
                    {/* Decorative Corner accents */}
                    <div className="absolute top-0 left-0 w-16 h-16 border-t-[3px] border-l-[3px] border-luxury-gold/40 rounded-tl-[2rem] opacity-70 pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-b-[3px] border-r-[3px] border-luxury-gold/40 rounded-br-[2rem] opacity-70 pointer-events-none" />

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-playfair text-luxury-charcoal mb-3">
                            Create Account
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 font-light text-sm tracking-wide">
                            Provide your details to establish access.
                        </p>
                    </div>

                    {error && (
                        <Motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50/80 border border-red-200 text-red-600 px-5 py-4 mb-8 flex items-start gap-3 text-sm font-light relative overflow-hidden rounded-xl shadow-sm"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </Motion.div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="name" className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                                Full Name
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-gray-500 group-focus-within:text-luxury-gold transition-colors">
                                    <User size={18} strokeWidth={1.5} />
                                </div>
                                <input
                                    id="name"
                                    type="text"
                                    name="name"
                                    autoComplete="name"
                                    spellCheck={false}
                                    required
                                    className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-luxury-charcoal rounded-xl py-4 pl-12 pr-4 text-sm font-light focus:outline-none focus:ring-1 focus:ring-luxury-gold/50 focus:border-luxury-gold/70 transition-all placeholder:text-gray-400 dark:text-gray-500 disabled:opacity-50 shadow-sm"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
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
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                                Phone Number
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-gray-500 group-focus-within:text-luxury-gold transition-colors">
                                    <Phone size={18} strokeWidth={1.5} />
                                </div>
                                <input
                                    id="phone"
                                    type="tel"
                                    name="phone"
                                    autoComplete="tel"
                                    required
                                    className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-luxury-charcoal rounded-xl py-4 pl-12 pr-4 text-sm font-light focus:outline-none focus:ring-1 focus:ring-luxury-gold/50 focus:border-luxury-gold/70 transition-all placeholder:text-gray-400 dark:text-gray-500 disabled:opacity-50 shadow-sm"
                                    placeholder="+1 (555) 000-0000"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                                Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-gray-500 group-focus-within:text-luxury-gold transition-colors">
                                    <Lock size={18} strokeWidth={1.5} />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    autoComplete="new-password"
                                    required
                                    className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-luxury-charcoal rounded-xl py-4 pl-12 pr-12 text-sm font-light focus:outline-none focus:ring-1 focus:ring-luxury-gold/50 focus:border-luxury-gold/70 transition-all placeholder:text-gray-400 dark:text-gray-500 disabled:opacity-50 shadow-sm"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-gray-500 hover:text-luxury-charcoal transition-colors focus-visible:outline-none focus-visible:text-luxury-gold"
                                >
                                    {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                                </button>
                            </div>
                        </div>

                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-light text-center px-2">
                            By creating an account, you agree to our{' '}
                            <Link to="/terms-and-conditions" className="text-luxury-gold font-medium hover:underline">Terms & Conditions</Link>
                            {' '}and{' '}
                            <Link to="/privacy-policy" className="text-luxury-gold font-medium hover:underline">Privacy Policy</Link>.
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 px-6 mt-8 font-outfit text-sm font-semibold tracking-widest uppercase text-white bg-luxury-charcoal hover:bg-black transition-all flex justify-center items-center gap-3 group rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-gray-300/50"
                        >
                            {isLoading ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Registering...</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus size={18} className="group-hover:scale-110 transition-transform text-luxury-gold" />
                                    <span>SIGNUP</span>
                                    <ChevronRight
                                        size={18}
                                        className="group-hover:translate-x-1 transition-transform text-luxury-gold"
                                    />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-light">
                            You already have an account?{' '}
                            <Link
                                to={shopSlug ? `/${shopSlug}/login` : "/login"}
                                className="text-luxury-charcoal border-b border-luxury-charcoal hover:text-luxury-gold hover:border-luxury-gold pb-0.5 font-medium transition-colors"
                            >
                                Login
                            </Link>
                        </p>
                    </div>
                </Motion.div>

                {/* Global Footer (Mobile Only) */}
                <div className="mt-12 text-center lg:hidden pb-8">
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

export default Register;
