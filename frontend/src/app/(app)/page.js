import { getCurrentProfile } from '@/server/actions';
import Image from 'next/image';
import React from 'react';
import { redirect } from 'next/navigation';
import CategoryHomeLayout from '@/components/category-home-layout';

export default async function Home() {
  console.log('[BROWSER STORAGE DEBUG] 🏠 Home page component loading...');
  const currentProfile = await getCurrentProfile();
  console.log('[BROWSER STORAGE DEBUG] 👤 Current profile loaded:', currentProfile);
  console.log(currentProfile);
  
  if (!currentProfile?.success || !currentProfile?.data) {
    redirect('/profiles');
  }

  return (
    <div className='h-screen flex overflow-hidden bg-neutral-950'>
      {/* Left Sidebar - Profile Avatar */}
      <div className='w-14 flex flex-col border-r border-neutral-800 bg-neutral-900'>
        <div className='w-full h-14 flex items-center justify-center p-2'>
          <div className='w-10 h-10 rounded-full overflow-hidden border-2 border-neutral-700'>
            <Image 
              src={currentProfile.data.avatar_url || '/avatars/default-avatar.jpeg'} 
              alt={currentProfile.data.name || 'Profile'} 
              width={40} 
              height={40}
              className='w-full h-full object-cover'
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className='flex-1 overflow-hidden'>
        <CategoryHomeLayout />
      </div>
    </div>
  );
}