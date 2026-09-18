import React, { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Heart, Search, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '@shared/components/ui/Toast';
import { cn } from '@/lib/utils';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';

import ProductCard from '../components/shared/ProductCard';
import ProductDetailSheet from '../components/shared/ProductDetailSheet';
import { useProductDetail } from '../context/ProductDetailContext';
import { customerApi } from '../services/customerApi';
import MiniCart from '../components/shared/MiniCart';
import SectionRenderer from "../components/experience/SectionRenderer";
import { useLocation as useAppLocation } from '../context/LocationContext';
import { useSettings } from '@core/context/SettingsContext';
import Lottie from 'lottie-react';

const CategoryProductsPage = () => {
    const { categoryName: catId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { currentLocation } = useAppLocation();
    const { settings } = useSettings();
    const initialSubcategoryId = location.state?.activeSubcategoryId || 'all';
    const { isOpen: isProductDetailOpen } = useProductDetail();
    const [selectedSubCategory, setSelectedSubCategory] = useState(initialSubcategoryId);
    const [noServiceData, setNoServiceData] = useState(null);

    // Dynamically load no-service Lottie on mount
    useEffect(() => {
        import('@/assets/lottie/animation.json')
            .then((m) => setNoServiceData(m.default))
            .catch(() => {});
    }, []);

    const DEFAULT_SUBCATEGORIES = [{ 
        id: 'all', 
        name: 'All', 
        icon: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200&h=200',
        isAll: true 
    }];

    const GENERIC_ICONS = [
        'https://cdn-icons-png.flaticon.com/128/2321/2321801.png',
        'https://cdn-icons-png.flaticon.com/128/2321/2321831.png',
    ];

    const SUBCATEGORY_IMAGE_MAP = [
        { keywords: ['juice', 'dip', 'drink', 'beverage', 'syrup'], url: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&q=80&w=200&h=200' },
        { keywords: ['sprout', 'cut', 'microgreen', 'salad'], url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=200&h=200' },
        { keywords: ['organic', 'certified', 'bio', 'farm'], url: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&q=80&w=200&h=200' },
        { keywords: ['vegetable', 'veggie', 'green', 'leafy'], url: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&q=80&w=200&h=200' },
        { keywords: ['fruit', 'apple', 'banana', 'mango', 'berry', 'citrus'], url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&q=80&w=200&h=200' },
        { keywords: ['milk', 'dairy', 'paneer', 'curd', 'butter', 'cheese', 'ghee'], url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=200&h=200' },
        { keywords: ['bread', 'bakery', 'toast', 'bun', 'baking'], url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=200&h=200' },
        { keywords: ['chip', 'snack', 'biscuit', 'munch', 'namkeen', 'cookie'], url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&q=80&w=200&h=200' },
        { keywords: ['meat', 'chicken', 'fish', 'egg', 'seafood'], url: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80&w=200&h=200' },
        { keywords: ['beverage', 'soda', 'cold drink', 'water'], url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=200&h=200' },
        { keywords: ['clean', 'household', 'detergent', 'toilet', 'wash'], url: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&q=80&w=200&h=200' },
        { keywords: ['personal', 'soap', 'shampoo', 'beauty', 'care', 'skin'], url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=200&h=200' },
        { keywords: ['tea', 'coffee', 'chai'], url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=200&h=200' },
        { keywords: ['spice', 'masala', 'oil', 'dhal', 'dal', 'rice', 'grain', 'atta'], url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=200&h=200' },
    ];

    const resolveSubcategoryIcon = (name, rawImage) => {
        if (rawImage && !GENERIC_ICONS.some(g => rawImage.includes(g))) {
            return rawImage;
        }
        const lower = (name || '').toLowerCase();
        const matched = SUBCATEGORY_IMAGE_MAP.find(m => m.keywords.some(k => lower.includes(k)));
        return matched ? matched.url : 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&q=80&w=200&h=200';
    };

    const hasValidLocation =
        Number.isFinite(currentLocation?.latitude) &&
        Number.isFinite(currentLocation?.longitude);

    // Perf audit Phase 8: migrated to React Query. Products + category tree
    // were always fetched together in parallel as one unit, so they stay
    // one query, keyed on catId + location (matches the original effect's
    // dependency array exactly). `placeholderData: keepPreviousData` avoids
    // a blank flash when switching categories or when location refreshes.
    const { data: categoryData, isLoading, refetch } = useQuery({
        queryKey: ['customer', 'categoryProducts', catId, hasValidLocation ? currentLocation.latitude : null, hasValidLocation ? currentLocation.longitude : null],
        queryFn: async () => {
            const [prodRes, catRes] = await Promise.all([
                hasValidLocation
                    ? customerApi.getProducts({
                        categoryId: catId,
                        lat: currentLocation.latitude,
                        lng: currentLocation.longitude,
                    })
                    : Promise.resolve({ data: { success: true, result: { items: [] } } }),
                customerApi.getCategories({ tree: true }),
            ]);

            let products = [];
            if (prodRes.data.success) {
                const rawResult = prodRes.data.result;
                const dbProds = Array.isArray(prodRes.data.results)
                    ? prodRes.data.results
                    : Array.isArray(rawResult?.items)
                    ? rawResult.items
                    : Array.isArray(rawResult)
                    ? rawResult
                    : [];

                products = dbProds.map(p => ({
                    ...p,
                    id: p._id,
                    image:
                      p.mainImage ||
                      p.image ||
                      "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400&h=400",
                    price: p.salePrice || p.price,
                    originalPrice: p.price,
                    weight: p.weight || "1 unit",
                    deliveryTime: "8-15 mins"
                }));
            }

            let category = null;
            let subCategories = DEFAULT_SUBCATEGORIES;
            if (catRes.data.success) {
                const tree = catRes.data.results || catRes.data.result || [];
                let currentCat = null;
                for (const header of tree) {
                    const found = (header.children || []).find(c => c._id === catId);
                    if (found) {
                        currentCat = found;
                        break;
                    }
                }

                if (currentCat) {
                    category = currentCat;
                    const subs = (currentCat.children || []).map(s => ({
                        id: s._id,
                        name: s.name,
                        icon: resolveSubcategoryIcon(s.name, s.image)
                    }));
                    subCategories = [...DEFAULT_SUBCATEGORIES, ...subs];
                }
            }

            return { products, category, subCategories };
        },
        placeholderData: keepPreviousData,
    });

    const category = categoryData?.category ?? null;
    const subCategories = categoryData?.subCategories ?? DEFAULT_SUBCATEGORIES;
    const products = categoryData?.products ?? [];
    const fetchData = refetch;

    useEffect(() => {
        setSelectedSubCategory(location.state?.activeSubcategoryId || 'all');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [catId, location.state?.activeSubcategoryId]);

    const safeProducts = Array.isArray(products) ? products : [];

    const filteredProducts = safeProducts.filter(p =>
        selectedSubCategory === 'all' || p.subcategoryId?._id === selectedSubCategory || p.subcategoryId === selectedSubCategory
    );

    const productsById = React.useMemo(() => {
        const map = {};
        safeProducts.forEach(p => {
            map[p._id || p.id] = p;
        });
        return map;
    }, [safeProducts]);

    return (
        <div className="flex flex-col min-h-screen bg-white max-w-md mx-auto relative font-sans">
            {/* Header */}
            <header className={cn(
                "sticky top-0 z-50 bg-white border-b border-gray-50 px-4 py-4 flex items-center justify-between",
                isProductDetailOpen && "hidden md:flex"
            )}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1 hover:bg-gray-50 rounded-full transition-colors"
                    >
                        <ChevronLeft size={24} className="text-gray-900" />
                    </button>
                    <h1 className="text-[18px] font-bold text-gray-800 tracking-tight">
                        {category?.name || catId}
                    </h1>
                </div>

            </header>

            <div className="flex flex-1 relative items-start">
                {(safeProducts.length === 0 && !isLoading) ? (
                    <div className="w-full flex-1 py-20 px-8 flex flex-col items-center justify-center text-center">
                        <div className="w-64 h-64 mb-6">
                            {noServiceData ? (
                                <Lottie animationData={noServiceData} loop={true} />
                            ) : (
                                <div className="w-64 h-64" />
                            )}
                        </div>
                        <h3 className="text-3xl font-[1000] text-slate-800 tracking-tighter mb-4 uppercase">
                            Service <span className="text-primary">Unavailable</span>
                        </h3>
                        <p className="text-slate-500 font-bold text-sm max-w-[280px] mb-8 leading-relaxed">
                            {settings?.appName || 'Our service'} is not available in your area yet. We're expanding fast!
                        </p>
                        <button 
                            onClick={fetchData}
                            className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-black/10"
                        >
                            Try Refreshing
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Sidebar */}
                        <aside className="w-[84px] border-r border-slate-100 flex flex-col bg-white overflow-y-auto hide-scrollbar sticky top-[60px] h-[calc(100vh-60px)] pb-32 flex-shrink-0 select-none">
                            {subCategories.map((cat) => {
                                const isSelected = selectedSubCategory === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedSubCategory(cat.id)}
                                        className={cn(
                                            "relative flex flex-col items-center py-3 px-1 gap-1.5 transition-all duration-200 group cursor-pointer border-r-2",
                                            isSelected
                                                ? "bg-emerald-50/60 border-primary"
                                                : "border-transparent hover:bg-gray-50/80"
                                        )}
                                    >
                                        {/* Active Indicator Bar */}
                                        {isSelected && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-xs" />
                                        )}

                                        {/* Subcategory Image Container */}
                                        <div className={cn(
                                            "w-[48px] h-[48px] rounded-xl flex items-center justify-center p-0.5 overflow-hidden transition-all duration-200 shadow-xs",
                                            isSelected
                                                ? "bg-white border-2 border-primary scale-105 shadow-sm ring-2 ring-primary/10"
                                                : "bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:border-slate-200"
                                        )}>
                                            {cat.isAll ? (
                                                <div className="w-full h-full rounded-[10px] bg-emerald-600 text-white flex items-center justify-center font-black text-xs uppercase tracking-wider shadow-inner">
                                                    ALL
                                                </div>
                                            ) : (
                                                <img
                                                    src={applyCloudinaryTransform(cat.icon)}
                                                    alt={cat.name}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover rounded-[10px]"
                                                />
                                            )}
                                        </div>

                                        {/* Subcategory Label */}
                                        <span className={cn(
                                            "text-[10.5px] text-center font-semibold leading-[1.25] max-w-[76px] px-0.5 transition-colors line-clamp-2 break-words",
                                            isSelected ? "text-primary font-bold" : "text-slate-600 group-hover:text-slate-900"
                                        )}>
                                            {cat.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </aside>

                        {/* Content */}
                        <main className="flex-1 p-2 pb-24 bg-white space-y-4 overflow-x-hidden">
                            <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                                {filteredProducts.map((product) => (
                                    <ProductCard key={product.id} product={product} compact={true} />
                                ))}
                            </div>
                        </main>
                    </>
                )}
            </div>

            <MiniCart />
            <ProductDetailSheet />

            <style dangerouslySetInnerHTML={{
                __html: `
                    .hide-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .hide-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}} />
        </div>
    );
};

export default CategoryProductsPage;

