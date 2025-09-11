import { getCurrentProfile } from '@/server/actions';
import { redirect } from 'next/navigation';
import SeriesPage from '@/pages/series-page';

export default async function SeriesPageRoute() {
  const currentProfile = await getCurrentProfile();
  
  if (!currentProfile?.success || !currentProfile?.data) {
    redirect('/profiles');
  }

  return <SeriesPage profile={currentProfile.data} />;
}