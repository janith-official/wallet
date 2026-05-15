import { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/supabase/client';
import { getOnboardingSeen, setOnboardingSeen } from '@/lib/onboarding';

type AuthState = {
  session: Session | null;
  loading: boolean;
  hasSeenOnboarding: boolean | null;
};

type AuthContextType = AuthState & {
  markOnboardingSeen: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  hasSeenOnboarding: null,
  markOnboardingSeen: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true, hasSeenOnboarding: null });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const seen = await getOnboardingSeen(data.session.user);
        setState({ session: data.session, loading: false, hasSeenOnboarding: seen });
      } else {
        setState({ session: null, loading: false, hasSeenOnboarding: null });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const seen = await getOnboardingSeen(session.user);
        setState({ session, loading: false, hasSeenOnboarding: seen });
      } else {
        setState({ session: null, loading: false, hasSeenOnboarding: null });
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const markOnboardingSeen = async () => {
    if (!state.session) return;
    await setOnboardingSeen(state.session.user.id);
    setState((prev) => ({ ...prev, hasSeenOnboarding: true }));
  };

  return (
    <AuthContext.Provider value={{ ...state, markOnboardingSeen }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
