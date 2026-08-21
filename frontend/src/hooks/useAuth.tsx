import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { createProfile, fetchMyProfile } from "../lib/services";
import type { Profile, Role } from "../types";

interface AuthState {
  loading: boolean;
  isAuthenticated: boolean;
  profile: Profile | null;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    full_name: string;
    company_name?: string;
    role?: Role;
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

function stashPendingProfile(full_name: string, role: Role, company_name?: string) {
  localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify({ full_name, role, company_name }));
}

function takePendingProfile(): { full_name: string; role: Role; company_name?: string } | null {
  const raw = localStorage.getItem(PENDING_PROFILE_KEY);
  if (!raw) return null;
  localStorage.removeItem(PENDING_PROFILE_KEY);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadProfileAfterSession(): Promise<Profile> {
  try {
    return await fetchMyProfile();
  } catch {
    // No profile row yet — this is the first session after a confirmed
    // signup. If we have pending profile fields saved, create it now.
    const pending = takePendingProfile();
    if (pending) {
      return await createProfile({ role: pending.role ?? "exporter", full_name: pending.full_name, company_name: pending.company_name });
    }
    throw new Error("Signed in but no profile exists, and no pending signup data was found.");
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
  }, []);

  const signUp = useCallback(
    async (params: { email: string; password: string; full_name: string; company_name?: string; role?: Role }) => {
      if (!supabase) throw new Error("Supabase is not configured — set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.");
      const role: Role = params.role ?? "exporter";
      const { data, error } = await supabase.auth.signUp({ email: params.email, password: params.password });
      if (error) throw error;

      // If email confirmation is off, signUp() returns a session right
      // away — create the profile immediately. If confirmation is
      // required, session is null until the link is clicked; stash the
      // profile fields and create it later, in loadProfileAfterSession().
      if (data.session) {
        await createProfile({ role, full_name: params.full_name, company_name: params.company_name });
        setIsAuthenticated(true);
        setProfile(await fetchMyProfile());
        return { needsEmailVerification: false };
      }

      stashPendingProfile(params.full_name, role, params.company_name);
      return { needsEmailVerification: true };
    },
    []
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ loading, isAuthenticated, profile, signInWithPassword, signUp, signOut }),
    [loading, isAuthenticated, profile, signInWithPassword, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}