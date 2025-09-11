export function UILoading({ size = 'md' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 ${sizeClasses[size]}`}></div>
    </div>
  );
}

export function UIError({ error, retry }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 text-center">
      <div className="text-red-500 mb-2">⚠️ Error</div>
      <div className="text-gray-600 mb-4">{error}</div>
      {retry && (
        <button
          onClick={retry}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function UISkeleton({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 rounded-lg h-48 mb-2"></div>
          <div className="bg-gray-200 rounded h-4 w-3/4"></div>
        </div>
      ))}
    </>
  );
}