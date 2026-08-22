import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { createProfile, fetchMyProfile, validateInvite } from "../lib/services";
import type { Profile, Role } from "../types";

export class ProfileMissingError extends Error {
  constructor() {
    super("Your account is signed in, but the exporter profile was never created. Finish setup with your invitation code.");
    this.name = "ProfileMissingError";
  }
}

interface AuthState {
  loading: boolean;
  isAuthenticated: boolean;
  profile: Profile | null;
  signInWithPassword: (email: string, password: string) => Promise<Profile>;
  completeProfile: (params: {
    role: Role;
    full_name: string;
    company_name?: string;
    invitation_code?: string;
  }) => Promise<Profile>;
  signUp: (params: {
    email: string;
    password: string;
    full_name: string;
    company_name?: string;
    role?: Role;
    invitation_code?: string;
  }) => Promise<{ needsEmailVerification: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// Bridges signup -> first real session: if Supabase requires email
// confirmation, signUp() returns no session (so we can't call the backend
// yet, it needs a bearer token). We stash the profile fields here and
// create the profile once a session actually appears — whether that's later
// in this tab or after the user clicks the link in a different one.
const PENDING_PROFILE_KEY = "fxpool:pending_profile";

export type PendingProfile = {
  full_name: string;
  role: Role;
  company_name?: string;
  invitation_code?: string;
};

export function peekPendingProfile(): PendingProfile | null {
  const raw = localStorage.getItem(PENDING_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function stashPendingProfile(full_name: string, role: Role, company_name?: string, invitation_code?: string) {
  localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify({ full_name, role, company_name, invitation_code }));
}

function clearPendingProfile() {
  localStorage.removeItem(PENDING_PROFILE_KEY);
}

function isMissingProfile(err: unknown) {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 404 || status === 403) return true;
  const msg = err instanceof Error ? err.message : "";
  return /profile not found/i.test(msg);
}

function isConflict(err: unknown) {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 409;
}

let inflight: Promise<Profile> | null = null;

async function loadProfileAfterSession(): Promise<Profile> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      return await fetchMyProfile();
    } catch (err) {
      if (isConflict(err)) return await fetchMyProfile();
      if (!isMissingProfile(err)) throw err;

      const pending = peekPendingProfile();
      if (!pending) throw new ProfileMissingError();

      try {
        const created = await createProfile({
          role: pending.role ?? "exporter",
          full_name: pending.full_name,
          company_name: pending.company_name,
          invitation_code: pending.invitation_code,
        });
        clearPendingProfile();
        return created;
      } catch (createErr) {
        if (isConflict(createErr)) {
          clearPendingProfile();
          return await fetchMyProfile();
        }
        throw createErr;
      }
    }
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        setIsAuthenticated(true);
        try {
          setProfile(await loadProfileAfterSession());
        } catch {
          setProfile(null);
        }
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        try {
          setProfile(await loadProfileAfterSession());
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase is not configured — set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const next = await loadProfileAfterSession();
    setIsAuthenticated(true);
    setProfile(next);
    return next;
  }, []);

  const completeProfile = useCallback(
    async (params: { role: Role; full_name: string; company_name?: string; invitation_code?: string }) => {
      try {
        const next = await createProfile(params);
        clearPendingProfile();
        setProfile(next);
        setIsAuthenticated(true);
        return next;
      } catch (err) {
        if (isConflict(err)) {
          const next = await fetchMyProfile();
          clearPendingProfile();
          setProfile(next);
          return next;
        }
        throw err;
      }
    },
    []
  );

  const signUp = useCallback(
    async (params: {
      email: string;
      password: string;
      full_name: string;
      company_name?: string;
      role?: Role;
      invitation_code?: string;
    }) => {
      if (!supabase) throw new Error("Supabase is not configured — set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.");
      const role: Role = params.role ?? "exporter";
      
      // Validate invitation code before reserving the email in auth.users
      if (role !== "admin") {
        if (!params.invitation_code) {
          throw new Error("Invitation code is required");
        }
        await validateInvite(params.invitation_code, role);
      }

      const { data, error } = await supabase.auth.signUp({ email: params.email, password: params.password });
      if (error) throw error;

      stashPendingProfile(params.full_name, role, params.company_name, params.invitation_code);

      if (data.session) {
        const next = await loadProfileAfterSession();
        setIsAuthenticated(true);
        setProfile(next);
        return { needsEmailVerification: false };
      }

      return { needsEmailVerification: true };
    },
    []
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ loading, isAuthenticated, profile, signInWithPassword, completeProfile, signUp, signOut }),
    [loading, isAuthenticated, profile, signInWithPassword, completeProfile, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
