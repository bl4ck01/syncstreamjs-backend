import { useState, useCallback, useRef } from 'react';

export function useVirtualScroll(itemCount, itemHeight = 200, overscan = 5) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const containerRef = useRef();

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const clientHeight = containerRef.current.clientHeight;

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(itemCount, Math.ceil((scrollTop + clientHeight) / itemHeight) + overscan);

    setVisibleRange({ start, end });
  }, [itemCount, itemHeight, overscan]);

  return { visibleRange, containerRef, handleScroll };
}