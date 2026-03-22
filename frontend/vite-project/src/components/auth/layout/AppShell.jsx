import { BookOpen, LayoutDashboard, LogOut, UserCircle2, Brain, House } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import NotificationsPanel from "../../layout/NotificationsPanel";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Documents", to: "/documents", icon: BookOpen },
  { label: "Flashcards", to: "/flashcards", icon: Brain },
  { label: "Profile", to: "/profile", icon: UserCircle2 },
];

const AppShell = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between">
          <div>
            <div className="h-20 px-5 flex items-center gap-3 border-b border-slate-200">
              <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white grid place-items-center font-bold">
                AI
              </div>
              <div className="font-semibold text-lg">AI Learning Assistant</div>
            </div>

            <nav className="p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                        isActive
                          ? "bg-emerald-500 text-white shadow-md"
                          : "text-slate-700 hover:bg-slate-100"
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-200">
            <NavLink
              to="/"
              className="mb-2 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-100"
            >
              <House size={18} />
              <span className="font-medium">Home</span>
            </NavLink>

            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-100"
            >
              <LogOut size={18} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </aside>

        <main className="flex-1">
          <header className="h-20 px-8 border-b border-slate-200 bg-white flex items-center justify-end gap-6 sticky top-0 z-10">
            <NotificationsPanel />

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white grid place-items-center font-semibold uppercase">
                {(user?.username || "A").slice(0, 1)}
              </div>
              <div className="leading-tight">
                <p className="font-semibold">{user?.username || "Alex"}</p>
                <p className="text-sm text-slate-500">{user?.email || "alex@example.com"}</p>
              </div>
            </div>
          </header>

          <section className="p-8">{children}</section>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
