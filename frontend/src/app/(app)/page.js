import { getCurrentProfile } from '@/server/actions';
import Image from 'next/image';
import React from 'react'

export default async function Home() {
  const currentProfile = await getCurrentProfile();
  console.log(currentProfile);
  return (
    <div className='h-screen flex overflow-hidden'>
      <div className='w-14 flex flex-col border-r border-gray-800'>
        <div className='w-full h-14 flex items-center justify-center'>
          <Image src={currentProfile.data.avatar_url} alt={currentProfile.data.name} width={56} height={56} />
        </div>


      </div>
    </div>
  )
}