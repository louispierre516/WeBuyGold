import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Load from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("wetrack_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (email) => {
    // Simulated roles
    const role = email === "admin@test.com" ? "Admin" : "User";
    const store = "Chaguanas";
    const loggedInUser = {
      email,
      role,
      store
    };

    setUser(loggedInUser);
    localStorage.setItem("wetrack_user", JSON.stringify(loggedInUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("wetrack_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};