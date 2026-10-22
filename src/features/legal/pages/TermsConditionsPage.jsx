import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { FileText, ChevronLeft, CheckCircle, Lock, ArrowRight, Gavel } from 'lucide-react';

const TermsConditionsPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-luxury-charcoal dark:text-gray-100 font-outfit antialiased selection:bg-luxury-gold selection:text-white overflow-x-hidden relative">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-luxury-gold/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-500/5 rounded-full blur-[100px]" />
            </div>

            {/* Navigation Header */}
            <header className="fixed top-0 left-0 right-0 z-40 px-6 py-6 md:px-12 backdrop-blur-md bg-white/30 dark:bg-dark-bg/30 border-b border-gray-200/50 dark:border-white/5">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <button 
                        onClick={() => navigate(-1)}
                        className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-luxury-gold transition-colors"
                    >
                        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Back</span>
                    </button>
                    <Link to="/" className="text-xl font-playfair font-black tracking-widest uppercase text-luxury-charcoal dark:text-white">
                        VIJAYAJALAKAM
                    </Link>
                    <div className="w-10" /> {/* Spacer */}
                </div>
            </header>

            <main className="relative z-10 pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto">
                    {/* Hero Section */}
                    <Motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-16"
                    >
                        <span className="inline-flex items-center gap-2 mb-4 text-luxury-gold text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-1.5 border border-luxury-gold/20 rounded-full bg-luxury-gold/5 backdrop-blur-sm">
                            <FileText size={12} /> Legal Protocol
                        </span>
                        <h1 className="text-4xl md:text-6xl font-playfair font-bold text-luxury-charcoal dark:text-white mb-6">
                            Terms & <span className="italic text-luxury-gold font-light">Conditions</span>
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
                            The framework of operation governing the Vijayajalakam Ecosystem. By engaging with our network, you adhere to the following operational standards.
                        </p>
                    </Motion.div>

                    {/* Content Sections */}
                    <div className="space-y-12">
                        <Motion.section 
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative p-8 md:p-12 bg-white/50 dark:bg-dark-surface/50 backdrop-blur-xl border border-gray-200/50 dark:border-white/5 rounded-[2.5rem] shadow-xl shadow-gray-200/20"
                        >
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="shrink-0">
                                    <span className="text-5xl font-playfair font-black text-luxury-gold/20">01</span>
                                </div>
                                <div>
                                    <h4 className="text-xl font-playfair font-semibold text-luxury-charcoal dark:text-white mb-4 flex items-center gap-3">
                                        Acceptance of Terms
                                    </h4>
                                    <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400 font-light">
                                        By accessing and using the Vijayajalakam Ecosystem, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. This protocol applies to all elite clients, service providers, and verified enterprise partners. Continued use constitutes ongoing agreement.
                                    </p>
                                </div>
                            </div>
                        </Motion.section>

                        <Motion.section 
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative p-8 md:p-12 bg-white/50 dark:bg-dark-surface/50 backdrop-blur-xl border border-gray-200/50 dark:border-white/5 rounded-[2.5rem] shadow-xl shadow-gray-200/20"
                        >
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="shrink-0">
                                    <span className="text-5xl font-playfair font-black text-luxury-gold/20">02</span>
                                </div>
                                <div>
                                    <h4 className="text-xl font-playfair font-semibold text-luxury-charcoal dark:text-white mb-4 flex items-center gap-3">
                                        User Accounts & Security
                                    </h4>
                                    <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400 font-light">
                                        To maintain the exclusivity of our network, we implement stringent verification. You are responsible for safeguarding your credentials. Any unauthorized access must be reported immediately to our concierge desk. We reserve the right to suspend accounts that fail to meet security standards.
                                    </p>
                                </div>
                            </div>
                        </Motion.section>

                        <Motion.section 
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative p-8 md:p-12 bg-white/50 dark:bg-dark-surface/50 backdrop-blur-xl border border-gray-200/50 dark:border-white/5 rounded-[2.5rem] shadow-xl shadow-gray-200/20"
                        >
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="shrink-0">
                                    <span className="text-5xl font-playfair font-black text-luxury-gold/20">03</span>
                                </div>
                                <div>
                                    <h4 className="text-xl font-playfair font-semibold text-luxury-charcoal dark:text-white mb-4 flex items-center gap-3">
                                        Booking Protocol
                                    </h4>
                                    <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400 font-light">
                                        All reservations executed through the framework are subject to provider availability and confirmation. A failure to adhere to the designated cancellation windows may result in the suspension of your access privileges. We facilitate the connection but the service contract remains with the provider.
                                    </p>
                                </div>
                            </div>
                        </Motion.section>

                        <Motion.section 
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative p-8 md:p-12 bg-white/50 dark:bg-dark-surface/50 backdrop-blur-xl border border-gray-200/50 dark:border-white/5 rounded-[2.5rem] shadow-xl shadow-gray-200/20"
                        >
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="shrink-0">
                                    <span className="text-5xl font-playfair font-black text-luxury-gold/20">04</span>
                                </div>
                                <div>
                                    <h4 className="text-xl font-playfair font-semibold text-luxury-charcoal dark:text-white mb-4 flex items-center gap-3">
                                        Limitation of Liability
                                    </h4>
                                    <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400 font-light">
                                        Vijayajalakam Framework acts strictly as a decentralized discovery and facilitation layer. We are not liable for the direct service delivery by our network partners, although we routinely audit them for quality assurance. Any disputes regarding services must be handled with the service provider directly.
                                    </p>
                                </div>
                            </div>
                        </Motion.section>
                    </div>

                    {/* Legal CTA */}
                    <Motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mt-20 text-center p-12 bg-luxury-charcoal dark:bg-dark-bg text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-luxury-gold/5" />
                        <h3 className="text-2xl font-playfair mb-4 relative z-10">Governance Inquiries</h3>
                        <p className="text-gray-400 dark:text-gray-500 font-light mb-8 relative z-10">For inquiries regarding operational governance or legal disputes, please contact our legal desk.</p>
                        <a 
                            href="mailto:legal@vijayajalakam.com"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-white dark:bg-dark-surface text-luxury-charcoal hover:bg-luxury-gold hover:text-white transition-all rounded-full text-xs font-bold uppercase tracking-widest relative z-10 group"
                        >
                            <Gavel size={16} />
                            <span>Contact Legal Desk</span>
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </a>
                    </Motion.div>
                </div>
            </main>

            <footer className="py-12 text-center text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] font-medium border-t border-gray-200/50 dark:border-white/5 relative z-10">
                &copy; {new Date().getFullYear()} Vijayajalakam Ecosystem. Protocol Active.
            </footer>
        </div>
    );
};

export default TermsConditionsPage;
