import { debounce } from '@/lib/utils';
import { useEffect, useRef } from 'react';

export function useIntersectionLoad({
  onVisible,
  enabled = true,
  threshold = 0.1,
  rootMargin = '100px', // Trigger EARLIER on slow devices
}) {
  const ref = useRef();
  const debouncedOnVisible = useRef(debounce(onVisible, 100)).current;

  useEffect(() => {
    if (!enabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          debouncedOnVisible();
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) observer.observe(ref.current);

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [enabled, debouncedOnVisible, threshold, rootMargin]);

  return ref;
}