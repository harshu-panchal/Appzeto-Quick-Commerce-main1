import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  MapPin,
  Phone,
  Headphones,
  ArrowRight,
  ArrowUp,
  Sparkles,
} from 'lucide-react';
import Logo from '@/assets/Logo.png';
import { useSettings } from '@core/context/SettingsContext';
import { useQuery } from '@tanstack/react-query';
import { customerApi } from '../../services/customerApi';
import { smoothScrollToTop } from '@core/utils/scrollTop';

const QUICK_LINKS = [
  { name: 'Home', path: '/' },
  { name: 'All Categories', path: '/categories' },
  { name: 'Offers & Deals', path: '/offers' },
  { name: 'My Orders', path: '/orders' },
  { name: 'My Cart', path: '/cart' },
  { name: 'Wishlist', path: '/wishlist' },
  { name: 'About Us', path: '/about' },
];

const FALLBACK_CATEGORIES = [
  { name: 'Fruits & Vegetables', path: '/categories' },
  { name: 'Dairy & Eggs', path: '/categories' },
  { name: 'Snacks & Munchies', path: '/categories' },
  { name: 'Beverages', path: '/categories' },
  { name: 'Home Appliances', path: '/categories' },
  { name: 'Personal Care', path: '/categories' },
];

const Footer = () => {
  const { settings } = useSettings();
  const location = useLocation();
  const logoUrl = settings?.logoUrl || Logo;
  const primaryColor = settings?.primaryColor || 'var(--primary)';

  const handleHomeClick = (e) => {
    if (location.pathname === '/') {
      e.preventDefault();
    }
    smoothScrollToTop();
  };

  // Dynamically fetch active categories from the database
  const { data: dynamicCategories = [] } = useQuery({
    queryKey: ['footer', 'categories'],
    queryFn: async () => {
      try {
        const res = await customerApi.getCategories();
        if (res?.data?.success) {
          const list = res.data.results || res.data.result || [];
          const valid = list.filter((c) => c.type === 'category' || !c.type);
          return valid.slice(0, 6);
        }
      } catch (err) {
        console.error('Footer category fetch error:', err);
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const categoriesToShow = dynamicCategories.length > 0 ? dynamicCategories : FALLBACK_CATEGORIES;

  return (
    <footer className="customer-site-footer relative bg-[#051108] pt-14 pb-28 md:pt-24 md:pb-14 mt-16 md:mt-24 text-slate-300 md:bg-gradient-to-br md:from-brand-700 md:via-brand-800 md:to-brand-900 overflow-hidden">
      {/* Subtle Glow Overlay */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-30 blur-[150px]"
          style={{ backgroundColor: primaryColor }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full opacity-20 blur-[150px]"
          style={{ backgroundColor: primaryColor }}
        />
      </div>

      {/* Top Wave Divider */}
      <div className="absolute top-[-1px] left-0 w-full overflow-hidden leading-[0]">
        <svg
          className="relative block w-[calc(100%+1.3px)] h-[25px] md:h-[50px]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path d="M0,0 Q600,120 1200,0 V0 H0 Z" className="fill-[#f8fafc]"></path>
        </svg>
      </div>

      <div className="container mx-auto px-4 md:px-8 lg:px-[50px] z-10 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">
          {/* 1. Brand Info & Social */}
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center">
              <Link to="/" onClick={handleHomeClick} className="inline-block transition hover:opacity-95" title="Go to top of Home">
                <img
                  src={logoUrl}
                  alt={`${settings?.appName || 'App'} Logo`}
                  loading="lazy"
                  className="h-10 md:h-14 w-auto object-contain brightness-0 invert"
                />
              </Link>
            </div>
            <p className="text-sm leading-relaxed text-white/80 font-normal max-w-sm">
              Your daily essentials, fresh produce, and favorite brands delivered directly to your doorstep in minutes.
            </p>

            <div className="flex items-center gap-3 pt-1">
              {settings?.facebook && (
                <a
                  href={settings.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-95"
                >
                  <Facebook size={17} />
                </a>
              )}
              {settings?.twitter && (
                <a
                  href={settings.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-95"
                >
                  <Twitter size={17} />
                </a>
              )}
              {settings?.instagram && (
                <a
                  href={settings.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-95"
                >
                  <Instagram size={17} />
                </a>
              )}
              {settings?.youtube && (
                <a
                  href={settings.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-95"
                >
                  <Youtube size={17} />
                </a>
              )}
            </div>
          </div>

          {/* 2. Quick Links */}
          <div className="md:pt-2">
            <h3 className="text-white font-bold text-base md:text-lg mb-4 md:mb-6 uppercase tracking-wider flex items-center gap-2">
              <span className="h-1.5 w-4 rounded-full bg-emerald-400"></span> Quick Links
            </h3>
            <ul className="space-y-2.5 md:space-y-3.5">
              {QUICK_LINKS.map((link) => {
                const isHome = link.path === '/';
                return (
                  <li key={link.name}>
                    <Link
                      to={link.path}
                      onClick={isHome ? handleHomeClick : undefined}
                      className="hover:text-emerald-300 transition-colors text-sm md:text-base font-medium flex items-center group text-white/90 active:scale-98"
                    >
                      <span className="hidden md:block w-0 h-px bg-emerald-400 group-hover:w-3 group-hover:mr-2 transition-all duration-200" />
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 3. Categories */}
          <div className="md:pt-2">
            <h3 className="text-white font-bold text-base md:text-lg mb-4 md:mb-6 uppercase tracking-wider flex items-center gap-2">
              <span className="h-1.5 w-4 rounded-full bg-emerald-400"></span> Categories
            </h3>
            <ul className="space-y-2.5 md:space-y-3.5">
              {categoriesToShow.map((cat, idx) => {
                const targetUrl = cat._id ? `/category/${cat._id}` : (cat.path || '/categories');
                return (
                  <li key={cat._id || cat.id || idx}>
                    <Link
                      to={targetUrl}
                      className="hover:text-emerald-300 transition-colors text-sm md:text-base font-medium flex items-center group text-white/90 active:scale-98"
                    >
                      <span className="hidden md:block w-0 h-px bg-emerald-400 group-hover:w-3 group-hover:mr-2 transition-all duration-200" />
                      {cat.name}
                    </Link>
                  </li>
                );
              })}
              <li className="pt-2">
                <Link
                  to="/categories"
                  className="text-emerald-400 hover:text-emerald-300 transition-all text-xs md:text-sm font-bold flex items-center gap-1.5 group"
                >
                  <span>Explore All Categories</span>
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            </ul>
          </div>

          {/* 4. Contact Us */}
          <div className="md:pt-2">
            <h3 className="text-white font-bold text-base md:text-lg mb-4 md:mb-6 uppercase tracking-wider flex items-center gap-2">
              <span className="h-1.5 w-4 rounded-full bg-emerald-400"></span> Contact Us
            </h3>
            <ul className="space-y-4 md:space-y-5">
              {settings?.address && (
                <li className="flex items-start gap-3 md:gap-4 group">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/20 transition-all">
                    <MapPin size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-0.5">Address</span>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(settings.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs md:text-sm font-medium text-white/90 hover:text-emerald-300 transition-colors leading-relaxed block"
                    >
                      {settings.address}
                    </a>
                  </div>
                </li>
              )}

              <li className="flex items-center gap-3 md:gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/20 transition-all">
                  <Phone size={18} className="text-emerald-400" />
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-0.5">Call Us</span>
                  {settings?.supportPhone ? (
                    <a
                      href={`tel:${settings.supportPhone}`}
                      className="text-xs md:text-sm font-bold text-white/90 hover:text-emerald-300 transition-colors"
                    >
                      {settings.supportPhone}
                    </a>
                  ) : (
                    <span className="text-xs md:text-sm text-white/70">Support Available 24/7</span>
                  )}
                </div>
              </li>

              <li className="flex items-center gap-3 md:gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/20 transition-all">
                  <Mail size={18} className="text-emerald-400" />
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-0.5">Email Support</span>
                  {settings?.supportEmail ? (
                    <a
                      href={`mailto:${settings.supportEmail}`}
                      className="text-xs md:text-sm font-semibold text-white/90 hover:text-emerald-300 transition-colors break-all"
                    >
                      {settings.supportEmail}
                    </a>
                  ) : (
                    <span className="text-xs md:text-sm text-white/70">help@quickcom.com</span>
                  )}
                </div>
              </li>

              <li className="flex items-center gap-3 md:gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/20 transition-all">
                  <Headphones size={18} className="text-emerald-400" />
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-0.5">Help & Inquiries</span>
                  <Link
                    to="/support"
                    className="text-xs md:text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                  >
                    <span>24/7 Customer Support</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-12 pt-6 text-center text-xs md:text-sm md:flex md:justify-between md:items-center md:text-left md:mt-16 md:pt-8">
          <p className="text-white/70">
            &copy; {new Date().getFullYear()} {settings?.appName || 'Quick Commerce'}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-5 justify-center md:justify-end mt-4 md:mt-0">
            <Link to="/privacy" className="hover:text-emerald-300 text-white/70 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-emerald-300 text-white/70 transition-colors">
              Terms of Service
            </Link>
            <Link to="/support" className="hover:text-emerald-300 text-white/70 transition-colors">
              Help
            </Link>
            <button
              type="button"
              onClick={smoothScrollToTop}
              className="flex items-center gap-1.5 text-xs text-white/80 hover:text-emerald-300 transition-colors cursor-pointer group ml-2 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10"
              title="Scroll to top"
            >
              <span>Back to top</span>
              <ArrowUp size={13} className="transition-transform group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
