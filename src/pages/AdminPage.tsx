import React, { useState } from "react";
import { motion } from "motion/react";
import { UserPlus, Mail, Shield, User, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth, UserRole } from "../contexts/AuthContext";

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "manager" as UserRole,
  });
  const [isSuccess, setIsSuccess] = useState(false);

  if (user?.role !== "executive") {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="bg-red-500/10 p-6 rounded-full mb-6">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-gray-400 max-w-sm">
          Only executives have permission to manage accounts and add new users.
        </p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would hit an API
    console.log("Adding user:", formData);
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
    setFormData({ name: "", email: "", role: "manager" });
  };

  return (
    <div className="max-w-4xl mx-auto p-8 font-['Outfit']">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Account Management</h1>
        <p className="text-gray-400 text-lg">As an executive, you can create and manage user permissions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-600/20 rounded-xl">
                <UserPlus className="w-6 h-6 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-white">Add New Account</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full pl-12 pr-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@tekaccess.com"
                      className="w-full pl-12 pr-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">User Role</label>
                <div className="grid grid-cols-3 gap-4">
                  {(["executive", "manager", "employee"] as UserRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setFormData({ ...formData, role })}
                      className={`py-3 px-4 rounded-xl border text-sm font-medium capitalize transition-all ${
                        formData.role === role
                          ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                          : "bg-white/[0.05] border-white/10 text-gray-400 hover:bg-white/[0.08]"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
                >
                  Create Account
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </form>

            {isSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400"
              >
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>Account created successfully! Credentials sent to email.</span>
              </motion.div>
            )}
          </motion.div>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl overflow-hidden relative">
            <Shield className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-white mb-2">Executive Power</h3>
              <p className="text-blue-100 text-sm leading-relaxed mb-4">
                As an executive, you have the highest level of system access. Be careful when assigning roles to others.
              </p>
              <div className="text-xs font-bold text-white uppercase tracking-widest bg-white/20 inline-block px-3 py-1 rounded-full">
                ADMIN ACCESS
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10">
            <h3 className="text-white font-bold mb-4">Recent Users</h3>
            <div className="space-y-4">
              {[
                { name: "Sarah Connor", role: "Manager", email: "sarah@tek.com" },
                { name: "John Wick", role: "Employee", email: "babayaga@tek.com" },
              ].map((u, i) => (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                      {u.name[0]}
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{u.name}</div>
                      <div className="text-gray-500 text-xs">{u.role}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => alert(`Password reset link sent to ${u.email}`)}
                    className="p-2 text-gray-500 hover:text-blue-400 transition-colors"
                    title="Reset Password"
                  >
                    <KeyRound size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
