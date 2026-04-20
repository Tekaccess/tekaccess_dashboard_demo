import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  apiLogin,
  apiLogout,
  apiForgotPassword,
  apiResetPassword,
  apiRefresh,
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
    const cached = sessionStorage.getItem("tekaccess_user");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        userRef.current = parsed;
        setUser(parsed);
      } catch {
        sessionStorage.removeItem("tekaccess_user");
      }
    }

    // Silently restore the access token from the httpOnly refresh cookie on page load.
    apiRefresh()
      .then((ok) => {
        if (!ok) {
          setUser(null);
          sessionStorage.removeItem("tekaccess_user");
        }
      })
      .finally(() => setIsInitialising(false));
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
    sessionStorage.setItem("tekaccess_user", JSON.stringify(u));
    return null;
  };

  const logout = async () => {
    await apiLogout();
    userRef.current = null;
    setUser(null);
    sessionStorage.removeItem("tekaccess_user");
  };

  const forgotPassword = async (email: string): Promise<string | null> => {
    const res = await apiForgotPassword(email);
    if (!res.success) {
      return res.message || "Could not send reset email. Please try again.";
    }
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
