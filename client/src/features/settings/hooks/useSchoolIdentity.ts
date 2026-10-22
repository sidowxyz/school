import { useEffect, useState } from 'react';
import { settingsApi } from '../api/settingsApi';

const STORAGE_KEY = 'school_identity';
const UPDATE_EVENT = 'school-identity-updated';

export interface SchoolIdentity {
  schoolName: string;
  logoUrl: string;
}

const fallback: SchoolIdentity = { schoolName: 'Sobet School', logoUrl: '/logo.png' };

function readCached(): SchoolIdentity {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
  } catch {
    return fallback;
  }
}

export function publishSchoolIdentity(patch: Partial<SchoolIdentity>) {
  const next = { ...readCached(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent<SchoolIdentity>(UPDATE_EVENT, { detail: next }));
}

export function resolveSchoolLogo(url: string) {
  return url;
}

export function useSchoolIdentity() {
  const [identity, setIdentity] = useState<SchoolIdentity>(readCached);

  useEffect(() => {
    const handleUpdate = (event: Event) => setIdentity((event as CustomEvent<SchoolIdentity>).detail);
    window.addEventListener(UPDATE_EVENT, handleUpdate);
    settingsApi.getSystemSettings().then((settings) => {
      const next = { schoolName: settings.schoolName || fallback.schoolName, logoUrl: settings.logoUrl || fallback.logoUrl };
      publishSchoolIdentity(next);
      setIdentity(next);
    }).catch(() => undefined);
    return () => window.removeEventListener(UPDATE_EVENT, handleUpdate);
  }, []);

  return { ...identity, logoSrc: resolveSchoolLogo(identity.logoUrl) };
}
