import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import LocationDrawer from "./LocationDrawer";
import { useLocation } from "../../context/LocationContext";
import { useProductDetail } from "../../context/ProductDetailContext";
import { useSettings } from "@core/context/SettingsContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useAuth } from "@core/context/AuthContext";
import { cn } from "@/lib/utils";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import { buildMiniCartColor, shiftHex } from "../../utils/headerTheme";
import LogoImage from "../../../../assets/Logo.png";

import {
  MapPin,
  Zap,
  Search,
  Mic,
  Heart,
  ShoppingCart,
  User,
  Bell,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Package,
  LogOut,
  Sparkles,
} from "lucide-react";

const SEARCH_PREFIX = "Search ";
const SEARCH_PHRASES = [
  '"milk, curd & butter"',
  '"fresh bread & bakery"',
  '"crispy chips & namkeen"',
  '"chocolates & ice cream"',
  '"farm fresh vegetables"',
  '"atta, rice & dal"',
  '"tea, coffee & drinks"',
  '"cold drinks & juices"',
];

/** Types out / erases rotating example queries for the search placeholder. */
function useTypingPlaceholder() {
  const [text, setText] = useState(SEARCH_PREFIX);
  const [state, setState] = useState({
    textIndex: 0,
    charIndex: 0,
    isDeleting: false,
    isPaused: false,
  });

  useEffect(() => {
    const { textIndex, charIndex, isDeleting, isPaused } = state;
    const phrase = SEARCH_PHRASES[textIndex];

    if (isPaused) {
      const t = setTimeout(
        () => setState((p) => ({ ...p, isPaused: false, isDeleting: true })),
        2200,
      );
      return () => clearTimeout(t);
    }

    const t = setTimeout(
      () => {
        if (!isDeleting) {
          if (charIndex < phrase.length) {
            setText(SEARCH_PREFIX + phrase.substring(0, charIndex + 1));
            setState((p) => ({ ...p, charIndex: p.charIndex + 1 }));
          } else {
            setState((p) => ({ ...p, isPaused: true }));
          }
        } else if (charIndex > 0) {
          setText(SEARCH_PREFIX + phrase.substring(0, charIndex - 1));
          setState((p) => ({ ...p, charIndex: p.charIndex - 1 }));
        } else {
          setState((p) => ({
            ...p,
            isDeleting: false,
            textIndex: (p.textIndex + 1) % SEARCH_PHRASES.length,
          }));
        }
      },
      isDeleting ? 38 : 75,
    );
    return () => clearTimeout(t);
  }, [state]);

  return text;
}

/**
 * Scroll-linked fold for Home. The two sections shrink 1px per 1px of scroll.
 */
function useScrollFold(hasTabs) {
  const topRef = useRef(null);
  const topInnerRef = useRef(null);
  const tabsRef = useRef(null);
  const tabsInnerRef = useRef(null);

  useEffect(() => {
    const sizes = { top: 0, tabs: 0 };

    const setSection = (el, natural, consumed) => {
      if (!el) return;
      const h = Math.max(0, natural - consumed);
      el.style.height = `${h}px`;
      el.style.opacity = natural > 0 ? String(h / natural) : "1";
      el.style.visibility = h === 0 ? "hidden" : "visible";
    };

    const apply = () => {
      const y = Math.max(0, window.scrollY);
      setSection(topRef.current, sizes.top, y);
      setSection(tabsRef.current, sizes.tabs, Math.max(0, y - sizes.top));
    };

    const measure = () => {
      sizes.top = topInnerRef.current?.offsetHeight || 0;
      sizes.tabs = tabsInnerRef.current?.offsetHeight || 0;
      apply();
    };

    measure();
    const ro = new ResizeObserver(measure);
    [topInnerRef.current, tabsInnerRef.current].forEach((el) => el && ro.observe(el));
    window.addEventListener("scroll", apply, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", apply);
    };
  }, [hasTabs]);

  return { topRef, topInnerRef, tabsRef, tabsInnerRef };
}

function CategoryTab({ cat, isActive, accent, onSelect }) {
  const isComponentIcon =
    typeof cat.icon === "function" ||
    (typeof cat.icon === "object" && cat.icon?.$$typeof);

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={() => onSelect?.(cat)}
      className={cn(
        "group relative flex h-[58px] min-w-[72px] md:min-w-[82px] shrink-0 snap-start flex-col items-center justify-center gap-1 px-3 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95",
        isActive
          ? "bg-[#edf5e9] text-[#183321]"
          : "text-slate-600 hover:text-slate-900 hover:bg-[#f6f8f5]",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-200",
          isActive
            ? "bg-white shadow-2xs text-[#183321] ring-1 ring-[#cbdcc6]"
            : "bg-white/85 group-hover:bg-white text-slate-500 group-hover:text-slate-800",
        )}
      >
        {isComponentIcon ? (
          <cat.icon sx={{ fontSize: 18 }} />
        ) : (
          <img
            src={applyCloudinaryTransform(cat.icon, "f_auto,q_auto,w_80")}
            alt=""
            loading="lazy"
            className="h-4 w-4 object-contain"
          />
        )}
      </span>
      <span
        className={cn(
          "max-w-[84px] truncate font-heading text-[11px] md:text-[12px] leading-tight tracking-tight",
          isActive ? "font-black text-[#183321]" : "font-bold text-slate-600 group-hover:text-slate-900",
        )}
      >
        {cat.name}
      </span>
      {isActive && (
        <motion.span
          layoutId="header-tab-indicator"
          transition={{ type: "spring", stiffness: 480, damping: 36 }}
          className="absolute inset-x-3 bottom-0 h-[3px] rounded-full"
          style={{ backgroundColor: accent || "#183321" }}
        />
      )}
    </button>
  );
}

const MainLocationHeader = ({
  categories = [],
  activeCategory,
  onCategorySelect,
}) => {
  const navigate = useNavigate();
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const tabsScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { currentLocation, isFetchingLocation } = useLocation();
  const { isOpen: isProductDetailOpen } = useProductDetail();
  const { settings } = useSettings();
  const { cartCount, cartTotal } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user, isAuthenticated, logout } = useAuth();
  const searchPlaceholder = useTypingPlaceholder();
  const fold = useScrollFold(categories.length > 0);

  const rawAppName = settings?.appName || "Appzeto";
  // Clean up any repeated "Quick Commerce" in brand name for crisp hierarchy
  const cleanAppName = rawAppName.replace(/\s*quick\s*commerce\s*/i, "").trim() || rawAppName;
  const logoUrl = settings?.logoUrl || LogoImage;
  const deliveryEta =
    settings?.estimatedDeliveryTime?.trim() ||
    currentLocation?.time ||
    "10-15 mins";
  const locationLabel = isFetchingLocation
    ? "Detecting location..."
    : currentLocation?.name || "Select location";

  const baseColor = activeCategory?.headerColor || "var(--primary)";
  const accent = shiftHex(baseColor, -40);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--customer-mini-cart-color",
      buildMiniCartColor(baseColor),
    );
    return () => {
      document.documentElement.style.removeProperty(
        "--customer-mini-cart-color",
      );
    };
  }, [baseColor]);

  // Global Keyboard Shortcut: ⌘K or Ctrl+K triggers Search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        navigate("/search");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  // Close account menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setIsAccountMenuOpen(false);
      }
    };
    if (isAccountMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAccountMenuOpen]);

  // Horizontal scroll checks for categories
  const checkTabsScroll = () => {
    const el = tabsScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  useEffect(() => {
    checkTabsScroll();
    window.addEventListener("resize", checkTabsScroll);
    return () => window.removeEventListener("resize", checkTabsScroll);
  }, [categories]);

  const scrollTabs = (dir) => {
    const el = tabsScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  };

  const goSearch = () => navigate("/search");
  const goVoiceSearch = (e) => {
    e?.stopPropagation?.();
    navigate("/search?voice=true", { state: { startVoice: true } });
  };

  return (
    <>
      <header
        className={cn(
          "customer-main-header fixed left-0 right-0 top-0 z-[200] border-b border-[#e4eae1] bg-white/95 backdrop-blur-md shadow-[0_4px_24px_rgba(24,51,33,0.06)] font-sans transition-all",
          isProductDetailOpen && "hidden md:block",
        )}
      >
        {/* Subtle dynamic brand signature line */}
        <div
          className="h-[2.5px] w-full"
          style={{
            background: `linear-gradient(90deg, #183321 0%, #2e7d32 35%, ${baseColor} 100%)`,
          }}
        />

        {/* ==============================================================
            MOBILE VIEW (Optimized for fast thumb interaction & any screen)
        ============================================================== */}
        <div className="customer-main-header__mobile-wrap px-3 pt-1.5 md:hidden">
          <div ref={fold.topRef} className="overflow-hidden">
            <div ref={fold.topInnerRef} className="pb-1.5">
              {/* Row 1: Brand Logo + Delivery Location Card (Flex-1) + Actions (Right) */}
              <div className="flex h-11 items-center justify-between gap-2">
                {/* Brand Logo & Interactive Delivery Address Block */}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {/* Brand Logo */}
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="flex shrink-0 items-center border-0 bg-transparent p-0 cursor-pointer text-left"
                    aria-label={`${cleanAppName} Home`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#edf5e9] to-[#dcebd7] p-1 shadow-2xs ring-1 ring-[#d6e7d1] active:scale-95 transition-transform">
                      <img
                        src={logoUrl}
                        alt={`${cleanAppName} Logo`}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </button>

                  {/* Delivery Location & ETA Card (Spans available width) */}
                  <button
                    type="button"
                    data-lenis-prevent
                    data-lenis-prevent-touch
                    onClick={() => setIsLocationOpen(true)}
                    className="flex min-w-0 flex-1 flex-col justify-center rounded-xl bg-[#f5f8f3] hover:bg-[#edf5e9] border border-[#e2ebdE] px-2.5 py-1 text-left active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-1 leading-none mb-0.5">
                      <Zap size={11} className="shrink-0 text-emerald-800 fill-emerald-800" />
                      <span className="font-heading text-[10px] font-black uppercase tracking-wider text-emerald-800">
                        {deliveryEta}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-tight">Delivery</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-1 text-[12px] font-sans font-bold text-[#183321] leading-none">
                      <MapPin size={11} className="shrink-0 text-emerald-700" />
                      <span className="truncate max-w-[150px] sm:max-w-[220px]">{locationLabel}</span>
                      <ChevronDown size={11} className="shrink-0 text-slate-400" />
                    </div>
                  </button>
                </div>

                {/* Right Action Cluster: Wishlist + Cart Split Pill + User Avatar */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {/* Wishlist */}
                  <button
                    type="button"
                    aria-label="Wishlist"
                    onClick={() => navigate("/wishlist")}
                    className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-[#e4eae1] text-slate-700 active:scale-95 transition-transform shadow-2xs"
                  >
                    <Heart size={15} className="text-slate-700" />
                    {wishlistCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-0.5 rounded-full bg-rose-600 text-white text-[8.5px] font-heading font-black flex items-center justify-center ring-1 ring-white">
                        {wishlistCount > 99 ? "99+" : wishlistCount}
                      </span>
                    )}
                  </button>

                  {/* Split Cart Button */}
                  <button
                    type="button"
                    aria-label="View Cart"
                    onClick={() => navigate("/cart")}
                    className="flex h-8 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0e2617] to-[#1a442a] text-white px-2.5 text-xs font-black shadow-xs active:scale-95 transition-transform"
                  >
                    <ShoppingCart size={13} className="text-emerald-300" />
                    {cartCount > 0 ? (
                      <span className="font-heading font-black text-[11px] tracking-tight">
                        ₹{Number(cartTotal || 0).toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="font-heading font-bold text-[10.5px]">Cart</span>
                    )}
                  </button>

                  {/* User Profile */}
                  <button
                    type="button"
                    aria-label="My Account"
                    onClick={() => navigate(isAuthenticated ? "/profile" : "/login")}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f4f7f2] border border-[#e2ebdE] text-slate-700 active:scale-95 transition-transform shadow-2xs overflow-hidden"
                  >
                    {isAuthenticated && user?.name ? (
                      <span className="font-heading font-black text-[11px] text-emerald-900">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <User size={15} className="text-slate-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Omni-Search Bar (Mobile) */}
          <div
            role="button"
            tabIndex={0}
            onClick={goSearch}
            onKeyDown={(e) => e.key === "Enter" && goSearch()}
            className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-xl border border-[#e2ebdE] bg-white px-3 shadow-2xs active:bg-slate-50 transition-colors"
          >
            <Search size={16} className="shrink-0 text-emerald-700" />
            <div className="flex-1 truncate text-[12.5px] text-slate-500 font-medium font-sans">
              <span>{searchPlaceholder}</span>
            </div>
            <button
              type="button"
              aria-label="Voice Search"
              onClick={goVoiceSearch}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-emerald-800 active:bg-slate-100 transition-colors"
            >
              <Mic size={15} />
            </button>
          </div>
          <div className="h-1.5" />
        </div>

        {/* ==============================================================
            DESKTOP VIEW (Modern Dual-Tier Structure)
        ============================================================== */}
        <div className="customer-main-header__bar mx-auto hidden h-[76px] max-w-[1440px] items-center justify-between gap-4 px-6 lg:px-8 md:flex">
          {/* Left Anchor: Brand Logo & Interactive Delivery Capsule */}
          <div className="flex shrink-0 items-center gap-4">
            {/* Brand Logo & Name */}
            <button
              type="button"
              onClick={() => navigate("/")}
              className="group flex shrink-0 items-center gap-2.5 border-0 bg-transparent p-0 text-left cursor-pointer"
            >
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#edf5e9] to-[#dcebd7] p-1.5 shadow-xs ring-1 ring-[#d6e7d1] group-hover:shadow-sm group-hover:scale-105 transition-all duration-200">
                <img
                  src={logoUrl}
                  alt={`${cleanAppName} Logo`}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading text-[19px] lg:text-[21px] font-black tracking-tight text-[#112417] group-hover:text-emerald-800 transition-colors leading-none">
                    {cleanAppName}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-1.5 py-0.5 font-heading text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 leading-none">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Express
                  </span>
                </div>
                <span className="mt-1 font-sans text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                  Instant Delivery
                </span>
              </div>
            </button>

            {/* Vertical separator */}
            <div className="h-8 w-px bg-slate-200/80 mx-1 hidden lg:block" />

            {/* Delivery ETA & Location Selector Card */}
            <button
              type="button"
              data-lenis-prevent
              data-lenis-prevent-touch
              onClick={() => setIsLocationOpen(true)}
              className="group flex h-11 items-center gap-2.5 rounded-2xl border border-[#e2ebdE] bg-[#f7f9f5] hover:bg-[#edf5e9] hover:border-[#cbdcc6] px-3 text-left transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e3f0de] text-emerald-900 group-hover:scale-105 transition-transform ring-1 ring-[#cde3c6]">
                <Zap size={16} className="text-emerald-800 fill-emerald-800" />
              </div>
              <div className="flex min-w-0 flex-col justify-center leading-none">
                <div className="flex items-center gap-1.5 text-[10px] font-heading font-black uppercase tracking-wider text-emerald-800 mb-0.5">
                  <span>{deliveryEta}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-bold">Delivery</span>
                </div>
                <div className="flex min-w-0 items-center gap-1 font-sans text-[12.5px] lg:text-[13px] font-bold text-[#183321]">
                  <MapPin size={12} className="shrink-0 text-emerald-700" />
                  <span className="max-w-[125px] lg:max-w-[190px] truncate">{locationLabel}</span>
                  <ChevronDown size={13} className="shrink-0 text-slate-400 group-hover:text-emerald-800 group-hover:translate-y-0.5 transition-all" />
                </div>
              </div>
            </button>
          </div>

          {/* Center Stage: Supercharged Omni-Search Bar */}
          <div className="flex min-w-0 flex-1 justify-center px-2">
            <div
              role="button"
              tabIndex={0}
              onClick={goSearch}
              onKeyDown={(e) => e.key === "Enter" && goSearch()}
              className="group flex h-11 lg:h-12 w-full max-w-[560px] cursor-pointer items-center gap-3 rounded-2xl border border-[#e2ebdE] bg-[#f7f9f5] hover:bg-white hover:border-emerald-600/40 hover:shadow-[0_4px_20px_rgba(24,51,33,0.06)] px-3.5 transition-all duration-200"
            >
              <Search size={18} className="shrink-0 text-slate-400 group-hover:text-emerald-700 transition-colors" />
              <div className="flex-1 truncate font-sans text-[13px] lg:text-[14px] text-slate-500 font-medium tracking-tight">
                <span>{searchPlaceholder}</span>
                <span className="inline-block w-0.5 h-4 ml-0.5 align-middle bg-emerald-600 animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Voice Search"
                  onClick={goVoiceSearch}
                  title="Search by voice"
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-emerald-800 hover:bg-[#edf5e9] transition-colors"
                >
                  <Mic size={16} />
                </button>
                <kbd
                  title="Press ⌘K or Ctrl+K to search"
                  className="hidden lg:inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-heading font-extrabold text-slate-400 bg-white border border-[#e4eae1] rounded-md shadow-2xs"
                >
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>

          {/* Right Action Cluster: Wishlist + Notifications + Hero Split-Cart + User Profile Dropdown */}
          <div className="flex shrink-0 items-center gap-2 lg:gap-2.5">
            {/* Wishlist Button */}
            <button
              type="button"
              aria-label="Wishlist"
              onClick={() => navigate("/wishlist")}
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e2ebdE] bg-white hover:border-[#cbdcc6] hover:bg-[#f6f8f5] text-slate-700 hover:text-rose-600 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs group"
            >
              <Heart size={19} className="transition-transform group-hover:scale-110" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 rounded-full bg-rose-600 text-white text-[9.5px] font-heading font-black flex items-center justify-center shadow-xs ring-2 ring-white animate-in zoom-in-75">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </button>

            {/* Notifications Button */}
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => navigate("/notifications")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e2ebdE] bg-white hover:border-[#cbdcc6] hover:bg-[#f6f8f5] text-slate-700 hover:text-emerald-800 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs group"
            >
              <Bell size={19} className="transition-transform group-hover:scale-110" />
            </button>

            {/* Hero Split-Pill Cart (Zepto / Blinkit style signature) */}
            <button
              type="button"
              id="header-cart-icon"
              aria-label="View Cart"
              onClick={() => navigate("/cart")}
              className="group relative flex h-11 items-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#0e2617] via-[#143520] to-[#1a442a] px-3.5 text-white shadow-[0_4px_16px_rgba(14,38,23,0.25)] hover:shadow-[0_6px_22px_rgba(14,38,23,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer overflow-hidden border border-[#2d5d3b]/50"
            >
              {/* Gloss highlight effect */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

              {/* Left segment: Shopping Cart Icon + Count Badge */}
              <div className="relative flex items-center justify-center">
                <ShoppingCart size={18} className="text-emerald-300 group-hover:-rotate-6 transition-transform duration-200" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-400 text-[#0e2617] text-[10px] font-heading font-black flex items-center justify-center shadow-xs ring-2 ring-[#0e2617]">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </div>

              {/* Split Divider Line */}
              <div className="h-4 w-px bg-white/20" />

              {/* Right segment: Price + Arrow OR "My Cart" */}
              {cartCount > 0 ? (
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-heading font-black text-[13px] tracking-tight text-white">
                    ₹{Number(cartTotal || 0).toLocaleString("en-IN")}
                  </span>
                  <ChevronRight size={14} className="text-emerald-300 group-hover:translate-x-0.5 transition-transform" />
                </div>
              ) : (
                <span className="font-heading font-bold text-[13px] tracking-tight text-white/95">
                  My Cart
                </span>
              )}
            </button>

            {/* User Profile Pill & Interactive Dropdown Menu */}
            <div className="relative" ref={accountMenuRef}>
              {isAuthenticated && user ? (
                <button
                  type="button"
                  aria-label="Account Menu"
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className="flex h-11 items-center gap-2 rounded-2xl border border-[#e2ebdE] bg-white hover:border-[#cbdcc6] hover:bg-[#f6f8f5] px-2.5 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs group"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-[#edf5e9] to-[#dcebd7] text-emerald-900 font-heading font-black text-xs ring-1 ring-[#cde3c6]">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="hidden lg:inline-block max-w-[90px] truncate font-heading font-bold text-[12.5px] text-[#183321]">
                    {user?.name ? user.name.split(" ")[0] : "Account"}
                  </span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-slate-400 transition-transform duration-200",
                      isAccountMenuOpen && "rotate-180 text-emerald-800",
                    )}
                  />
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="Sign In"
                  onClick={() => navigate("/login")}
                  className="flex h-11 items-center gap-1.5 rounded-2xl border border-[#e2ebdE] bg-white hover:border-[#cbdcc6] hover:bg-[#f6f8f5] px-3.5 font-heading text-[13px] font-bold text-[#183321] transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs"
                >
                  <User size={16} className="text-emerald-800" />
                  <span>Sign In</span>
                </button>
              )}

              {/* Floating Account Dropdown */}
              <AnimatePresence>
                {isAccountMenuOpen && isAuthenticated && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-[#e2ebdE] bg-white p-2 shadow-xl z-50 overflow-hidden font-sans"
                  >
                    {/* User Info Header */}
                    <div className="rounded-xl bg-[#f7f9f5] p-3 mb-1 border border-[#e8efe5]">
                      <p className="font-heading font-black text-sm text-[#183321] truncate">
                        {user?.name || "Shopper"}
                      </p>
                      <p className="font-sans text-xs text-slate-500 truncate mt-0.5">
                        {user?.email || user?.phone || "Customer Account"}
                      </p>
                    </div>

                    {/* Navigation Options */}
                    <div className="flex flex-col gap-0.5 py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          navigate("/orders");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-[#f5f8f3] hover:text-emerald-900 transition-colors cursor-pointer"
                      >
                        <Package size={15} className="text-emerald-700" />
                        <span>My Orders</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          setIsLocationOpen(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-[#f5f8f3] hover:text-emerald-900 transition-colors cursor-pointer"
                      >
                        <MapPin size={15} className="text-emerald-700" />
                        <span>Saved Addresses</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          navigate("/wishlist");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-[#f5f8f3] hover:text-emerald-900 transition-colors cursor-pointer"
                      >
                        <Heart size={15} className="text-rose-600" />
                        <span>My Wishlist</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          navigate("/profile");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-[#f5f8f3] hover:text-emerald-900 transition-colors cursor-pointer"
                      >
                        <User size={15} className="text-emerald-700" />
                        <span>Profile & Settings</span>
                      </button>
                    </div>

                    {/* Divider & Logout */}
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        logout?.();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <LogOut size={15} />
                      <span>Log Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ==============================================================
            TIER 2: Horizontal Category Ribbon (when categories exist)
        ============================================================== */}
        {categories.length > 0 && (
          <div ref={fold.tabsRef} className="relative overflow-hidden border-t border-[#f0f3ed]">
            <div className="relative mx-auto flex max-w-[1440px] items-center px-4 md:px-8">
              {/* Left Arrow for Desktop Horizontal Scrolling */}
              {canScrollLeft && (
                <button
                  type="button"
                  aria-label="Scroll Categories Left"
                  onClick={() => scrollTabs("left")}
                  className="absolute left-2 z-10 hidden md:flex h-7 w-7 items-center justify-center rounded-full bg-white/95 border border-[#e2ebdE] shadow-sm text-slate-700 hover:bg-[#edf5e9] hover:text-emerald-800 transition-all cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              {/* Scrolling Container */}
              <div
                ref={(el) => {
                  tabsScrollRef.current = el;
                  fold.tabsInnerRef.current = el;
                }}
                onScroll={checkTabsScroll}
                className="customer-main-header__tabs no-scrollbar flex flex-1 snap-x overflow-x-auto py-1.5 gap-1.5 md:gap-2 items-center justify-start md:justify-center"
              >
                {categories.map((cat) => (
                  <CategoryTab
                    key={cat.id || cat._id}
                    cat={cat}
                    isActive={(activeCategory?.id || activeCategory?._id) === (cat.id || cat._id)}
                    accent={accent}
                    onSelect={onCategorySelect}
                  />
                ))}
              </div>

              {/* Right Arrow for Desktop Horizontal Scrolling */}
              {canScrollRight && (
                <button
                  type="button"
                  aria-label="Scroll Categories Right"
                  onClick={() => scrollTabs("right")}
                  className="absolute right-2 z-10 hidden md:flex h-7 w-7 items-center justify-center rounded-full bg-white/95 border border-[#e2ebdE] shadow-sm text-slate-700 hover:bg-[#edf5e9] hover:text-emerald-800 transition-all cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Location Selection Drawer */}
      <LocationDrawer
        isOpen={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}
      />
    </>
  );
};

export default MainLocationHeader;
