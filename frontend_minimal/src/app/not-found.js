import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-black rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-gray-600 mb-4">Page not found</p>
        <Link 
          href="/" 
          className="bg-white text-black py-2 px-4 rounded hover:bg-gray-200 transition-colors inline-block"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}