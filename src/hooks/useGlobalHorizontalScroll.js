import { useEffect } from "react";

export function useGlobalHorizontalScroll() {
  useEffect(() => {
    const onWheel = (e) => {
      let target = e.target;
      while (target && target !== document.body && target !== document) {
        // We look for horizontal scrolling containers
        const isScrollContainer = target.classList && 
                                (target.classList.contains('scrollbar-hide') || 
                                 target.classList.contains('overflow-x-auto') || 
                                 target.hasAttribute('data-tabbar'));
                                 
        if (isScrollContainer) {
          const isScrollable = target.scrollWidth > target.clientWidth;
          // Note: some tables might be overflow-x-auto but we want to allow vertical scroll if it has overflow-y-auto.
          // But usually we just want to hijack the wheel for horizontal scrolling ONLY IF vertical scroll isn't needed.
          // For simplicity, we apply horizontal wheel scroll if shiftKey is not pressed, but wait!
          // Actually, if it's a tab bar (usually limited height), it has no vertical scroll.
          // If it's a table, it has both. We should only hijack if it's a narrow row (like clientHeight < 100) or if we explicitly check.
          
          if (isScrollable && target.clientHeight < 150) { // Height threshold to avoid taking over large tables
            const maxScrollLeft = target.scrollWidth - target.clientWidth;
            if ((e.deltaY > 0 && target.scrollLeft < maxScrollLeft) || (e.deltaY < 0 && target.scrollLeft > 0)) {
              e.preventDefault();
              target.scrollLeft += e.deltaY;
              return;
            }
          }
        }
        target = target.parentNode;
      }
    };

    let isDown = false;
    let startX;
    let scrollLeft;
    let activeContainer = null;
    let dragThresholdMet = false;

    const onMouseDown = (e) => {
      let target = e.target;
      while (target && target !== document.body && target !== document) {
        const isScrollContainer = target.classList && 
                                (target.classList.contains('scrollbar-hide') || 
                                 target.classList.contains('overflow-x-auto') || 
                                 target.hasAttribute('data-tabbar'));
                                 
        if (isScrollContainer && target.scrollWidth > target.clientWidth && target.clientHeight < 150) {
          isDown = true;
          dragThresholdMet = false;
          activeContainer = target;
          startX = e.pageX - target.offsetLeft;
          scrollLeft = target.scrollLeft;
          return;
        }
        target = target.parentNode;
      }
    };

    const onMouseLeave = () => {
      if (activeContainer) {
        activeContainer.style.cursor = "";
      }
      isDown = false;
      activeContainer = null;
    };

    const onMouseUp = (e) => {
      if (activeContainer) {
        activeContainer.style.cursor = "";
        // If we dragged, we should stop clicks from triggering? 
        // A simple way is to capture click events, but that's tricky.
      }
      isDown = false;
      activeContainer = null;
    };

    const onMouseMove = (e) => {
      if (!isDown || !activeContainer) return;
      const x = e.pageX - activeContainer.offsetLeft;
      const walk = (x - startX) * 1.5;
      
      if (Math.abs(walk) > 5) {
        dragThresholdMet = true;
      }

      if (dragThresholdMet) {
        e.preventDefault(); // Prevent text selection
        activeContainer.style.cursor = "grabbing";
        activeContainer.scrollLeft = scrollLeft - walk;
      }
    };

    // Use capture phase for some events if needed, but bubble is fine.
    document.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);

    return () => {
      document.removeEventListener("wheel", onWheel);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, []);
}
