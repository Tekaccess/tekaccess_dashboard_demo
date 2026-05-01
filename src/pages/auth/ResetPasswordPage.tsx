import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Eye, EyeSlash, ArrowRight, CheckCircle, CircleNotch } from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useSearch } from "@tanstack/react-router";
import Logo from "../../components/Logo";
import { apiValidateResetToken } from "../../lib/api";

type PageState = "validating" | "ready" | "success";

const ResetPasswordPage: React.FC = () => {
  const [pageState, setPageState] = useState<PageState>("validating");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { token?: string };
  const token = search?.token || "";

  useEffect(() => {
    if (!token) {
      navigate({ to: "/login", replace: true });
      return;
    }
    apiValidateResetToken(token).then((res) => {
      if (res.success) {
        setPageState("ready");
      } else {
        navigate({ to: "/login", replace: true });
      }
    }).catch(() => {
      navigate({ to: "/login", replace: true });
    });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      const err = await resetPassword(token, password);
      if (err) {
        setError(err);
      } else {
        setPageState("success");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-app">
      <div className="w-full flex justify-center pt-8">
        <Logo className="h-12 object-contain" />
      </div>

      <div className="w-full max-w-[340px] px-4">
        {pageState === "validating" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <CircleNotch size={28} weight="bold" className="animate-spin text-accent" />
            <p className="text-sm text-t3">Verifying your link…</p>
          </div>
        )}

        {pageState === "ready" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="w-full"
          >
            <h1 className="text-2xl font-bold text-t1 mb-1">Set New Password</h1>
            <p className="text-sm text-t3 mb-6">
              Must be at least 8 characters with one uppercase letter and one number.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-border bg-surface text-t1 placeholder-t3 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm"
                  placeholder="New password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 hover:text-t2 transition-colors"
                >
                  {showPassword ? <EyeSlash size={20} weight="duotone" /> : <Eye size={20} weight="duotone" />}
                </button>
              </div>

              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-t1 placeholder-t3 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm"
                placeholder="Confirm new password"
              />

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-accent hover:bg-accent-h disabled:opacity-75 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? (
                  <><CircleNotch size={18} weight="bold" className="animate-spin" /> Saving…</>
                ) : (
                  <>Set Password <ArrowRight size={18} weight="bold" /></>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {pageState === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col items-center text-center py-4"
          >
            <div className="w-14 h-14 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={28} weight="duotone" className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-t1 mb-2">Password Updated</h2>
            <p className="text-sm text-t3 mb-6 max-w-[260px]">
              Your password has been changed and all active sessions have been signed out.
            </p>
            <button
              onClick={() => navigate({ to: "/login" })}
              className="w-full py-3 bg-accent hover:bg-accent-h text-white rounded-xl font-medium transition-colors text-sm"
            >
              Back to Login
            </button>
          </motion.div>
        )}
      </div>

      <p className="text-xs text-t3 pb-6">Authorized Personnel Only!</p>
    </div>
  );
};

export default ResetPasswordPage;
