import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";

const QuickCategorySlider = ({ categories, onCategoryClick }) => {
  const scrollRef = useRef(null);
  const scroll = (direction) => scrollRef.current?.scrollBy({ left: direction === "left" ? -280 : 280, behavior: "smooth" });

  if (!categories?.length) return null;

  return (
    <section className="customer-quick-categories w-full mb-5 relative" aria-label="Shop by category">
      <div className="flex items-center justify-between px-4 md:px-8 lg:px-[50px] mb-3 md:hidden">
        <div>
          <p className="hidden md:block text-xs font-bold uppercase tracking-[0.16em] text-primary mb-1">Find your everyday</p>
          <h2 className="text-[17px] md:text-2xl font-extrabold tracking-tight text-[#17231a]">Shop by category</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => scroll("left")} aria-label="Scroll categories left" className="hidden md:grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700"><ChevronLeft size={18} /></button>
          <button onClick={() => scroll("right")} aria-label="Scroll categories right" className="hidden md:grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700"><ChevronRight size={18} /></button>
          <button onClick={() => onCategoryClick("all")} className="flex items-center gap-1 text-xs font-bold text-primary md:hidden">See all <ArrowRight size={14} /></button>
        </div>
      </div>
      <div ref={scrollRef} className="flex items-start gap-4 overflow-x-auto no-scrollbar px-4 pb-2 snap-x scroll-smooth md:hidden">
        {categories.map((cat) => (
          <motion.button key={cat.id} type="button" onClick={() => onCategoryClick(cat.id)} whileTap={{ scale: 0.96 }} className="group flex w-[68px] shrink-0 snap-start flex-col items-center gap-2 text-center md:w-[88px]">
            <span className="customer-quick-category-image relative grid h-[64px] w-[64px] place-items-center overflow-hidden rounded-full border border-[#e8eee8] bg-white p-1 shadow-[0_2px_8px_rgba(20,45,28,.06)] transition group-hover:border-primary/40 md:h-[82px] md:w-[82px]">
              <span className="customer-category-image-fallback" aria-hidden="true">{cat.name?.trim()?.charAt(0)?.toUpperCase() || "•"}</span>
              <img src={applyCloudinaryTransform(cat.image, "f_auto,q_auto,w_200")} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} className="relative z-[1] h-full w-full rounded-full object-cover" />
            </span>
            <span className="w-full text-[11px] font-semibold leading-tight text-slate-700 line-clamp-2 md:text-sm">{cat.name}</span>
          </motion.button>
        ))}
      </div>
      <div className="hidden md:block w-full -mt-[24px] md:mt-3 overflow-hidden relative z-20">
        <DesktopQuickCategories categories={categories} onCategoryClick={onCategoryClick} />
      </div>
    </section>
  );
};

function DesktopQuickCategories({ categories, onCategoryClick }) {
  const scrollRef = useRef(null);
  const scroll = (direction) => scrollRef.current?.scrollBy({ left: direction === "left" ? -300 : 300, behavior: "smooth" });

  return (
    <div className="customer-desktop-category-strip mx-auto max-w-[1400px] px-8 xl:px-12">
      <div className="mb-5 flex items-end justify-between">
        <div><p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">Start with what you need</p><h2 className="text-2xl font-extrabold tracking-tight text-[#183321]">Shop by category</h2></div>
        <div className="flex gap-2">
          <button onClick={() => scroll("left")} aria-label="Scroll categories left" className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-primary/40 hover:text-primary"><ChevronLeft size={19} /></button>
          <button onClick={() => scroll("right")} aria-label="Scroll categories right" className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-primary/40 hover:text-primary"><ChevronRight size={19} /></button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-3 no-scrollbar snap-x scroll-smooth">
        {categories.map((cat) => <button key={cat.id} type="button" onClick={() => onCategoryClick(cat.id)} className="group flex w-[104px] shrink-0 snap-start flex-col items-center gap-3 text-center">
          <span className="customer-quick-category-image relative grid h-[88px] w-[88px] place-items-center overflow-hidden rounded-full border border-[#e3eae0] bg-white p-1 shadow-[0_3px_10px_rgba(24,51,33,.06)] transition duration-200 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-md">
            <span className="customer-category-image-fallback" aria-hidden="true">{cat.name?.trim()?.charAt(0)?.toUpperCase() || "•"}</span>
            <img src={applyCloudinaryTransform(cat.image, "f_auto,q_auto,w_200")} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} className="relative z-[1] h-full w-full rounded-full object-cover" />
          </span>
          <span className="max-w-full text-sm font-semibold leading-tight text-slate-700 group-hover:text-primary line-clamp-2">{cat.name}</span>
        </button>)}
      </div>
    </div>
  );
}

export default React.memo(QuickCategorySlider);
