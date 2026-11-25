import { useEffect, useState } from 'react';
import { getSettings } from './storage';

/** Current settings, re-rendering whenever they change anywhere in the app. */
export function useSettings() {
  const [s, setS] = useState(getSettings);
  useEffect(() => {
    const f = () => setS(getSettings());
    window.addEventListener('cc-settings', f);
    return () => window.removeEventListener('cc-settings', f);
  }, []);
  return s;
}

export const ANIM_MS = { fast: 150, normal: 280, relaxed: 420 } as const;
