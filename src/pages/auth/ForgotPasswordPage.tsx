import React, { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, CheckCircle, CircleNotch } from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "@tanstack/react-router";
import Logo from "../../components/Logo";

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSubmitError("");
    try {
      const error = await forgotPassword(email);
      if (error) {
        setSubmitError(error);
      } else {
        setIsSubmitted(true);
      }
    } catch {
      setSubmitError("Something went wrong. Please try again.");
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
          <button
            onClick={() => navigate({ to: "/login" })}
            className="flex items-center text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors mb-6 text-sm font-medium group"
          >
            <ArrowLeft size={18} weight="bold" className="mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to Login
          </button>

          {!isSubmitted ? (
            <>
              <h1 className="text-2xl font-bold text-[var(--text-1)] mb-1">Reset Password</h1>
              <p className="text-sm text-[var(--text-3)] mb-6">
                Enter your email and we'll send you reset instructions.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  name="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-[var(--card-bg)] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-indigo-300/50 dark:focus:ring-indigo-500/30 transition-all text-sm"
                  placeholder="Enter Email address"
                />
                {submitError && <p className="text-xs text-red-500">{submitError}</p>}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-indigo-400 hover:bg-indigo-500 disabled:opacity-75 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? (
                    <><CircleNotch size={18} weight="bold" className="animate-spin" /> Sending…</>
                  ) : (
                    <>Send Reset Link <ArrowRight size={18} weight="bold" /></>
                  )}
                </button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col items-center text-center py-4"
            >
              <div className="w-14 h-14 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={28} weight="duotone" className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-1)] mb-2">Check your email</h2>
              <p className="text-sm text-[var(--text-3)] mb-6 max-w-[260px]">
                We've sent reset instructions to{" "}
                <span className="text-[var(--text-1)] font-medium">{email}</span>
              </p>
              <button
                onClick={() => navigate({ to: "/login" })}
                className="w-full py-3 border border-gray-200 dark:border-white/10 hover:bg-[var(--surface)] text-[var(--text-1)] rounded-xl font-medium transition-colors text-sm"
              >
                Back to Login
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>

      <p className="text-xs text-[var(--text-3)] pb-6">Authorized Personnel Only!</p>
    </div>
  );
};

export default ForgotPasswordPage;
