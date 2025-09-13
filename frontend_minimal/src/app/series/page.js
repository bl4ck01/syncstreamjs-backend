import IPTVContent from '@/components/IPTVContent.jsx';

export default function SeriesPage() {
  return (
    <IPTVContent 
      streamType="series" 
      pageTitle="TV Shows" 
      pageDescription="Catch up on your favorite TV shows and series"
    />
  );
}

export const metadata = {
  title: "TV Shows - STREAMFLIX",
  description: "Catch up on your favorite TV shows and series. Stream unlimited TV shows.",
};