'use client';

import Image from 'next/image';

export default function StreamCard({ stream }) {
  return (
    <div className="p-2 bg-white rounded shadow m-1">
      <div className="relative w-full h-48 bg-gray-200">
        <Image
          src={stream.stream_icon || stream.cover || '/placeholder.jpg'}
          alt={stream.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88enTfwAJYwPNteQx0wAAAABJRU5ErkJggg=="
          onError={(e) => {
            e.target.src = '/placeholder.jpg';
          }}
        />
      </div>
      <h3 className="text-sm font-medium mt-2 line-clamp-2">{stream.name}</h3>
    </div>
  );
}