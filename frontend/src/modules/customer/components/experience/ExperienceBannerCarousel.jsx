import React from "react";
import { cn } from "@/lib/utils";
import { motion, useMotionValue } from "framer-motion";
import {
  applyCloudinaryTransform,
  buildCloudinarySrcSet,
  isCloudinaryUrl,
} from "@/core/utils/imageUtils";

import { isMobileOrWebView } from "@/core/utils/deviceUtils";

const BANNER_CHUNK_SIZE = 20;

const ExperienceBannerCarousel = ({
  section,
  items,
  fullWidth = false,
  slideGap = 0,
  edgeToEdge = false,
}) => {
  if (!items.length) return null;

  const [activeIndex, setActiveIndex] = React.useState(0);
  const [itemsPerView, setItemsPerView] = React.useState(() =>
    fullWidth && typeof window !== "undefined" && window.innerWidth >= 1024 ? 3 : 1
  );
  const [visibleCount, setVisibleCount] = React.useState(() =>
    Math.min(items.length, BANNER_CHUNK_SIZE)
  );
  const visibleItems = items.slice(0, visibleCount);
  const totalItems = visibleItems.length;
  const x = useMotionValue(0);
  const containerRef = React.useRef(null);
  const hasMore = visibleCount < items.length;
  const maxIndex = Math.max(0, totalItems - itemsPerView);

  React.useEffect(() => {
    const updateItemsPerView = () => {
      setItemsPerView(fullWidth && window.innerWidth >= 1024 ? 3 : 1);
      setActiveIndex(0);
    };
    updateItemsPerView();
    window.addEventListener("resize", updateItemsPerView);
    return () => window.removeEventListener("resize", updateItemsPerView);
  }, [fullWidth]);

  const loadMore = React.useCallback(() => {
    setVisibleCount((prev) => Math.min(items.length, prev + BANNER_CHUNK_SIZE));
  }, [items.length]);

  React.useEffect(() => {
    setVisibleCount(Math.min(items.length, BANNER_CHUNK_SIZE));
    setActiveIndex(0);
  }, [items.length]);

  // Auto-play logic
  React.useEffect(() => {
    if (totalItems <= itemsPerView) return;

    const intervalId = setInterval(() => {
      setActiveIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 4500);

    return () => clearInterval(intervalId);
  }, [totalItems, itemsPerView, maxIndex]);

  React.useEffect(() => {
    if (!hasMore) return;
    if (activeIndex >= totalItems - itemsPerView - 2) {
      loadMore();
    }
  }, [activeIndex, totalItems, hasMore, loadMore]);

  const handleDragEnd = (_, info) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      // Swipe left -> Next
      setActiveIndex((prev) => Math.min(prev + 1, maxIndex));
    } else if (info.offset.x > threshold) {
      // Swipe right -> Prev
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  const getBannerOptimizedSrc = React.useCallback((url) => {
    if (!url) return url;
    if (!isCloudinaryUrl(url)) return url;
    return applyCloudinaryTransform(url, "f_auto,q_auto,c_scale,w_824");
  }, []);

  return (
    <div
      className={cn(
        "overflow-hidden touch-pan-y relative select-none",
        fullWidth &&
          "customer-experience-banner-viewport w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]"
      )}
    >
      <motion.div
        ref={containerRef}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={{ x: `-${(activeIndex / totalItems) * 100}%` }}
        transition={
          isMobileOrWebView()
            ? { type: "tween", ease: "easeInOut", duration: 0.3 }
            : { type: "spring", stiffness: 300, damping: 30 }
        }
        className="flex"
        style={{ width: `${(totalItems / itemsPerView) * 100}%` }}
      >
        {visibleItems.map((banner, idx) => (
          <div
            key={idx}
            className={cn(
              "relative shrink-0 overflow-hidden flex items-center justify-center box-border",
              fullWidth
                ? "customer-experience-banner-slide h-[152px] bg-transparent sm:h-[196px] lg:h-[240px] rounded-none px-0"
                : "aspect-[21/9] sm:aspect-[24/9] md:aspect-[28/9] bg-transparent px-1 py-1"
            )}
            style={{ width: `${100 / totalItems}%` }}
          >
            {fullWidth ? (
              <img
                src={getBannerOptimizedSrc(banner.imageUrl)}
                srcSet={
                  isCloudinaryUrl(banner.imageUrl)
                    ? buildCloudinarySrcSet(
                        banner.imageUrl,
                        [{ w: 412 }, { w: 824 }, { w: 1248 }],
                        "f_auto,q_auto,c_scale"
                      )
                    : undefined
                }
                sizes="100vw"
                alt={banner.title || section?.title || "Banner"}
                className="absolute inset-0 h-full w-full object-contain object-center pointer-events-none"
                loading={idx === 0 ? "eager" : "lazy"}
                fetchPriority={idx === 0 ? "high" : "low"}
                decoding="async"
              />
            ) : (
              <div className="h-full w-full max-w-[1200px] overflow-hidden rounded-3xl bg-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.06)] border border-slate-200/60">
                <img
                  src={getBannerOptimizedSrc(banner.imageUrl)}
                  srcSet={
                    isCloudinaryUrl(banner.imageUrl)
                      ? buildCloudinarySrcSet(
                          banner.imageUrl,
                          [{ w: 600 }, { w: 1200 }],
                          "f_auto,q_auto,c_scale"
                        )
                      : undefined
                  }
                  sizes="(max-width: 768px) 100vw, 1200px"
                  alt={banner.title || section?.title || "Banner"}
                  className="w-full h-full object-cover object-center pointer-events-none transition-transform duration-300 hover:scale-[1.02]"
                  loading={idx === 0 ? "eager" : "lazy"}
                  fetchPriority={idx === 0 ? "high" : "low"}
                  decoding="async"
                />
              </div>
            )}
          </div>
        ))}
      </motion.div>

      {/* Pagination indicators for non-fullWidth multi-item banners */}
      {!fullWidth && totalItems > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-3">
          {Array.from({ length: totalItems }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                activeIndex === i
                  ? "w-6 bg-emerald-600 shadow-sm"
                  : "w-1.5 bg-slate-300 hover:bg-slate-400"
              )}
              aria-label={`Go to banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ExperienceBannerCarousel;
