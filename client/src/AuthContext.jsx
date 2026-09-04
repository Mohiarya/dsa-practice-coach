import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // "Persistent session": on every fresh load, ask the backend whether the
  // httpOnly cookie (if any) still identifies a real, logged-in user —
  // this is the entire mechanism behind "close the browser, come back
  // later, still logged in."
  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const loggedInUser = await api.login({ email, password });
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function signup(email, password, name) {
    const newUser = await api.signup({ email, password, name });
    setUser(newUser);
    return newUser;
  }

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
