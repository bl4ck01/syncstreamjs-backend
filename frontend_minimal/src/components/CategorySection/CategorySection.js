'use client';

import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useVirtualScroll } from '@/hooks/useVirtualScroll';
import { useIntersectionLoad } from '@/hooks/useIntersectionLoad';
import { getStreamsByCategory, countStreams, getStreamsByCategoryFallback, countStreamsFallback } from '@/duckdb/queries';
import StreamCard from '@/components/StreamCard/StreamCard';
import { UIError, UILoading } from '@/components/UI';

export default function CategorySection({ category, type }) {
  const [hasMore, setHasMore] = useState(true);
  const { loadedStreams, addLoadedStreams, setError } = useUIStore();
  const streams = loadedStreams[`${type}_${category.category_id}`] || [];
  const loadKey = `${type}_${category.category_id}`;

  const { visibleRange, containerRef, handleScroll } = useVirtualScroll(
    streams.length,
    200, // avg card height
    3    // overscan
  );

  const loadTriggerRef = useIntersectionLoad({
    onVisible: () => loadMoreStreams(),
    enabled: hasMore,
    rootMargin: '200px', // Trigger early
  });

  async function loadMoreStreams() {
    if (!hasMore) return;

    const offset = streams.length;
    try {
      let newStreams;
      try {
        newStreams = await getStreamsByCategory(type, category.category_id, offset);
      } catch (dbError) {
        console.warn('DuckDB query failed, using fallback:', dbError);
        newStreams = await getStreamsByCategoryFallback(type, category.category_id, offset);
      }
      addLoadedStreams(loadKey, newStreams);
      setHasMore(newStreams.length > 0);
    } catch (err) {
      console.error('Failed to load streams:', err);
      setError(loadKey, err.message);
    }
  }

  // Load initial count + first batch
  useEffect(() => {
    if (streams.length > 0) return;

    const init = async () => {
      let total;
      try {
        total = await countStreams(type, category.category_id);
      } catch (countError) {
        console.warn('DuckDB count failed, using fallback:', countError);
        total = await countStreamsFallback(type, category.category_id);
      }
      if (total === 0) return;

      await loadMoreStreams();
    };
    init();
  }, [category.category_id, loadMoreStreams, streams.length, type]);

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">
        {category.category_name} ({streams.length} loaded)
      </h2>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[600px] overflow-y-auto"
      >
        <div style={{ height: `${streams.length * 200}px`, position: 'relative' }}>
          {streams.slice(visibleRange.start, visibleRange.end).map((stream, idx) => (
            <div
              key={stream.stream_id}
              style={{
                position: 'absolute',
                top: `${(visibleRange.start + idx) * 200}px`,
                width: '100%',
              }}
            >
              <StreamCard stream={stream} />
            </div>
          ))}
        </div>
      </div>

      {hasMore && <div ref={loadTriggerRef} className="h-10 flex items-center justify-center">
        <UILoading size="sm" />
      </div>}
    </div>
  );
}