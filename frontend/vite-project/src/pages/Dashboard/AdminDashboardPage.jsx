import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Users, FileText, ClipboardList, LogOut } from "lucide-react";

const AdminStatCard = ({ title, value, icon: Icon, tone }) => (
  <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-slate-500 text-sm font-semibold uppercase tracking-wide">{title}</p>
      <div className={`h-11 w-11 rounded-xl grid place-items-center ${tone}`}>
        <Icon size={20} />
      </div>
    </div>
    <p className="mt-4 text-4xl font-bold text-slate-900">{value}</p>
  </div>
);

const AdminDashboardPage = () => {
  const navigate = useNavigate();

  const handleAdminLogout = () => {
    localStorage.removeItem("isAdminAuthenticated");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-sm text-slate-500">Administrative control panel</p>
            </div>
          </div>

          <button
            onClick={handleAdminLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <AdminStatCard
            title="Total Students"
            value="--"
            icon={Users}
            tone="bg-sky-100 text-sky-600"
          />
          <AdminStatCard
            title="Documents Managed"
            value="--"
            icon={FileText}
            tone="bg-fuchsia-100 text-fuchsia-600"
          />
          <AdminStatCard
            title="Quizzes Created"
            value="--"
            icon={ClipboardList}
            tone="bg-emerald-100 text-emerald-600"
          />
        </section>

        <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Admin Area</h2>
          <p className="text-slate-600 mt-2">
            This page is exclusively available for admin login. Student users continue using the
            existing dashboard and learning flows.
          </p>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboardPage;
