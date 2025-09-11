import { getCurrentProfile } from '@/server/actions';
import { redirect } from 'next/navigation';
import NetflixHeader from '@/components/netflix-header';

export default async function AppLayout({ children }) {
  const currentProfile = await getCurrentProfile();
  
  if (!currentProfile?.success || !currentProfile?.data) {
    redirect('/profiles');
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Fixed Header - never shows skeleton */}
      <NetflixHeader 
        profile={currentProfile.data}
      />
      
      {/* Main content area with padding for fixed header */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}