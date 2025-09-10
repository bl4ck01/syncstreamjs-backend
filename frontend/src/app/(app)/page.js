import { getCurrentProfile } from '@/server/actions';
import { redirect } from 'next/navigation';
import NetflixHomePage from '@/components/netflix-home-page';

export default async function Home() {
  const currentProfile = await getCurrentProfile();
  
  if (!currentProfile?.success || !currentProfile?.data) {
    redirect('/profiles');
  }

  return <NetflixHomePage profile={currentProfile.data} />;
}