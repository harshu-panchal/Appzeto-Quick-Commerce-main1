import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { QUICK_CATEGORY_PALETTES } from "../../constants/homeConstants";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import QuickCategoriesBg from "@/assets/Catagorysection_bg.png";

const QuickCategorySlider = ({ categories, onCategoryClick }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!categories || categories.length === 0) return null;

  return (
    <div className="w-full mb-5 -mt-[24px] md:mt-3 overflow-hidden relative group z-20">
      <div
        className="relative overflow-hidden bg-white shadow-[0_14px_28px_rgba(15,23,42,0.09)]"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.65) 100%), url(${QuickCategoriesBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}>
        <div className="absolute inset-0 bg-white/10 pointer-events-none" />

        <div className="relative z-10 px-4 pt-2.5 pb-0.5 md:px-8 md:pt-4">
          <h2 className="text-center text-[17px] md:text-[20px] font-bold tracking-tight text-[#132018] leading-none">
            Quick categories
          </h2>
        </div>

        {/* Left Scroll Button */}
        <div className="absolute left-4 lg:left-10 top-[58%] -translate-y-1/2 z-20 hidden md:flex">
          <button
            onClick={() => scroll("left")}
            className="h-10 w-10 bg-white/90 backdrop-blur-md shadow-xl rounded-full flex items-center justify-center border border-gray-100 cursor-pointer hover:bg-white text-primary transition-all active:scale-90">
            <ChevronLeft size={22} strokeWidth={3} />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="relative z-10 flex items-start gap-2 md:gap-3 lg:gap-4 overflow-x-auto no-scrollbar px-4 pb-2 pt-1 md:px-8 md:pb-4 snap-x scroll-smooth">
          {categories.map((cat, idx) => {
            const palette = QUICK_CATEGORY_PALETTES[idx % QUICK_CATEGORY_PALETTES.length];
            return (
              <div
                key={cat.id}
                onClick={() => onCategoryClick(cat.id)}
                className="flex flex-col items-center gap-0.5 min-w-[74px] md:min-w-[104px] lg:min-w-[120px] cursor-pointer group/item snap-start transition-transform active:scale-95">
                <div
                  className="relative w-[76px] h-[88px] md:w-[104px] md:h-[118px] lg:w-[120px] lg:h-[134px] rounded-[18px] md:rounded-[22px] shadow-[0_8px_18px_rgba(15,23,42,0.10)] border flex flex-col items-center justify-between p-1.5 md:p-2 transition-all duration-300 group-hover/item:-translate-y-1 group-hover/item:shadow-[0_16px_30px_rgba(15,23,42,0.14)] overflow-hidden smooth-transform"
                  style={{
                    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.6) 24%, rgba(255,255,255,0.15) 100%), linear-gradient(135deg, ${palette.bgFrom}, ${palette.bgVia}, ${palette.bgTo})`,
                    borderColor: palette.frameColor,
                  }}>
                  <div
                    className="absolute inset-0 opacity-40 pointer-events-none"
                    style={{ backgroundColor: palette.glowColor }}
                  />
                  <div className="relative z-10 w-full h-[52px] md:h-[72px] lg:h-[84px] rounded-xl md:rounded-[16px] overflow-hidden flex items-center justify-center bg-white/40 border border-white/60 shadow-xs">
                    <img
                      src={applyCloudinaryTransform(cat.image, "f_auto,q_auto,w_200")}
                      alt={cat.name}
                      loading="lazy"
                      className="w-full h-full object-cover object-center group-hover/item:scale-108 transition-transform duration-500"
                    />
                  </div>
                  <div className="relative z-20 w-full text-center px-0.5 pt-1 pb-0.5">
                    <span className="block text-[9.5px] md:text-[10.5px] lg:text-[11.5px] font-bold text-[#1f2b20] leading-tight whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] group-hover/item:text-primary transition-colors">
                      {cat.name}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Scroll Button */}
        <div className="absolute right-4 lg:right-10 top-[58%] -translate-y-1/2 z-20 hidden md:flex">
          <button
            onClick={() => scroll("right")}
            className="h-10 w-10 bg-white/90 backdrop-blur-md shadow-xl rounded-full flex items-center justify-center border border-gray-100 cursor-pointer hover:bg-white text-primary transition-all active:scale-90">
            <ChevronRight size={22} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(QuickCategorySlider);
