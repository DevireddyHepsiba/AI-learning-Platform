import { BookOpen, LayoutDashboard, LogOut, UserCircle2, Brain, House, Menu, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import NotificationsPanel from "../../layout/NotificationsPanel";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Documents", to: "/documents", icon: BookOpen },
  { label: "Flashcards", to: "/flashcards", icon: Brain },
  { label: "Profile", to: "/profile", icon: UserCircle2 },
];

const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden h-16 px-4 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500 text-white grid place-items-center font-bold text-sm">
              AI
            </div>
            <div className="font-semibold text-sm">AI Learning</div>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Sidebar */}
        <aside className={`fixed lg:static top-16 lg:top-0 left-0 right-0 lg:right-auto bottom-0 lg:bottom-auto w-full lg:w-64 border-r border-slate-200 bg-white flex flex-col justify-between transform transition-transform lg:translate-x-0 z-10 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } max-h-[calc(100vh-4rem)] lg:max-h-screen overflow-y-auto`}>
          {/* Desktop Header */}
          <div className="hidden lg:block">
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
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm ${
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

          {/* Mobile Navigation */}
          <div className="lg:hidden p-4 space-y-2 border-b border-slate-200">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm ${
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
          </div>

          <div className="p-4 border-t border-slate-200 space-y-2">
            <NavLink
              to="/"
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-100 text-sm"
            >
              <House size={18} />
              <span className="font-medium">Home</span>
            </NavLink>

            <button
              onClick={() => {
                logout();
                setSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-100 text-sm"
            >
              <LogOut size={18} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-5"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 flex flex-col">
          <header className="h-14 md:h-16 lg:h-20 px-3 md:px-6 lg:px-8 border-b border-slate-200 bg-white flex items-center justify-between md:justify-end gap-4 md:gap-6 sticky top-16 lg:top-0 z-10">
            <div className="flex-1 md:flex-none" />
            <div className="flex items-center gap-4 md:gap-6">
              <NotificationsPanel />

              <div className="flex items-center gap-2 md:gap-3">
                <div className="h-9 md:h-10 w-9 md:w-10 rounded-xl bg-emerald-500 text-white grid place-items-center font-semibold uppercase text-xs md:text-sm shrink-0">
                  {(user?.username || "A").slice(0, 1)}
                </div>
                <div className="leading-tight hidden md:block min-w-0">
                  <p className="font-semibold text-xs md:text-sm truncate">{user?.username || "Alex"}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email || "alex@example.com"}</p>
                </div>
              </div>
            </div>
          </header>

          <section className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">{children}</section>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
