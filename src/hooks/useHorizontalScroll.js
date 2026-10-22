import { useRef, useEffect } from "react";

export function useHorizontalScroll() {
  const elRef = useRef();

  useEffect(() => {
    const el = elRef.current;
    if (el) {
      const onWheel = e => {
        if (e.deltaY === 0) return;
        
        // Check if we can scroll in the desired direction
        const maxScrollLeft = el.scrollWidth - el.clientWidth;
        if (
          (e.deltaY > 0 && el.scrollLeft < maxScrollLeft) ||
          (e.deltaY < 0 && el.scrollLeft > 0)
        ) {
          e.preventDefault();
          el.scrollTo({
            left: el.scrollLeft + e.deltaY,
            behavior: "auto"
          });
        }
      };
      
      let isDown = false;
      let startX;
      let scrollLeft;

      const onMouseDown = (e) => {
        isDown = true;
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
        el.style.cursor = "grabbing";
        el.style.userSelect = "none";
      };

      const onMouseLeave = () => {
        isDown = false;
        el.style.cursor = "";
        el.style.userSelect = "";
      };

      const onMouseUp = () => {
        isDown = false;
        el.style.cursor = "";
        el.style.userSelect = "";
      };

      const onMouseMove = (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startX) * 1.5; // Scroll speed
        el.scrollLeft = scrollLeft - walk;
      };

      el.addEventListener("wheel", onWheel, { passive: false });
      el.addEventListener("mousedown", onMouseDown);
      el.addEventListener("mouseleave", onMouseLeave);
      el.addEventListener("mouseup", onMouseUp);
      el.addEventListener("mousemove", onMouseMove);

      return () => {
        el.removeEventListener("wheel", onWheel);
        el.removeEventListener("mousedown", onMouseDown);
        el.removeEventListener("mouseleave", onMouseLeave);
        el.removeEventListener("mouseup", onMouseUp);
        el.removeEventListener("mousemove", onMouseMove);
      };
    }
  }, []);

  return elRef;
}
