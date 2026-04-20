import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole = "executive" | "manager" | "employee";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("tekaccess_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Mock login logic
    console.log("Logging in with:", email, password);
    const mockUser: User = {
      id: "1",
      email,
      name: email.split("@")[0],
      role: email.includes("admin") ? "executive" : "manager",
    };
    setUser(mockUser);
    localStorage.setItem("tekaccess_user", JSON.stringify(mockUser));
  };

  const googleLogin = async () => {
    // Mock Google login
    console.log("Google login initiated");
    const mockUser: User = {
      id: "google_123",
      email: "google.user@example.com",
      name: "Google User",
      role: "manager",
    };
    setUser(mockUser);
    localStorage.setItem("tekaccess_user", JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("tekaccess_user");
  };

  const resetPassword = async (email: string) => {
    console.log("Password reset requested for:", email);
    // Mock reset logic
    return new Promise((resolve) => setTimeout(resolve, 1000));
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, googleLogin, logout, resetPassword }}>
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
