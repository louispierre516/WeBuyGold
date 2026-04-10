import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) setRole(data.role);
      else setRole(null);
    } catch {
      setRole(null);
    }
  };


  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { data: null, error };

    setUser(data.user);
    setSession(data.session);
    await fetchUserRole(data.user.id);

    return { data, error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setRole(null);
  };


  useEffect(() => {
    const initialize = async () => {
      const { data } = await supabase.auth.getSession();

      setSession(data.session);
      setUser(data.session?.user ?? null);

      setLoading(false); // 🔥 stop loading immediately
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }

    fetchUserRole(user.id)
    
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {loading ? <LoadingScreen /> : children}
    </AuthContext.Provider>
  );
};


// 🎨 Simple, pleasant loading screen
const LoadingScreen = () => (
  <div style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    flexDirection: "column",
    background: "#f7f7f7",
    color: "#333",
    fontFamily: "sans-serif"
  }}>
    <div className="spinner" style={{
      width: "50px",
      height: "50px",
      border: "6px solid #ddd",
      borderTop: "6px solid #4f46e5",
      borderRadius: "50%",
      animation: "spin 1s linear infinite"
    }} />
    <p style={{ marginTop: "20px", fontSize: "18px" }}>Loading, please wait...</p>

    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);
