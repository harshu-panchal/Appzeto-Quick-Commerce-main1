import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import LocationDrawer from "./LocationDrawer";
import { useLocation } from "../../context/LocationContext";
import { useProductDetail } from "../../context/ProductDetailContext";
import { useSettings } from "@core/context/SettingsContext";
import { cn } from "@/lib/utils";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import { buildMiniCartColor, shiftHex } from "../../utils/headerTheme";
import LogoImage from "../../../../assets/Logo.png";

// MUI Icons
import LocationOnIcon from "@mui/icons-material/LocationOn";
import BoltIcon from "@mui/icons-material/Bolt";
import SearchIcon from "@mui/icons-material/Search";
import MicIcon from "@mui/icons-material/Mic";
import ChevronDownIcon from "@mui/icons-material/KeyboardArrowDown";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";

const SEARCH_PREFIX = "Search ";
const SEARCH_PHRASES = ['"bread"', '"milk"', '"chocolate"', '"eggs"', '"chips"'];

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
        2000,
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
      isDeleting ? 50 : 100,
    );
    return () => clearTimeout(t);
  }, [state]);

  return text;
}

/**
 * Scroll-linked fold. The two sections shrink 1px per 1px of scroll (top section first, then the
 * tabs), so the header's bottom edge moves up exactly as fast as the page content beneath it and
 * never leaves a gap. Heights are written straight to the DOM to avoid a re-render per scroll event.
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
      // offsetHeight is 0 while a section is display:none (e.g. the mobile-only top block on desktop).
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

function SearchField({ placeholder, onClick, className }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "flex h-11 cursor-pointer items-center gap-2.5 rounded-lg bg-slate-100 px-3 transition-colors hover:bg-slate-200/70 active:bg-slate-200",
        className,
      )}>
      <SearchIcon sx={{ fontSize: 20 }} className="shrink-0 text-slate-500" />
      <span className="flex-1 truncate text-[14px] text-slate-500">
        {placeholder}
      </span>
      <MicIcon sx={{ fontSize: 20 }} className="shrink-0 text-slate-500" />
    </div>
  );
}

function IconButton({ label, onClick, children, className }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full text-slate-800 transition-colors hover:bg-slate-100 active:bg-slate-200",
        className,
      )}>
      {children}
    </button>
  );
}

function CategoryTab({ cat, isActive, accent, onSelect }) {
  const isComponentIcon =
    typeof cat.icon === "function" ||
    (typeof cat.icon === "object" && cat.icon?.$$typeof);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(cat)}
      className="relative flex h-[60px] min-w-[68px] shrink-0 snap-start flex-col items-center justify-center gap-1 px-3 active:opacity-70">
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center transition-opacity",
          isActive ? "opacity-100" : "opacity-55",
        )}>
        {isComponentIcon ? (
          <cat.icon sx={{ fontSize: 24, color: "#0f172a" }} />
        ) : (
          <img
            src={applyCloudinaryTransform(cat.icon, "f_auto,q_auto,w_100")}
            alt=""
            loading="lazy"
            className="h-6 w-6 object-contain"
          />
        )}
      </span>
      <span
        className={cn(
          "max-w-[84px] truncate text-[11px] leading-none",
          isActive ? "font-semibold text-slate-900" : "font-medium text-slate-500",
        )}>
        {cat.name}
      </span>
      {isActive && (
        <motion.span
          layoutId="header-tab-indicator"
          transition={{ type: "spring", stiffness: 520, damping: 40 }}
          className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full"
          style={{ backgroundColor: accent }}
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
  const { currentLocation, isFetchingLocation } = useLocation();
  const { isOpen: isProductDetailOpen } = useProductDetail();
  const { settings } = useSettings();
  const searchPlaceholder = useTypingPlaceholder();
  const fold = useScrollFold(categories.length > 0);

  const appName = settings?.appName || "App";
  const logoUrl = settings?.logoUrl || LogoImage;
  const deliveryEta =
    settings?.estimatedDeliveryTime?.trim() ||
    currentLocation?.time ||
    "12-15 mins";
  const locationLabel = isFetchingLocation
    ? "Detecting location..."
    : currentLocation?.name || "Select location";

  const baseColor = activeCategory?.headerColor || "var(--primary)";
  // Darkened so the accent stays visible on white even for pastel category colours.
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

  const goSearch = () => navigate("/search");

  const locationButton = (
    <button
      type="button"
      data-lenis-prevent
      data-lenis-prevent-touch
      onClick={() => setIsLocationOpen(true)}
      className="flex max-w-full items-center gap-0.5 border-0 bg-transparent p-0 text-left text-slate-500 hover:text-slate-800 active:opacity-70">
      <LocationOnIcon sx={{ fontSize: 14 }} className="shrink-0" />
      <span className="truncate text-[12px] font-medium md:max-w-[300px]">
        {locationLabel}
      </span>
      <ChevronDownIcon sx={{ fontSize: 16 }} className="shrink-0" />
    </button>
  );

  return (
    <>
      <div
        className={cn(
          "fixed left-0 right-0 top-0 z-[200] border-b border-slate-200 bg-white",
          isProductDetailOpen && "hidden md:block",
        )}
        style={{
          backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, ${baseColor} 58%, white) 0%, color-mix(in srgb, ${baseColor} 28%, white) 55%, white 100%)`,
        }}>
        {/* Mobile: location + actions, then search */}
        <div className="px-4 pt-2.5 md:hidden">
          <div ref={fold.topRef} className="overflow-hidden">
          <div ref={fold.topInnerRef} className="pb-2">
            <div className="flex h-10 items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex min-w-0 items-center gap-2 border-0 bg-transparent p-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-[0_1px_4px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
                  <img
                    src={logoUrl}
                    alt={`${appName} Logo`}
                    className="h-full w-full object-contain"
                  />
                </span>
                <span className="truncate text-[16px] font-extrabold leading-tight tracking-tight text-slate-900">
                  {appName}
                </span>
              </button>
              <div className="-mr-2 flex shrink-0 items-center">
                <IconButton
                  label="Notifications"
                  onClick={() => navigate("/notifications")}>
                  <NotificationsNoneOutlinedIcon sx={{ fontSize: 24 }} />
                </IconButton>
                <IconButton label="Open cart" onClick={() => navigate("/checkout")}>
                  <ShoppingCartOutlinedIcon sx={{ fontSize: 24 }} />
                </IconButton>
              </div>
            </div>
            <div className="mt-1 min-w-0">
              <div className="flex items-center gap-0.5 text-slate-900">
                <BoltIcon sx={{ fontSize: 20, color: accent }} className="-ml-1" />
                <span className="text-[18px] font-extrabold leading-none tracking-tight">
                  {deliveryEta}
                </span>
              </div>
              <div className="mt-1.5">{locationButton}</div>
            </div>
          </div>
          </div>
          <SearchField
            placeholder={searchPlaceholder}
            onClick={goSearch}
          />
          <div className="h-2" />
        </div>

        {/* Tablet / desktop: one row */}
        <div className="mx-auto hidden h-[68px] max-w-[1400px] items-center gap-6 px-6 md:flex">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex shrink-0 items-center gap-2.5 border-0 bg-transparent p-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-[0_1px_4px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
              <img
                src={logoUrl}
                alt={`${appName} Logo`}
                className="h-full w-full object-contain"
              />
            </span>
            <span className="max-w-[180px] truncate text-[18px] font-extrabold tracking-tight text-slate-900">
              {appName}
            </span>
          </button>

          <div className="flex h-9 shrink-0 flex-col justify-center border-l border-slate-200 pl-6">
            <div className="flex items-center gap-0.5 text-slate-900">
              <BoltIcon sx={{ fontSize: 16, color: accent }} className="-ml-0.5" />
              <span className="text-[14px] font-extrabold leading-none">
                {deliveryEta}
              </span>
            </div>
            <div className="mt-1">{locationButton}</div>
          </div>

          <SearchField
            placeholder={searchPlaceholder}
            onClick={goSearch}
            className="max-w-2xl flex-1"
          />

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <IconButton label="Wishlist" onClick={() => navigate("/wishlist")}>
              <FavoriteBorderOutlinedIcon sx={{ fontSize: 22 }} />
            </IconButton>
            <IconButton
              label="Notifications"
              onClick={() => navigate("/notifications")}>
              <NotificationsNoneOutlinedIcon sx={{ fontSize: 22 }} />
            </IconButton>
            <IconButton label="Open cart" onClick={() => navigate("/checkout")}>
              <ShoppingCartOutlinedIcon sx={{ fontSize: 22 }} />
            </IconButton>
            <IconButton label="Profile" onClick={() => navigate("/profile")}>
              <AccountCircleOutlinedIcon sx={{ fontSize: 26 }} />
            </IconButton>
          </div>
        </div>

        {/* Category tabs */}
        {categories.length > 0 && (
          <div ref={fold.tabsRef} className="overflow-hidden">
            <div ref={fold.tabsInnerRef} className="no-scrollbar flex snap-x overflow-x-auto px-2 md:mx-auto md:max-w-[1400px] md:justify-center md:px-6 md:pt-1">
              {categories.map((cat) => (
                <CategoryTab
                  key={cat.id}
                  cat={cat}
                  isActive={activeCategory?.id === cat.id}
                  accent={accent}
                  onSelect={onCategorySelect}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <LocationDrawer
        isOpen={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}
      />
    </>
  );
};

export default MainLocationHeader;
