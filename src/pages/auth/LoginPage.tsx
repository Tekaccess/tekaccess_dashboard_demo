import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeSlash, ArrowRight, CircleNotch } from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "@tanstack/react-router";
import Logo from "../../components/Logo";

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
    if (!email || email === "@tekaccess.rw") {
      setEmailError("Please enter your work email.");
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
        <Logo className="h-12 object-contain" />
      </div>

      <div className="w-full max-w-[340px] px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="w-full"
        >
          <h1 className="text-center text-2xl font-bold text-t1 mb-1">Welcome Back</h1>
          <p className="text-center text-sm text-t3 mb-6">Log in to access your account</p>

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
                <div className="relative group">
                  <input
                    type="text"
                    name="email"
                    required
                    autoFocus
                    value={email.includes("@") ? email.split("@")[0] : email}
                    onChange={(e) => {
                      const val = e.target.value.split("@")[0].trim();
                      setEmail(val ? `${val}@tekaccess.rw` : "");
                      setEmailError("");
                    }}
                    className="w-full pl-4 pr-[110px] py-3 rounded-xl border border-border bg-surface text-t1 placeholder-t3 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm"
                    placeholder="Enter work email"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-t3 text-sm font-medium pointer-events-none group-focus-within:text-accent transition-colors">
                    @tekaccess.rw
                  </div>
                </div>
                {emailError && <p className="text-xs text-red-500 mt-1.5">{emailError}</p>}
                <button
                  type="submit"
                  className="w-full py-3 bg-accent hover:bg-accent-h text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  Continue <ArrowRight size={18} weight="bold" />
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
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-surface text-sm">
                  <span className="text-t2 truncate text-sm font-medium">{email}</span>
                  <button
                    type="button"
                    onClick={() => { setStep("email"); setPassword(""); }}
                    className="text-accent hover:text-accent-h font-semibold ml-3 shrink-0 text-sm"
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
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-border bg-surface text-t1 placeholder-t3 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 hover:text-t2 transition-colors"
                  >
                    {showPassword
                      ? <EyeSlash size={20} weight="duotone" />
                      : <Eye size={20} weight="duotone" />}
                  </button>
                </div>

                {loginError && <p className="text-xs text-red-500 -mt-1">{loginError}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-accent hover:bg-accent-h disabled:opacity-75 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? (
                    <><CircleNotch size={18} weight="bold" className="animate-spin" /> Signing In…</>
                  ) : (
                    <>Log In <ArrowRight size={18} weight="bold" /></>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <p className="text-xs text-t3 pb-6">Authorized Personnel Only!</p>
    </div>
  );
};

export default LoginPage;
