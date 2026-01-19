import { useCallback, useEffect, useRef, useState } from "react";

interface UseScrollSentinelOptions {
  threshold?: number;
  rootMargin?: string;
  isStreaming?: boolean;
}

export function useScrollSentinel(options: UseScrollSentinelOptions = {}) {
  const {
    threshold = 0.1,
    rootMargin = "100px",
    isStreaming = false,
  } = options;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userScrolledAway, setUserScrolledAway] = useState(false);
  const lastScrollTopRef = useRef(0);
  const [refsReady, setRefsReady] = useState(0);

  // Re-run effect when refs become available
  useEffect(() => {
    const checkRefs = () => {
      if (sentinelRef.current && containerRef.current) {
        setRefsReady((n) => n + 1);
      }
    };
    // Check after a short delay to allow React to populate refs
    const timer = setTimeout(checkRefs, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const atBottom = entry.isIntersecting;
        setIsAtBottom(atBottom);
        if (atBottom) {
          setUserScrolledAway(false);
        }
      },
      { root: container, threshold, rootMargin },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [threshold, rootMargin, refsReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isStreaming) return;

    function handleScroll() {
      const currentScrollTop = container!.scrollTop;
      const scrolledUp = currentScrollTop < lastScrollTopRef.current - 10;
      lastScrollTopRef.current = currentScrollTop;

      if (scrolledUp) {
        setUserScrolledAway(true);
      }
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      setUserScrolledAway(false);
    }
  }, [isStreaming]);

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
    setUserScrolledAway(false);
  }, []);

  return {
    sentinelRef,
    containerRef,
    isAtBottom,
    scrollToBottom,
    userScrolledAway,
  };
}
