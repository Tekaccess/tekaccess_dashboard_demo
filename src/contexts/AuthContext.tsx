import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  apiLogin,
  apiLogout,
  apiForgotPassword,
  apiResetPassword,
  apiUpdateProfile,
  getAccessToken,
  setAccessToken,
  type BackendUser,
} from "../lib/api";

export type UserRole = "super_admin" | "admin" | "user";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  dashboardAccess: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isInitialising: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string | null>;
  resetPassword: (token: string, password: string) => Promise<string | null>;
  updateName: (fullName: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toUser(u: BackendUser): User {
  return {
    id: u._id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    dashboardAccess: u.dashboardAccess,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialising, setIsInitialising] = useState(true);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    // Restore session from localStorage — token was already loaded into memory by api.ts.
    const token = getAccessToken();
    const cached = localStorage.getItem("tekaccess_user");
    if (token && cached) {
      try {
        const parsed = JSON.parse(cached);
        userRef.current = parsed;
        setUser(parsed);
      } catch {
        localStorage.removeItem("tekaccess_user");
        setAccessToken(null);
      }
    }
    setIsInitialising(false);
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    const res = await apiLogin(email, password);
    if (!res.success || !res.data) {
      return res.message || "Invalid email or password.";
    }
    setAccessToken(res.data.accessToken);
    const u = toUser(res.data.user);
    userRef.current = u;
    setUser(u);
    localStorage.setItem("tekaccess_user", JSON.stringify(u));
    return null;
  };

  const logout = async () => {
    await apiLogout();
    userRef.current = null;
    setUser(null);
    localStorage.removeItem("tekaccess_user");
  };

  const forgotPassword = async (email: string): Promise<string | null> => {
    const res = await apiForgotPassword(email);
    if (!res.success) {
      return res.message || "Could not send reset email. Please try again.";
    }
    return null;
  };

  const updateName = async (fullName: string): Promise<string | null> => {
    if (!userRef.current) return 'Not authenticated.';
    const res = await apiUpdateProfile(userRef.current.id, { fullName });
    if (!res.success || !res.data) {
      return res.message || 'Failed to update name.';
    }
    const updated = { ...userRef.current, fullName: res.data.user.fullName };
    userRef.current = updated;
    setUser(updated);
    localStorage.setItem('tekaccess_user', JSON.stringify(updated));
    return null;
  };

  const resetPassword = async (token: string, password: string): Promise<string | null> => {
    const res = await apiResetPassword(token, password);
    if (!res.success) {
      if (res.errors?.length) return res.errors[0].message;
      return res.message || "Failed to reset password. The link may have expired.";
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isInitialising,
        login,
        logout,
        forgotPassword,
        resetPassword,
        updateName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
