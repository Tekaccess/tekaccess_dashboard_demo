import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "@tanstack/react-router";

const LoginPage: React.FC = () => {
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.toLowerCase().endsWith("@tekaccess.rw")) {
      setEmailError("Only @tekaccess.rw email addresses are allowed.");
      return;
    }
    setEmailError("");
    setStep("password");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError("");
    try {
      const error = await login(email, password);
      if (error) {
        setLoginError(error);
      } else {
        navigate({ to: "/" });
      }
    } catch {
      setLoginError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-app">
      <div className="w-full flex justify-center pt-8">
        <img src="/logo.jpg" alt="TekAccess" className="h-12 object-contain" />
      </div>

      <div className="w-full max-w-[340px] px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="w-full"
        >
          <h1 className="text-2xl font-bold text-[var(--text-1)] mb-1">Welcome Back</h1>
          <p className="text-sm text-[var(--text-3)] mb-6">Log in to access your account</p>

          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.form
                key="email-step"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.15 }}
                onSubmit={handleEmailContinue}
                className="space-y-3"
              >
                <div>
                  <input
                    type="email"
                    name="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-[var(--card-bg)] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-indigo-300/50 dark:focus:ring-indigo-500/30 transition-all text-sm"
                    placeholder="Enter Email address"
                  />
                  {emailError && (
                    <p className="text-xs text-red-500 mt-1.5">{emailError}</p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-400 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="password-step"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.15 }}
                onSubmit={handleLogin}
                className="space-y-3"
              >
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-[var(--surface)] text-sm">
                  <span className="text-[var(--text-2)] truncate text-sm">{email}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setPassword("");
                    }}
                    className="text-indigo-500 hover:text-indigo-600 font-medium ml-3 shrink-0 text-sm"
                  >
                    Edit
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 dark:border-white/10 bg-[var(--card-bg)] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-indigo-300/50 dark:focus:ring-indigo-500/30 transition-all text-sm"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {loginError && (
                  <p className="text-xs text-red-500 -mt-1">{loginError}</p>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/forgot-password" })}
                    className="text-xs text-indigo-500 hover:text-indigo-600 font-medium transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-indigo-400 hover:bg-indigo-500 disabled:opacity-75 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      Log In <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <p className="text-xs text-[var(--text-3)] pb-6">Authorized Personnel Only!</p>
    </div>
  );
};

export default LoginPage;
