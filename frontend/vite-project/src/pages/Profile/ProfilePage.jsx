import { Loader2, Lock, Mail, User } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AppShell from "../../components/auth/layout/AppShell";
import { useAuth } from "../../context/AuthContext";
import authService from "../../services/authService";

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [profileForm, setProfileForm] = useState({ username: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const response = await authService.getProfile();
        const data = response?.data || response;
        setProfileForm({
          username: data?.username || user?.username || "",
          email: data?.email || user?.email || "",
        });
      } catch {
        setProfileForm({
          username: user?.username || "",
          email: user?.email || "",
        });
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [user?.email, user?.username]);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    if (!profileForm.username.trim()) {
      toast.error("Username is required");
      return;
    }

    if (!profileForm.email.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }

    try {
      setProfileSaving(true);
      const response = await authService.updateProfile({
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
      });
      const updated = response?.data || {};
      updateUser(updated);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error?.error || error?.message || "Profile update failed");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Please fill all password fields");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setPasswordSaving(true);
      await authService.changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error(error?.error || error?.message || "Password change failed");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">Profile Settings</h1>

        {profileLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 flex items-center justify-center gap-3 text-slate-600">
            <Loader2 className="animate-spin" size={20} /> Loading profile...
          </div>
        ) : (
          <>
            <form onSubmit={handleProfileSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <h2 className="text-3xl font-semibold">User Information</h2>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={profileForm.username}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, username: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-3 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-3 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-60"
                >
                  {profileSaving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>

            <form onSubmit={handlePasswordSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <h2 className="text-3xl font-semibold">Change Password</h2>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Current Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, oldPassword: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-3 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-3 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm New Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-3 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-60"
                >
                  {passwordSaving ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default ProfilePage;