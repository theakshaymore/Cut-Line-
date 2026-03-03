import { createContext, useContext, useMemo, useState } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

const storedToken = localStorage.getItem("nextcut_token");
const storedUser = localStorage.getItem("nextcut_user");

export function AuthProvider({ children }) {
  const [token, setToken] = useState(storedToken || "");
  const [user, setUser] = useState(storedUser ? JSON.parse(storedUser) : null);

  const setAuth = (payload) => {
    setToken(payload.token);
    setUser(payload.user);
    localStorage.setItem("nextcut_token", payload.token);
    localStorage.setItem("nextcut_user", JSON.stringify(payload.user));
  };

  const logout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("nextcut_token");
    localStorage.removeItem("nextcut_user");
  };

  const registerCustomer = async (data) => {
    const res = await api.post("/auth/register", { ...data, role: "customer" });
    setAuth(res.data);
    return res.data;
  };

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setAuth(res.data);
    return res.data;
  };

  const barberRegister = async (tokenParam, data) => {
    const res = await api.post(`/auth/barber-register/${tokenParam}`, data);
    setAuth(res.data);
    return res.data;
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthed: Boolean(token && user),
      registerCustomer,
      login,
      barberRegister,
      logout,
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
