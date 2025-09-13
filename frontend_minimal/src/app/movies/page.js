import IPTVContent from '@/components/IPTVContent.jsx';

export default function MoviesPage() {
  return (
    <IPTVContent 
      streamType="vod" 
      pageTitle="Movies" 
      pageDescription="Browse our extensive collection of movies"
    />
  );
}

export const metadata = {
  title: "Movies - STREAMFLIX",
  description: "Browse our extensive collection of movies. Stream unlimited movies.",
};