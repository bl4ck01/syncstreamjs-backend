'use client';

import { useVirtualStreams } from '../../lib/hooks/useVirtualData.js';

export default function StreamList({ categoryId }) {
  const { streams, virtualizer, parentRef, isLoading, error } = useVirtualStreams(categoryId);

  if (isLoading) return <div className="p-4">Loading streams...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;

  return (
    <div>
      <h3 className="text-lg font-bold mb-2">Streams</h3>
      <div ref={parentRef} className="h-96 overflow-auto border rounded">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const stream = streams[virtualItem.index];
            if (!stream) return null;

            return (
              <div
                key={virtualItem.key}
                ref={virtualItem.measureRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="p-3 border-b bg-white hover:bg-gray-50"
              >
                <strong>{stream.name}</strong>
                <div className="text-sm text-gray-500">Stream ID: {stream.stream_id}</div>
                {stream.plot && <div className="text-xs mt-1 line-clamp-2">{stream.plot}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}