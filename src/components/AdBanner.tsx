import React from 'react';
import { monetization } from '@/config/monetization';

export default function AdBanner({ slot }: { slot: 'leaderboard' | 'sidebar' | 'interstitial' }) {
  const isEnabled = monetization.adSlots[slot];
  if (!isEnabled) return null;
  // Simple placeholder banner – in production replace with real ad script.
  const styleMap: Record<string, React.CSSProperties> = {
    leaderboard: { width: '728px', height: '90px', background: '#e5e7eb', margin: '0 auto' },
    sidebar: { width: '300px', height: '250px', background: '#e5e7eb', margin: '0 auto' },
    interstitial: { width: '100%', height: '150px', background: '#e5e7eb', margin: '1rem 0' },
  };
  return (
    <div style={styleMap[slot]} className="flex items-center justify-center text-gray-700">
      {slot.toUpperCase()} AD (placeholder – replace with <code>{monetization.adsenseId}</code>)
    </div>
  );
}
