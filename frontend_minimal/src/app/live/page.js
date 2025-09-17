import IPTVContent from '@/components/IPTVContent.jsx';

export default function LivePage() {
  return (
    <IPTVContent
      streamType="live"
    />
  );
}

export const metadata = {
  title: "Live TV - STREAMFLIX",
  description: "Watch live television channels from around the world. Stream unlimited live TV.",
};