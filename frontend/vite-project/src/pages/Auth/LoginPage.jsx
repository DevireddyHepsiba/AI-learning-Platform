import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import authService from "../../services/authService";
import { BASE_URL } from "../../utils/apiPath";
import { BrainCircuit, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      const message = "Please enter email and password";
      setError(message);
      toast.error(message);
      return;
    }

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const { token, user } = await authService.login(normalizedEmail, password);
      login(user, token);
      toast.success("🎉 Welcome back! Successfully logged in.");
      navigate("/dashboard");
    } catch (err) {
      const message =
        err?.status === 401
          ? "Invalid credentials. Please check email/password or register first."
          : err?.error || err?.message || "Login failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-40 md:w-60 lg:w-80 h-40 md:h-60 lg:h-80 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-40 md:w-60 lg:w-80 h-40 md:h-60 lg:h-80 bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 md:w-60 lg:w-80 h-40 md:h-60 lg:h-80 bg-violet-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md">
        {/* Glass Effect Card */}
        <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-2xl shadow-emerald-500/10 border border-white/20 p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-8 md:mb-10">
            <div className="inline-flex items-center justify-center w-12 md:w-16 h-12 md:h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg mb-4 md:mb-6">
              <BrainCircuit className="w-6 md:w-8 h-6 md:h-8 text-white" strokeWidth={2.5} />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent mb-1 md:mb-2">
              Welcome back
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium">
              Sign in to continue your journey
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Email Field */}
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-xs md:text-sm font-semibold text-slate-700">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none transition-colors duration-300">
                  <Mail className={`w-4 md:w-5 h-4 md:h-5 ${focusedField === "email" ? "text-emerald-500" : "text-slate-400 group-hover:text-emerald-400"}`} strokeWidth={2} />
                </div>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3.5 bg-white/60 border-2 border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all duration-300 hover:border-slate-300 text-sm md:text-base"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 md:space-y-2">
              <div className="flex justify-between items-center gap-2">
                <label className="text-xs md:text-sm font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-xs md:text-sm text-slate-500 font-medium hidden md:inline">Use your registered password</span>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none transition-colors duration-300">
                  <Lock className={`w-4 md:w-5 h-4 md:h-5 ${focusedField === "password" ? "text-emerald-500" : "text-slate-400 group-hover:text-emerald-400"}`} strokeWidth={2} />
                </div>

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-10 md:pl-12 pr-10 md:pr-12 py-2.5 md:py-3.5 bg-white/60 border-2 border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all duration-300 hover:border-slate-300 text-sm md:text-base"
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 md:pr-4 flex items-center text-slate-400 hover:text-emerald-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 md:w-5 h-4 md:h-5" /> : <Eye className="w-4 md:w-5 h-4 md:h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 md:p-4 bg-red-50 border border-red-200 rounded-xl animate-pulse">
                <p className="text-red-600 text-xs md:text-sm font-medium text-center">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 md:py-4 px-4 md:px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none text-sm md:text-base"
            >
              <span className="flex items-center justify-center gap-2 md:gap-3">
                {loading ? (
                  <>
                    <div className="w-4 md:w-5 h-4 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="hidden md:inline">Signing in...</span><span className="md:hidden">Signing...</span>
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 md:w-5 h-4 md:h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 md:my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs md:text-sm">
              <span className="px-3 md:px-4 bg-white/80 text-slate-500 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <button 
              type="button"
              onClick={() => {
                window.location.href = `${BASE_URL}/auth/google`;
              }}
              className="flex items-center justify-center gap-2 py-2.5 md:py-3 px-3 md:px-4 bg-white border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-xl text-slate-700 font-medium transition-all duration-300 group text-xs md:text-sm"
            >
              <svg className="w-4 md:w-5 h-4 md:h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              </svg>
              <span className="hidden md:inline">Google</span>
            </button>
            <button 
              type="button"
              className="flex items-center justify-center gap-2 py-2.5 md:py-3 px-3 md:px-4 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-all duration-300 group text-xs md:text-sm"
            >
              <svg className="w-4 md:w-5 h-4 md:h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="hidden md:inline">Facebook</span>
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 md:mt-8 text-center">
            <p className="text-xs md:text-sm text-slate-600">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-all duration-300"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>

        {/* Decorative Bottom */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400 font-medium">
            By continuing, you agree to our{" "}
            <a href="#" className="text-emerald-500 hover:text-emerald-600 transition-colors">
              Terms
            </a>{" "}
            &{" "}
            <a href="#" className="text-emerald-500 hover:text-emerald-600 transition-colors">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>

      {/* CSS Animation Keyframes */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};



export default LoginPage;