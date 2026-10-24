import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useInViewAnimation } from "@/core/hooks/useInViewAnimation";
import { Sparkles, Heart, Snowflake, ChevronLeft, ChevronRight } from "lucide-react";

// MUI Icons (shared with admin & icon selector)
import HomeIcon from "@mui/icons-material/Home";
import DevicesIcon from "@mui/icons-material/Devices";
import LocalGroceryStoreIcon from "@mui/icons-material/LocalGroceryStore";
import KitchenIcon from "@mui/icons-material/Kitchen";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import PetsIcon from "@mui/icons-material/Pets";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import VerifiedIcon from "@mui/icons-material/Verified";

import { motion, useScroll, useTransform } from "framer-motion";
import { isMobileOrWebView } from "@/core/utils/deviceUtils";
import { customerApi } from "../services/customerApi";
import { toast } from "sonner";
import ProductCard from "../components/shared/ProductCard";
import MainLocationHeader from "../components/shared/MainLocationHeader";
import { useProductDetail } from "../context/ProductDetailContext";
import { cn } from "@/lib/utils";
import CardBanner from "@/assets/CardBanner.jpg";
import SectionRenderer from "../components/experience/SectionRenderer";
import ExperienceBannerCarousel from "../components/experience/ExperienceBannerCarousel";
import { useLocation } from "../context/LocationContext";
import { useSettings } from "@core/context/SettingsContext";
import NotFoundAnim from '@shared/components/ui/NotFoundAnim';
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import { getJSON, remove as removeStorage, STORAGE_KEYS } from "@core/utils/storage";

import {
  MARQUEE_MESSAGES,
  ICON_COMPONENTS,
} from "../constants/homeConstants";
import PromoMarquee from "../components/home/PromoMarquee";
import QuickCategorySlider from "../components/home/QuickCategorySlider";
import LowestPriceSection from "../components/home/LowestPriceSection";
import OfferSections from "../components/home/OfferSections";

const DEFAULT_CATEGORY_THEME = {
  gradient: "linear-gradient(to bottom, var(--primary), var(--brand-400))",
  shadow: "shadow-brand-500/20",
  accent: "text-[#1A1A1A]",
};

const CATEGORY_METADATA = {
  All: {
    icon: HomeIcon,
    theme: DEFAULT_CATEGORY_THEME,
    banner: {
      title: "HOUSEFULL",
      subtitle: "SALE",
      floatingElements: "sparkles",
    },
  },
  Grocery: {
    icon: LocalGroceryStoreIcon,
    theme: {
      gradient: "linear-gradient(to bottom, #FF9F1C, #FFBF69)",
      shadow: "shadow-orange-500/20",
      accent: "text-orange-900",
    },
    banner: {
      title: "SUPERSAVER",
      subtitle: "FRESH & FAST",
      floatingElements: "leaves",
    },
  },
  Wedding: {
    icon: CardGiftcardIcon,
    theme: {
      gradient: "linear-gradient(to bottom, #FF4D6D, #FF8FA3)",
      shadow: "shadow-rose-500/20",
      accent: "text-rose-900",
    },
    banner: { title: "WEDDING", subtitle: "BLISS", floatingElements: "hearts" },
  },
  "Home & Kitchen": {
    icon: KitchenIcon,
    theme: {
      gradient: "linear-gradient(to bottom, #BC6C25, #DDA15E)",
      shadow: "shadow-amber-500/20",
      accent: "text-amber-900",
    },
    banner: { title: "HOME", subtitle: "KITCHEN", floatingElements: "smoke" },
  },
  Electronics: {
    icon: DevicesIcon,
    theme: {
      gradient: "linear-gradient(to bottom, #7209B7, #B5179E)",
      shadow: "shadow-purple-500/20",
      accent: "text-purple-900",
    },
    banner: {
      title: "TECH FEST",
      subtitle: "GADGETS",
      floatingElements: "tech",
    },
  },
  Kids: {
    icon: ChildCareIcon,
    theme: {
      gradient: "linear-gradient(to bottom, #4CC9F0, #A0E7E5)",
      shadow: "shadow-brand-500/20",
      accent: "text-brand-900",
    },
    banner: {
      title: "LITTLE ONE",
      subtitle: "CARE",
      floatingElements: "bubbles",
    },
  },
  "Pet Supplies": {
    icon: PetsIcon,
    theme: {
      gradient: "linear-gradient(to bottom, #FB8500, #FFB703)",
      shadow: "shadow-yellow-500/20",
      accent: "text-yellow-900",
    },
    banner: { title: "PAWSOME", subtitle: "DEALS", floatingElements: "bones" },
  },
  Sports: {
    icon: SportsSoccerIcon,
    theme: {
      gradient: "linear-gradient(to bottom, #4361EE, #4895EF)",
      shadow: "shadow-brand-500/20",
      accent: "text-brand-900",
    },
    banner: { title: "SPORTS", subtitle: "GEAR", floatingElements: "confetti" },
  },
};

const ALL_CATEGORY = {
  id: "all",
  _id: "all",
  name: "All",
  icon: HomeIcon,
  theme: DEFAULT_CATEGORY_THEME,
  headerColor: "#0e7490",
  headerFontColor: "#111111",
  headerIconColor: "#111111",
  banner: {
    title: "HOUSEFULL",
    subtitle: "SALE",
    floatingElements: "sparkles",
    textColor: "text-white",
  },
};

const EMPTY_HERO_CONFIG = {
  banners: { items: [] },
  categoryIds: [],
};

const homePageDataCache = new Map();
const heroConfigMemoryCache = {};

const getHomePageDataCacheKey = (location) => {
  const lat = Number(location?.latitude);
  const lng = Number(location?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "home:no-location";
  return `home:${lat.toFixed(5)}:${lng.toFixed(5)}`;
};

const getCachedHomePageData = (location) =>
  homePageDataCache.get(getHomePageDataCacheKey(location)) || null;

const Home = () => {
  const { scrollY } = useScroll();
  const { isOpen: isProductDetailOpen } = useProductDetail();
  const { currentLocation, isFetchingLocation } = useLocation();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const quickCatsRef = useRef(null);
  const cachedHomePageData = getCachedHomePageData(currentLocation);

  const { ref: particleContainerRef, isVisible: particlesVisible } = useInViewAnimation();
  const heroRef = useRef(null);
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setHeroVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), { rootMargin: "0px" });
    const el = heroRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [categories, setCategories] = useState(() => cachedHomePageData?.categories || [ALL_CATEGORY]);
  const [activeCategory, setActiveCategory] = useState(() => cachedHomePageData?.activeCategory || ALL_CATEGORY);
  const [products, setProducts] = useState(() => cachedHomePageData?.products || []);
  const productsRef = useRef(cachedHomePageData?.products || []);
  const [quickCategories, setQuickCategories] = useState(() => cachedHomePageData?.quickCategories || []);
  const [isLoading, setIsLoading] = useState(() => !cachedHomePageData);
  const [experienceSections, setExperienceSections] = useState(() => cachedHomePageData?.experienceSections || []);
  const [headerSections, setHeaderSections] = useState([]);
  const [headerProducts, setHeaderProducts] = useState([]);
  const [isHeaderProductsLoading, setIsHeaderProductsLoading] = useState(false);
  const [selectedHeaderChildId, setSelectedHeaderChildId] = useState("all");
  const [heroConfig, setHeroConfig] = useState(() => cachedHomePageData?.heroConfig || heroConfigMemoryCache.__home__ || EMPTY_HERO_CONFIG);
  const [mobileBannerIndex, setMobileBannerIndex] = useState(0);
  const [isInstantBannerJump, setIsInstantBannerJump] = useState(false);
  const [categoryMap, setCategoryMap] = useState(() => cachedHomePageData?.categoryMap || {});
  const [subcategoryMap, setSubcategoryMap] = useState(() => cachedHomePageData?.subcategoryMap || {});
  const [pendingReturn, setPendingReturn] = useState(null);
  const [offerSections, setOfferSections] = useState(() => cachedHomePageData?.offerSections || []);
  // "Service unavailable" only once we have a location and its products
  // finished loading; not while the location is still being detected
  const hasLocation = Number.isFinite(currentLocation?.latitude) && Number.isFinite(currentLocation?.longitude);
  const [loadedForKey, setLoadedForKey] = useState(null);
  const showNoService = products.length === 0 && !isLoading && hasLocation && !isFetchingLocation
    && loadedForKey === getHomePageDataCacheKey(currentLocation);

  useEffect(() => {
    productsRef.current = products || [];
  }, [products]);


  const applyHomePageData = (data, { cacheKey, persist = true } = {}) => {
    if (!data) return;
    setCategoryMap(data.categoryMap || {});
    setSubcategoryMap(data.subcategoryMap || {});
    setCategories(data.categories || [ALL_CATEGORY]);
    setQuickCategories(data.quickCategories || []);
    setProducts(data.products || []);
    setExperienceSections(data.experienceSections || []);
    setOfferSections(data.offerSections || []);
    if (data.heroConfig) setHeroConfig(data.heroConfig);
    setActiveCategory((prev) => {
      const parsed = getJSON(STORAGE_KEYS.EXPERIENCE_RETURN, null, { storage: "session" });
      if (parsed?.headerId) {
        const match = (data.formattedHeaders || []).find((h) => h._id === parsed.headerId);
        if (match) return match;
      }
      if (!prev || prev._id === "all") return data.activeCategory || data.categories?.[0] || ALL_CATEGORY;
      return (data.categories || []).find((cat) => cat._id === prev._id) || data.activeCategory || prev;
    });
    if (persist && cacheKey) homePageDataCache.set(cacheKey, data);
  };

  const fetchSeqRef = useRef(0);
  const fetchData = async ({ forceRefresh = false, attempt = 0 } = {}) => {
    const seq = ++fetchSeqRef.current;
    const cacheKey = getHomePageDataCacheKey(currentLocation);
    if (!forceRefresh) {
      const cached = homePageDataCache.get(cacheKey);
      if (cached) {
        applyHomePageData(cached, { cacheKey, persist: false });
        customerApi.getExperienceSections({ pageType: "home" }).then((res) => {
          if (!res.data?.success) return;
          const sections = Array.isArray(res.data.result || res.data.results)
            ? (res.data.result || res.data.results)
            : [];
          setExperienceSections(sections);
          const latestCachedData = homePageDataCache.get(cacheKey);
          if (latestCachedData) {
            homePageDataCache.set(cacheKey, { ...latestCachedData, experienceSections: sections });
          }
        }).catch(() => {});
        setLoadedForKey(cacheKey);
        setIsLoading(false);
        return;
      }
    }
    setIsLoading(true);
    try {
      const hasValidLocation = Number.isFinite(currentLocation?.latitude) && Number.isFinite(currentLocation?.longitude);
      const productParams = { limit: 20 };
      if (hasValidLocation) {
        productParams.lat = currentLocation.latitude;
        productParams.lng = currentLocation.longitude;
      }
      const [catRes, prodRes, expRes, sectionsRes] = await Promise.all([
        customerApi.getCategories(),
        hasValidLocation ? customerApi.getProducts(productParams) : Promise.resolve({ data: { success: true, result: { items: [] } } }),
        customerApi.getExperienceSections({ pageType: "home" }).catch(() => null),
        hasValidLocation ? customerApi.getOfferSections({ lat: currentLocation.latitude, lng: currentLocation.longitude }).catch(() => ({ data: {} })) : Promise.resolve({ data: { results: [] } }),
      ]);
      const nextHomeData = {
        categories: [ALL_CATEGORY],
        activeCategory: ALL_CATEGORY,
        products: [],
        quickCategories: [],
        experienceSections: [],
        offerSections: [],
        categoryMap: {},
        subcategoryMap: {},
        formattedHeaders: [],
        heroConfig: heroConfigMemoryCache.__home__ || EMPTY_HERO_CONFIG,
      };
      if (catRes.data.success) {
        const dbCats = catRes.data.results || catRes.data.result || [];
        const catMap = {};
        const subMap = {};
        dbCats.forEach((c) => { if (c.type === "category") catMap[c._id] = c; else if (c.type === "subcategory") subMap[c._id] = c; });
        nextHomeData.categoryMap = catMap;
        nextHomeData.subcategoryMap = subMap;
        const formattedHeaders = dbCats.filter((cat) => cat.type === "header").map((cat) => {
          const catName = cat.name;
          const meta = CATEGORY_METADATA[catName] || CATEGORY_METADATA[catName.toUpperCase()] || { icon: Sparkles, theme: DEFAULT_CATEGORY_THEME, banner: { title: catName.toUpperCase(), subtitle: "TOP PICKS", floatingElements: "sparkles" } };
          const IconComp = (cat.iconId && ICON_COMPONENTS[cat.iconId]) || meta.icon || Sparkles;
          return { ...cat, id: cat._id, icon: IconComp, theme: meta.theme, banner: { ...meta.banner, textColor: "text-white" } };
        });
        nextHomeData.formattedHeaders = formattedHeaders;
        const allHeaderFromAdmin = formattedHeaders.find((h) => (h.slug?.toLowerCase() === "all") || (h.name?.toLowerCase() === "all"));
        const mergedAllCategory = allHeaderFromAdmin ? { ...ALL_CATEGORY, headerColor: allHeaderFromAdmin.headerColor || ALL_CATEGORY.headerColor, headerFontColor: allHeaderFromAdmin.headerFontColor || ALL_CATEGORY.headerFontColor, headerIconColor: allHeaderFromAdmin.headerIconColor || ALL_CATEGORY.headerIconColor, icon: allHeaderFromAdmin.icon || ALL_CATEGORY.icon } : ALL_CATEGORY;
        nextHomeData.categories = [mergedAllCategory, ...formattedHeaders.filter((h) => !((h.slug?.toLowerCase() === "all") || (h.name?.toLowerCase() === "all")))];
        nextHomeData.activeCategory = mergedAllCategory;
        nextHomeData.quickCategories = dbCats.filter((cat) => cat.type === "category").map((cat) => ({ id: cat._id, name: cat.name, image: cat.image || "https://cdn-icons-png.flaticon.com/128/2321/2321831.png" }));
      }
      if (prodRes.data.success) {
        const rawResult = prodRes.data.result;
        const dbProds = Array.isArray(prodRes.data.results) ? prodRes.data.results : Array.isArray(rawResult?.items) ? rawResult.items : Array.isArray(rawResult) ? rawResult : [];
        nextHomeData.products = dbProds.map((p) => ({ ...p, id: p._id, image: p.mainImage || p.image || "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400&h=400", price: p.salePrice || p.price, originalPrice: p.price, weight: p.weight || "1 unit", deliveryTime: "8-15 mins" }));
      }
      if (expRes?.data?.success) nextHomeData.experienceSections = Array.isArray(expRes.data.result || expRes.data.results) ? (expRes.data.result || expRes.data.results) : [];
      const sectionsList = sectionsRes?.data?.results || sectionsRes?.data?.result || sectionsRes?.data;
      nextHomeData.offerSections = Array.isArray(sectionsList) ? sectionsList : [];
      applyHomePageData(nextHomeData, { cacheKey });
      setLoadedForKey(cacheKey);
      setIsLoading(false);
    } catch (error) {
      console.error("Error:", error);
      // A failed/slow request is not "no service here": keep loading and retry
      // (twice, 3 s apart) instead of showing the service-unavailable screen
      if (attempt < 2) {
        setTimeout(() => { if (seq === fetchSeqRef.current) fetchData({ forceRefresh: true, attempt: attempt + 1 }); }, 3000);
      } else {
        setLoadedForKey(cacheKey);
        setIsLoading(false);
      }
    }
  };

  const hydrateSelectedSectionProducts = async (sections = []) => {
    const selectedProductIds = Array.from(new Set(sections.flatMap((s) => s?.displayType === "products" ? (s?.config?.products?.productIds || []) : []).map((id) => String(id || "").trim()).filter(Boolean)));
    if (!selectedProductIds.length) return;
    const existingIds = new Set(productsRef.current.map((p) => String(p?._id || p?.id || "").trim()));
    const missingIds = selectedProductIds.filter((id) => !existingIds.has(id));
    if (!missingIds.length) return;
    try {
      const locationParams = Number.isFinite(currentLocation?.latitude) ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : undefined;
      const missingResults = await Promise.allSettled(missingIds.map((id) => customerApi.getProductById(id, locationParams)));
      const fetchedMissing = missingResults.filter((r) => r.status === "fulfilled").flatMap((r) => { const p = r.value?.data?.result || r.value?.data?.results; return Array.isArray(p) ? p : (p ? [p] : []); }).map((p) => ({ ...p, id: p._id, image: p.mainImage || p.image || "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400&h=400", price: p.salePrice || p.price, originalPrice: p.price, weight: p.weight || "1 unit", deliveryTime: "8-15 mins" }));
      if (fetchedMissing.length) setProducts((prev) => { const merged = [...prev]; const mergedIds = new Set(merged.map((p) => String(p?._id || p?.id || "").trim())); fetchedMissing.forEach((p) => { const key = String(p?._id || p?.id || "").trim(); if (!mergedIds.has(key)) { merged.push(p); mergedIds.add(key); } }); return merged; });
    } catch (e) {}
  };

  useEffect(() => { fetchData(); }, [currentLocation?.latitude, currentLocation?.longitude]);
  const heroConfigCache = useRef(heroConfigMemoryCache);

  useEffect(() => {
    const fetchHeaderSections = async () => {
      if (!activeCategory || activeCategory._id === "all") { setHeaderSections([]); return; }
      try {
        const res = await customerApi.getExperienceSections({ pageType: "header", headerId: activeCategory._id });
        if (res.data.success) { const sections = Array.isArray(res.data.result || res.data.results) ? (res.data.result || res.data.results) : []; setHeaderSections(sections); await hydrateSelectedSectionProducts(sections); }
        else setHeaderSections([]);
      } catch (e) { setHeaderSections([]); }
    };
    fetchHeaderSections();
  }, [activeCategory]);

  useEffect(() => {
    const fetchHeroConfig = async () => {
      try {
        const isHeader = activeCategory && activeCategory._id !== "all";
        const cacheKey = isHeader ? activeCategory._id : "__home__";
        if (heroConfigCache.current[cacheKey]) { setHeroConfig(heroConfigCache.current[cacheKey]); return; }
        let payload = null;
        if (isHeader) { const res = await customerApi.getHeroConfig({ pageType: "header", headerId: activeCategory._id }); if (res.data?.success && res.data?.result) payload = res.data.result; }
        if (!payload || (payload.banners?.items?.length === 0 && !payload.categoryIds?.length)) { const homeRes = await customerApi.getHeroConfig({ pageType: "home" }); if (homeRes.data?.success && homeRes.data?.result) payload = homeRes.data.result; }
        const resolved = payload && (payload.banners?.items?.length > 0 || payload.categoryIds?.length > 0) ? { banners: payload.banners || { items: [] }, categoryIds: payload.categoryIds || [] } : { banners: { items: [] }, categoryIds: [] };
        heroConfigCache.current[cacheKey] = resolved;
        if (cacheKey === "__home__") { const homeCacheKey = getHomePageDataCacheKey(currentLocation); const cachedHomeData = homePageDataCache.get(homeCacheKey); if (cachedHomeData) homePageDataCache.set(homeCacheKey, { ...cachedHomeData, heroConfig: resolved }); }
        setHeroConfig(resolved);
      } catch (e) { setHeroConfig(EMPTY_HERO_CONFIG); }
    };
    fetchHeroConfig();
  }, [activeCategory, currentLocation?.latitude, currentLocation?.longitude]);

  useEffect(() => {
    const firstUrl = heroConfig?.banners?.items?.[0]?.imageUrl;
    if (!firstUrl) return;
    const link = document.createElement("link");
    link.rel = "preload"; link.as = "image"; link.href = applyCloudinaryTransform(firstUrl, "f_auto,q_auto,c_scale,w_824");
    link.setAttribute("fetchpriority", "high"); document.head.appendChild(link);
    return () => { if (link.parentNode) link.parentNode.removeChild(link); };
  }, [heroConfig?.banners?.items?.[0]?.imageUrl]);

  useEffect(() => {
    const totalSlides = 3;
    const intervalId = setInterval(() => { setMobileBannerIndex((prev) => prev >= totalSlides - 1 ? prev : prev + 1); }, 3500);
    return () => clearInterval(intervalId);
  }, []);

  const handleBannerTransitionEnd = () => { if (mobileBannerIndex === 2) { setIsInstantBannerJump(true); setMobileBannerIndex(0); } };
  useEffect(() => { if (!isInstantBannerJump) return; const id = requestAnimationFrame(() => setIsInstantBannerJump(false)); return () => cancelAnimationFrame(id); }, [isInstantBannerJump]);

  const isAllCategory = !activeCategory || activeCategory._id === "all";

  useEffect(() => {
    if (isAllCategory) {
      setHeaderProducts([]);
      setSelectedHeaderChildId("all");
      return;
    }
    let isCancelled = false;
    setIsHeaderProductsLoading(true);
    setSelectedHeaderChildId("all");

    const params = {
      headerId: activeCategory._id,
      limit: 60,
    };
    if (Number.isFinite(currentLocation?.latitude) && Number.isFinite(currentLocation?.longitude)) {
      params.lat = currentLocation.latitude;
      params.lng = currentLocation.longitude;
    }

    customerApi.getProducts(params)
      .then((res) => {
        if (isCancelled) return;
        if (res.data?.success) {
          const raw = res.data.result;
          const items = Array.isArray(res.data.results)
            ? res.data.results
            : Array.isArray(raw?.items)
            ? raw.items
            : Array.isArray(raw)
            ? raw
            : [];
          const formatted = items.map((p) => ({
            ...p,
            id: p._id,
            image:
              p.mainImage ||
              p.image ||
              "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400&h=400",
            price: p.salePrice || p.price,
            originalPrice: p.price,
            weight: p.weight || "1 unit",
            deliveryTime: "8-15 mins",
          }));
          setHeaderProducts(formatted);
        } else {
          setHeaderProducts([]);
        }
      })
      .catch(() => {
        if (!isCancelled) setHeaderProducts([]);
      })
      .finally(() => {
        if (!isCancelled) setIsHeaderProductsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeCategory?._id, currentLocation?.latitude, currentLocation?.longitude, isAllCategory]);

  const productsById = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[p._id || p.id] = p;
    });
    headerProducts.forEach((p) => {
      map[p._id || p.id] = p;
    });
    return map;
  }, [products, headerProducts]);

  const activeHeaderChildCategories = useMemo(() => {
    if (isAllCategory) return [];
    return Object.values(categoryMap).filter((c) => {
      const pId = c.parentId?._id || c.parentId;
      return String(pId) === String(activeCategory._id);
    });
  }, [isAllCategory, activeCategory?._id, categoryMap]);

  const activeHeaderSubcategories = useMemo(() => {
    if (!activeHeaderChildCategories.length) return [];
    const childCatIds = new Set(activeHeaderChildCategories.map((c) => String(c._id)));
    return Object.values(subcategoryMap).filter((s) => {
      const pId = s.parentId?._id || s.parentId;
      return childCatIds.has(String(pId));
    });
  }, [activeHeaderChildCategories, subcategoryMap]);

  const filteredHeaderProducts = useMemo(() => {
    if (!selectedHeaderChildId || selectedHeaderChildId === "all") {
      return headerProducts;
    }
    return headerProducts.filter((p) => {
      const cId = String(p.categoryId?._id || p.categoryId || "");
      const sId = String(p.subcategoryId?._id || p.subcategoryId || "");
      return cId === selectedHeaderChildId || sId === selectedHeaderChildId;
    });
  }, [headerProducts, selectedHeaderChildId]);

  const effectiveQuickCategories = useMemo(() => {
    const ids = heroConfig.categoryIds || [];
    if (ids.length > 0) {
      const resolved = ids
        .map((id) => categoryMap[id])
        .filter(Boolean)
        .map((c) => ({
          id: c._id,
          name: c.name,
          image: c.image || "https://cdn-icons-png.flaticon.com/128/2321/2321831.png",
        }));
      if (resolved.length > 0) return resolved;
    }
    return quickCategories;
  }, [heroConfig.categoryIds, categoryMap, quickCategories]);

  const isMobile = useMemo(() => isMobileOrWebView(), []);
  const opacity = useTransform(scrollY, (heroVisible && !isMobile) ? [0, 300] : [0, 0], [1, 0.6]);
  const y = useTransform(scrollY, (heroVisible && !isMobile) ? [0, 300] : [0, 0], [0, 80]);
  const scale = useTransform(scrollY, (heroVisible && !isMobile) ? [0, 300] : [0, 0], [1, 0.95]);
  const pointerEvents = useTransform(scrollY, (heroVisible && !isMobile) ? [0, 100] : [0, 0], ["auto", "none"]);

  useEffect(() => {
    if (!pendingReturn?.sectionId) return;
    const allSections = headerSections.length ? headerSections : experienceSections;
    if (!allSections.length) return;
    if (allSections.some((s) => s._id === pendingReturn.sectionId)) {
      const el = document.getElementById(`section-${pendingReturn.sectionId}`);
      if (el) {
        el.scrollIntoView({ behavior: "instant", block: "start" });
        removeStorage(STORAGE_KEYS.EXPERIENCE_RETURN, { storage: "session" });
        setPendingReturn(null);
      }
    }
  }, [headerSections, experienceSections, pendingReturn]);

  const renderFloatingElements = (type, isVisible = true) => {
    if (isMobile) return null;
    return null;
  };

  return (
    <div className={`customer-home min-h-screen pt-[172px] md:pt-[152px] ${showNoService ? "bg-white" : "bg-[#F5F7F8]"}`}>
      <div className={cn("contents", isProductDetailOpen && "hidden md:contents")}>
        <MainLocationHeader categories={categories} activeCategory={activeCategory} onCategorySelect={setActiveCategory} />
      </div>

      {showNoService ? (
        <div className="flex flex-col items-center justify-center pt-4 pb-48">
          <NotFoundAnim />
          <h3 className="text-3xl md:text-5xl font-black text-slate-800 text-center uppercase">Service <span className="text-primary">Unavailable</span></h3>
          <p className="text-slate-500 font-bold max-w-md text-center px-10 text-sm md:text-lg opacity-80">Ah! We haven't reached your neighborhood yet.</p>
          <button onClick={() => window.location.reload()} className="mt-12 px-10 py-4 bg-primary text-white font-black rounded-[24px] uppercase text-[13px] tracking-widest transition-all active:scale-95">Check Again</button>
        </div>
      ) : (
        <>
          <motion.div ref={heroRef} className="block md:hidden will-change-transform" style={isMobile ? { opacity: 1 } : { opacity, y, scale, pointerEvents }}>
            <div className="relative w-full overflow-hidden">
              {heroConfig.banners?.items?.length ? (
                <ExperienceBannerCarousel section={{ title: "" }} items={heroConfig.banners.items} fullWidth edgeToEdge />
              ) : (
                <div className="customer-home-hero w-full min-h-[200px] px-5 py-6 relative overflow-hidden flex items-center bg-[#eaf4e8]">
                  <div className="relative z-10 max-w-[70%] flex flex-col items-start gap-2.5">
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-primary">Your neighborhood, delivered</span>
                    <h4 className="text-[26px] leading-[1.04] font-black tracking-tight text-[#17231a]">Good things,<br /><span className="text-primary">at your door.</span></h4>
                    <p className="text-[11px] font-medium text-slate-600">Fresh picks and daily essentials, in minutes.</p>
                    <button onClick={() => navigate("/category/all")} className="mt-1 rounded-full bg-[#183321] px-4 py-2.5 text-[11px] font-bold text-white shadow-sm active:scale-95">Start shopping</button>
                  </div>
                  <div aria-hidden="true" className="absolute -right-8 -bottom-10 h-44 w-44 rounded-full border-[22px] border-white/50 bg-primary/10" />
                  <div aria-hidden="true" className="absolute right-7 top-8 h-16 w-16 rounded-full bg-white/70 blur-sm" />
                </div>
              )}
            </div>
          </motion.div>

          <section className="customer-desktop-hero hidden md:block">
            {heroConfig.banners?.items?.length ? (
              <ExperienceBannerCarousel section={{ title: "" }} items={heroConfig.banners.items} fullWidth />
            ) : (
              <div className="mx-auto grid max-w-[1400px] grid-cols-[1.15fr_.85fr] items-center gap-12 px-8 py-12 xl:px-12">
                <div className="relative z-10 max-w-2xl">
                  <p className="mb-4 text-sm font-bold text-emerald-100">A better way to stock up</p>
                  <h1 className="max-w-xl text-5xl font-black leading-[1.03] tracking-[-0.045em] text-white xl:text-6xl">Everyday finds,<br />closer to home.</h1>
                  <p className="mt-5 max-w-lg text-base leading-7 text-white/75">Browse the things you need, discover something new, and get your order moving in a few clicks.</p>
                  <button onClick={() => navigate("/categories")} className="mt-8 rounded-xl bg-white px-6 py-3.5 text-sm font-extrabold text-[#183321] transition hover:bg-emerald-50">Explore categories</button>
                </div>
                <div className="relative flex min-h-[300px] items-center justify-center">
                  <div aria-hidden="true" className="absolute h-[330px] w-[330px] rounded-full border border-white/20 bg-white/10" />
                  <div aria-hidden="true" className="absolute h-[250px] w-[250px] rounded-full border border-white/25" />
                  {effectiveQuickCategories[0]?.image && <img src={applyCloudinaryTransform(effectiveQuickCategories[0].image, "f_auto,q_auto,w_600")} alt="" className="relative z-10 h-[250px] w-[250px] rounded-full border-8 border-white/20 bg-white object-cover shadow-2xl xl:h-[290px] xl:w-[290px]" />}
                </div>
              </div>
            )}
          </section>

          {/* CATEGORY VIEW: When a specific Header Category is selected */}
          {!isAllCategory && (
            <div className="container mx-auto px-4 md:px-8 lg:px-[50px] py-6 md:py-8 space-y-6 md:space-y-8">
              {/* If admin configured custom experience sections for this header, show them */}
              {headerSections.length > 0 && (
                <div className="mb-6">
                  <SectionRenderer
                    sections={headerSections}
                    productsById={productsById}
                    categoriesById={categoryMap}
                    subcategoriesById={subcategoryMap}
                  />
                </div>
              )}

              {/* Subcategories & Child Categories Rail/Pills */}
              {(activeHeaderChildCategories.length > 0 || activeHeaderSubcategories.length > 0) && (
                <div className="rounded-[22px] md:rounded-[24px] border border-[#e2e9df] bg-white p-4 sm:p-5 shadow-[0_2px_12px_rgba(24,51,33,0.04)]">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#edf5e9] text-[#183321]">
                        <Sparkles size={14} />
                      </span>
                      <div>
                        <h3 className="font-heading text-sm md:text-base font-extrabold text-[#183321]">
                          Explore {activeCategory.name}
                        </h3>
                        <p className="text-[11px] font-medium text-slate-500">
                          Select a category to filter items below
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/categories`)}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      All categories →
                    </button>
                  </div>

                  {/* Horizontal filter chips */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                    <button
                      type="button"
                      onClick={() => setSelectedHeaderChildId("all")}
                      className={cn(
                        "rounded-full px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95",
                        selectedHeaderChildId === "all"
                          ? "bg-[#183321] text-white shadow-xs"
                          : "border border-[#e2e9df] bg-[#f7f9f6] text-slate-700 hover:bg-white"
                      )}
                    >
                      All {activeCategory.name} ({headerProducts.length})
                    </button>

                    {activeHeaderChildCategories.map((c) => {
                      const isSelected = selectedHeaderChildId === c._id;
                      return (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => setSelectedHeaderChildId(c._id)}
                          className={cn(
                            "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95",
                            isSelected
                              ? "bg-primary text-white shadow-xs"
                              : "border border-[#e2e9df] bg-[#f7f9f6] text-slate-700 hover:bg-white"
                          )}
                        >
                          {c.image && (
                            <img
                              src={applyCloudinaryTransform(c.image, "f_auto,q_auto,w_40")}
                              alt=""
                              className="h-4 w-4 rounded-full object-cover"
                            />
                          )}
                          <span>{c.name}</span>
                        </button>
                      );
                    })}

                    {activeHeaderSubcategories.map((s) => {
                      const isSelected = selectedHeaderChildId === s._id;
                      return (
                        <button
                          key={s._id}
                          type="button"
                          onClick={() => setSelectedHeaderChildId(s._id)}
                          className={cn(
                            "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer active:scale-95",
                            isSelected
                              ? "bg-primary text-white shadow-xs font-bold"
                              : "border border-slate-200 bg-white text-slate-600 hover:border-primary/40"
                          )}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Products Grid for this category: Max 3 products on mobile */}
              <div className="rounded-[22px] md:rounded-[24px] border border-[#e2e9df] bg-white p-4 sm:p-6 md:p-8 shadow-[0_2px_12px_rgba(24,51,33,0.04)]">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <div>
                    <h2 className="font-heading text-lg md:text-2xl font-black text-[#183321] tracking-tight">
                      {selectedHeaderChildId !== "all"
                        ? (categoryMap[selectedHeaderChildId]?.name || subcategoryMap[selectedHeaderChildId]?.name || activeCategory.name)
                        : `${activeCategory.name} Products`}
                    </h2>
                    <p className="text-xs md:text-sm font-medium text-slate-500 mt-0.5">
                      {filteredHeaderProducts.length} items available in your location
                    </p>
                  </div>
                  {selectedHeaderChildId !== "all" && (
                    <button
                      type="button"
                      onClick={() => setSelectedHeaderChildId("all")}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Clear filter
                    </button>
                  )}
                </div>

                {isHeaderProductsLoading ? (
                  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3.5 md:gap-4.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-44 sm:h-52 bg-slate-100 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : filteredHeaderProducts.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3.5 md:gap-4.5">
                    {filteredHeaderProducts.map((product) => (
                      <div
                        key={product._id || product.id}
                        className="transition-transform duration-200 hover:-translate-y-1"
                      >
                        <ProductCard product={product} compact={true} neutralBg={true} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <p className="text-sm md:text-base font-bold text-slate-600 mb-3">
                      No products found in this category right now.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveCategory(ALL_CATEGORY)}
                      className="rounded-full bg-primary px-5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-700 active:scale-95"
                    >
                      Browse All Categories
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ALL VIEW: Shop by category & Marquee always on top, followed by admin sections */}
          {isAllCategory && (
            <>
              {/* Category-wise slider ALWAYS ON TOP */}
              <QuickCategorySlider categories={effectiveQuickCategories} onCategoryClick={(id) => navigate(`/category/${id}`)} />
              <PromoMarquee />

              {/* Admin Created Sections */}
              {experienceSections.length > 0 && (
                <div className="container mx-auto px-4 md:px-8 lg:px-[50px] pt-2 md:pt-4 pb-2">
                  <SectionRenderer
                    sections={experienceSections}
                    productsById={productsById}
                    categoriesById={categoryMap}
                    subcategoriesById={subcategoryMap}
                  />
                </div>
              )}

              <LowestPriceSection products={products} onSeeAll={() => navigate("/category/all")} />
              <OfferSections sections={offerSections} />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
