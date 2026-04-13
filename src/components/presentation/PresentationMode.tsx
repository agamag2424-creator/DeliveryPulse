"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface PresentationModeProps {
  slides: React.ReactNode[];
  slideTitles: string[];
  onExit: () => void;
}

export function PresentationMode({ slides, slideTitles, onExit }: PresentationModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showChrome, setShowChrome] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalSlides = slides.length;

  const resetChromeTimer = useCallback(() => {
    setShowChrome(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowChrome(false), 3000);
  }, []);

  const moveTo = useCallback(
    (next: number) => {
      const bounded = Math.max(0, Math.min(totalSlides - 1, next));
      if (bounded === currentIndex || isTransitioning) return;
      setIsTransitioning(true);
      window.setTimeout(() => {
        setCurrentIndex(bounded);
        setIsTransitioning(false);
      }, 200);
    },
    [currentIndex, isTransitioning, totalSlides],
  );

  const nextSlide = useCallback(() => moveTo(currentIndex + 1), [currentIndex, moveTo]);
  const prevSlide = useCallback(() => moveTo(currentIndex - 1), [currentIndex, moveTo]);

  useEffect(() => {
    hideTimerRef.current = setTimeout(() => setShowChrome(false), 3000);
    const node = containerRef.current;
    if (node?.requestFullscreen) node.requestFullscreen().catch(() => {});

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    };
  }, [resetChromeTimer]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        nextSlide();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        prevSlide();
      } else if (event.key === "Escape") {
        event.preventDefault();
        onExit();
      }
      resetChromeTimer();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nextSlide, onExit, prevSlide, resetChromeTimer]);

  const activeSlide = useMemo(() => slides[currentIndex], [slides, currentIndex]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black"
      onMouseMove={resetChromeTimer}
      onClick={resetChromeTimer}
      onTouchStart={(event) => {
        resetChromeTimer();
        touchStartXRef.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const startX = touchStartXRef.current;
        const endX = event.changedTouches[0]?.clientX ?? null;
        touchStartXRef.current = null;
        if (startX === null || endX === null) return;
        const delta = endX - startX;
        if (delta <= -40) nextSlide();
        if (delta >= 40) prevSlide();
      }}
    >
      <button
        type="button"
        onClick={onExit}
        className="absolute right-4 top-4 z-50 rounded bg-black/50 px-3 py-1 text-sm text-white"
      >
        ✕
      </button>

      <button
        type="button"
        aria-label="Previous slide"
        onClick={prevSlide}
        className="absolute left-0 top-0 z-40 h-full w-[30%] cursor-w-resize bg-transparent"
      />
      <button
        type="button"
        aria-label="Next slide"
        onClick={nextSlide}
        className="absolute right-0 top-0 z-40 h-full w-[30%] cursor-e-resize bg-transparent"
      />

      <div
        className={`mx-auto flex h-full w-full max-w-[1440px] items-center justify-center px-4 transition-opacity duration-200 ${
          isTransitioning ? "opacity-0" : "opacity-100"
        }`}
      >
        {activeSlide}
      </div>

      <div
        className={`absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-black/55 px-4 py-3 transition-opacity duration-300 ${
          showChrome ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="mb-2 flex items-center justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={`dot-${index}`}
              type="button"
              onClick={() => moveTo(index)}
              className={`h-2.5 w-2.5 rounded-full ${index === currentIndex ? "bg-white" : "bg-gray-500"}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        <p className="text-center text-xs text-gray-200">
          {currentIndex + 1} / {totalSlides} - {slideTitles[currentIndex] ?? `Slide ${currentIndex + 1}`}
        </p>
      </div>
    </div>
  );
}
