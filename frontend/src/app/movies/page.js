import { getCurrentProfile } from '@/server/actions';
import { redirect } from 'next/navigation';
import MoviesPage from '@/pages/movies-page';

export default async function MoviesPageRoute() {
  const currentProfile = await getCurrentProfile();
  
  if (!currentProfile?.success || !currentProfile?.data) {
    redirect('/profiles');
  }

  return <MoviesPage profile={currentProfile.data} />;
}