import HeroSection from '@/components/ui/hero-section.jsx';
import ContentRow from '@/components/ui/content-row.jsx';

export default function HomePage() {
  // Mock data for demonstration
  const featuredContent = {
    name: 'Young Sheldon',
    plot: 'Brilliant yet awkward 9-year-old Sheldon Cooper lands in high school where his smarts leave everyone stumped in this "The Big Bang Theory" spin-off.',
    rating: 'TV-PG',
    genre: 'Comedy'
  };

  const trending = [
    { stream_id: 1, name: 'Stranger Things', plot: 'A group of kids uncover supernatural mysteries in their small town.' },
    { stream_id: 2, name: 'The Crown', plot: 'The reign of Queen Elizabeth II is dramatized in this lavish series.' },
    { stream_id: 3, name: 'Bridgerton', plot: 'Romance and drama unfold in Regency-era London high society.' },
    { stream_id: 4, name: 'Wednesday', plot: 'Wednesday Addams navigates her years as a student at Nevermore Academy.' },
    { stream_id: 5, name: 'Money Heist', plot: 'A criminal mastermind manipulates hostages and police in a grand heist.' },
    { stream_id: 6, name: 'Squid Game', plot: 'Desperate contestants play deadly childhood games for a massive cash prize.' },
  ];

  const newReleases = [
    { stream_id: 7, name: 'Glass Onion', plot: 'Detective Benoit Blanc solves a new mystery in Greece.' },
    { stream_id: 8, name: 'All Quiet on the Western Front', plot: 'A young German soldier faces the horrors of World War I.' },
    { stream_id: 9, name: 'The Gray Man', plot: 'A CIA operative becomes the target of an international manhunt.' },
    { stream_id: 10, name: 'Red Notice', plot: 'An FBI agent pursues two rival criminals across the globe.' },
  ];

  const popular = [
    { stream_id: 11, name: 'Ozark', plot: 'A financial advisor launders money for a Mexican cartel.' },
    { stream_id: 12, name: 'The Witcher', plot: 'Geralt of Rivia, a monster hunter, searches for his destiny.' },
    { stream_id: 13, name: 'House of Cards', plot: 'A ruthless politician will stop at nothing to gain power.' },
    { stream_id: 14, name: 'Black Mirror', plot: 'Anthology series exploring dark aspects of modern technology.' },
  ];

  return (
    <div className="bg-black text-white">
      {/* Hero Section */}
      <HeroSection featuredContent={featuredContent} />

      {/* Content Rows */}
      <div className="relative z-10 -mt-32">
        <ContentRow title="Trending Now" streams={trending} isLarge={true} />
        <ContentRow title="New Releases" streams={newReleases} />
        <ContentRow title="Popular on Netflix" streams={popular} />
        
        {/* Call to action for IPTV */}
        <div className="px-4 md:px-16 py-12">
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Experience Live TV & More</h2>
            <p className="text-xl mb-6 opacity-90">
              Access thousands of live channels, movies, and series from around the world
            </p>
            <a 
              href="/iptv?type=live" 
              className="bg-white text-red-600 px-8 py-3 rounded font-semibold text-lg hover:bg-gray-100 transition-colors inline-block"
            >
              Start Watching Live TV
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}