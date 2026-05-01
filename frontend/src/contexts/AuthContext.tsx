import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const friendlyAuthError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  if (message.toLowerCase().includes('failed to fetch')) {
    return new Error(
      'Could not connect to Supabase. Check VITE_SUPABASE_URL in frontend/.env, make sure the Supabase project is active, then restart npm run dev.'
    );
  }

  return error;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfileById(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfileById(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const fetchProfileById = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
    }
  };

  const fetchProfile = async () => {
    if (session?.user) {
      await fetchProfileById(session.user.id);
    }
  };

  const ensureProfile = async (userId: string, email?: string, fullName?: string) => {
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      email: email ?? '',
      ...(fullName ? { full_name: fullName } : {}),
    });

    if (error) throw error;
    await fetchProfileById(userId);
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.session && data.user) {
        await ensureProfile(data.user.id, email, fullName);
      }
    } catch (error) {
      throw friendlyAuthError(error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        await ensureProfile(
          data.session.user.id,
          data.session.user.email
        );
      }
    } catch (error) {
      throw friendlyAuthError(error);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signUp, signIn, signOut, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
