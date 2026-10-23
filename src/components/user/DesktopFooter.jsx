import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";

/**
 * Desktop footer for user-facing pages (UserHome, ShopSelector/Home).
 * Matches Fresha-style footer with logo, links, and copyright.
 * Hidden on mobile (md:block).
 */
const DesktopFooter = () => {
  const navigate = useNavigate();
  const { shopSlug } = useParams();
  const { shopConfig } = useAuth();

  const currentYear = new Date().getFullYear();

  return (
    <footer className="hidden md:block bg-[#0f172a] text-white">
      {/* Main Footer Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-16">
        <div className="grid grid-cols-5 gap-12">
          {/* Logo + App Links */}
          <div className="col-span-1">
            <a href="/" className="no-underline">
              <span className="text-[24px] font-extrabold tracking-tight text-white lowercase">vijayajalakam</span>
            </a>
            <div className="mt-6">
              <a
                href="https://play.google.com/store/apps/details?id=com.vijayajalakam.app&hl=en_IN"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors no-underline border border-white/10"
              >
                <span className="text-[13px] text-white font-semibold">Get the app</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </a>
            </div>
          </div>

          {/* About */}
          <div>
            <h4 className="text-[15px] font-bold text-white mb-5 tracking-tight">About Vijayajalakam</h4>
            <ul className="space-y-3 list-none p-0 m-0">
              <li><a href="/about" className="text-[14px] text-gray-400 hover:text-white transition-colors no-underline block">About us</a></li>
              <li><a href="/careers" className="text-[14px] text-gray-400 hover:text-white transition-colors no-underline block">Careers</a></li>
              <li><a href="/help" className="text-[14px] text-gray-400 hover:text-white transition-colors no-underline block">Help and support</a></li>
              <li><a href="/blog" className="text-[14px] text-gray-400 hover:text-white transition-colors no-underline block">Blog</a></li>
            </ul>
          </div>

          {/* For Business */}
          <div>
            <h4 className="text-[15px] font-bold text-white mb-5 tracking-tight">For business</h4>
            <ul className="space-y-3 list-none p-0 m-0">
              <li><a href="/partners" className="text-[14px] text-gray-400 hover:text-white transition-colors no-underline block">For partners</a></li>
              <li><a href="/pricing" className="text-[14px] text-gray-400 hover:text-white transition-colors no-underline block">Pricing</a></li>
              <li><a href="/support" className="text-[14px] text-gray-400 hover:text-white transition-colors no-underline block">Support</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[15px] font-bold text-white mb-5 tracking-tight">Legal</h4>
            <ul className="space-y-3 list-none p-0 m-0">
              <li><a href="/privacy-policy" className="text-[14px] text-gray-400 hover:text-white transition-colors no-underline block">Privacy Policy</a></li>
              <li><a href="/terms-and-conditions" className="text-[14px] text-gray-400 hover:text-white transition-colors no-underline block">Terms of service</a></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-[15px] font-bold text-white mb-5 tracking-tight">Find us on social</h4>
            <ul className="space-y-3 list-none p-0 m-0">
              <li>
                <a href="https://www.facebook.com/share/1VQpQyLtrW/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[14px] text-gray-400 hover:text-white transition-colors no-underline">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                  </svg>
                  Facebook
                </a>
              </li>

              <li>
                <a href="https://instagram.com/vijayajalakam" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[14px] text-gray-400 hover:text-white transition-colors no-underline">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 py-6 flex items-center justify-between">
          <span className="text-[13px] text-gray-400">English (US)</span>
          <span className="text-[13px] text-gray-400">© {currentYear} Vijayajalakam Technologies</span>
        </div>
      </div>
    </footer>
  );
};

export default DesktopFooter;
