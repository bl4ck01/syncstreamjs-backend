import { getCurrentProfile } from '@/server/actions';
import { redirect } from 'next/navigation';
import HomePage from '@/components/home-page-optimized';

export default async function Home() {
  const currentProfile = await getCurrentProfile();
  
  if (!currentProfile?.success || !currentProfile?.data) {
    redirect('/profiles');
  }

  return <HomePage profile={currentProfile.data} />;
}