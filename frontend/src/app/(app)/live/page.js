import { getCurrentProfile } from '@/server/actions';
import { redirect } from 'next/navigation';
import LiveChannelsPage from '@/pages/live-channels-page';

export default async function LivePage() {
  const currentProfile = await getCurrentProfile();
  
  if (!currentProfile?.success || !currentProfile?.data) {
    redirect('/profiles');
  }

  return <LiveChannelsPage profile={currentProfile.data} />;
}