import { useEffect, useState } from 'react';
import { settingsApi } from '../api/settingsApi';
import { fileBaseURL } from '../../../lib/axios';

const STORAGE_KEY = 'school_identity';
const UPDATE_EVENT = 'school-identity-updated';

export interface SchoolIdentity {
  schoolName: string;
  logoUrl: string;
  schoolEmail?: string | null;
  schoolPhone?: string | null;
}

const fallback: SchoolIdentity = { schoolName: 'School Management', logoUrl: '/logo.png' };

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
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent<SchoolIdentity>(UPDATE_EVENT, { detail: next }));
}

/** Uploaded logos live on the API server, which may be on another domain than the website. */
export function resolveSchoolLogo(url: string) {
  return url.startsWith('/uploads/') ? `${fileBaseURL}${url}` : url;
}

/** The school's name, logo and contact details. Works before sign-in too. */
export function useSchoolIdentity() {
  const [identity, setIdentity] = useState<SchoolIdentity>(readCached);

  useEffect(() => {
    const handleUpdate = (event: Event) => setIdentity((event as CustomEvent<SchoolIdentity>).detail);
    window.addEventListener(UPDATE_EVENT, handleUpdate);
    settingsApi.getPublicIdentity().then((settings) => {
      const next = {
        schoolName: settings.schoolName || fallback.schoolName,
        logoUrl: settings.logoUrl || fallback.logoUrl,
        schoolEmail: settings.schoolEmail,
        schoolPhone: settings.schoolPhone,
      };
      publishSchoolIdentity(next);
      setIdentity(next);
    }).catch(() => undefined);
    return () => window.removeEventListener(UPDATE_EVENT, handleUpdate);
  }, []);

  // The browser tab shows the school's own name.
  useEffect(() => { document.title = identity.schoolName; }, [identity.schoolName]);

  return { ...identity, logoSrc: resolveSchoolLogo(identity.logoUrl) };
}
