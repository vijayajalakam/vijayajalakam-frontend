import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Horizontal scrollable row with arrow navigation — Fresha-style
 */
const ScrollRow = ({ children, className = "" }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [children]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 286; // card width (270px) + gap (16px)
    el.scrollBy({ left: direction * cardWidth * 2, behavior: "smooth" });
  };

  return (
    <div className={`relative ${className}`}>
      {/* Left Arrow */}
      {canScrollLeft && (
        <button
          className="fresha-scroll-arrow left"
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Scrollable Row */}
      <div ref={scrollRef} className="fresha-scroll-row">
        {children}
      </div>

      {/* Right Arrow */}
      {canScrollRight && (
        <button
          className="fresha-scroll-arrow right"
          onClick={() => scroll(1)}
          aria-label="Scroll right"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
};

export default ScrollRow;