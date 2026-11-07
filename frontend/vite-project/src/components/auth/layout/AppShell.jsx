import {
  BookOpen,
  BrainCircuit,
  ChevronDown,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  UserCircle2,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import NotificationsPanel from "../../layout/NotificationsPanel";

const navItems = [
  { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
  { label: "My library", to: "/documents", icon: BookOpen },
  { label: "Flashcards", to: "/flashcards", icon: BrainCircuit },
  { label: "My profile", to: "/profile", icon: UserCircle2 },
];

const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const displayName = user?.username || user?.name || "Learner";
  const initial = displayName.trim().slice(0, 1).toUpperCase();

  return (
    <div className="workspace min-h-screen text-ink">
      <div className="workspace-layout">
        <div className="workspace-mobilebar">
          <NavLink to="/dashboard" className="brand-lockup" aria-label="Morrow workspace">
            <span className="brand-mark"><BrainCircuit size={18} /></span><span className="brand-name">morrow<span>.</span></span>
          </NavLink>
          <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} className="mobile-menu-button" aria-label={sidebarOpen ? "Close menu" : "Open menu"}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {sidebarOpen && <button type="button" className="workspace-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}

        <aside className={`workspace-sidebar ${sidebarOpen ? "workspace-sidebar-open" : ""}`}>
          <div>
            <div className="sidebar-brand-row">
              <NavLink to="/dashboard" className="brand-lockup" onClick={() => setSidebarOpen(false)}>
                <span className="brand-mark"><BrainCircuit size={19} /></span><span className="brand-name">morrow<span>.</span></span>
              </NavLink>
              <span className="sidebar-plan">STUDY SPACE</span>
            </div>

            <div className="sidebar-section-label">YOUR SPACE</div>
            <nav className="workspace-nav" aria-label="Workspace navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                return <NavLink key={item.to} to={item.to} end={item.to === "/dashboard"} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `workspace-nav-link ${isActive ? "workspace-nav-active" : ""}`}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.label === "My library" && <span className="nav-count">↗</span>}</NavLink>;
              })}
            </nav>

            <div className="sidebar-focus-card">
              <div className="focus-spark"><Sparkles size={15} /></div>
              <span className="focus-card-kicker">A GENTLE REMINDER</span>
              <p>Small steps count. Pick one thing to understand today.</p>
              <div className="focus-card-line"><span /></div>
            </div>
          </div>

          <div className="sidebar-bottom">
            <NavLink to="/" onClick={() => setSidebarOpen(false)} className="workspace-nav-link"><House size={18} strokeWidth={1.8} /><span>Back to home</span></NavLink>
            <button onClick={() => { logout(); setSidebarOpen(false); }} className="workspace-nav-link workspace-logout"><LogOut size={18} strokeWidth={1.8} /><span>Sign out</span></button>
          </div>
        </aside>

        <main className="workspace-main">
          <header className="workspace-topbar">
            <div className="topbar-context"><span className="topbar-kicker">YOUR PERSONAL LEARNING SPACE</span><span className="topbar-subtitle">Keep your curiosity close.</span></div>
            <div className="topbar-actions">
              <NotificationsPanel />
              <div className="topbar-divider" />
              <NavLink to="/profile" className="topbar-profile">
                <span className="profile-avatar">{initial}</span>
                <span className="profile-copy"><strong>{displayName}</strong><small>Keep growing</small></span>
                <ChevronDown size={15} className="profile-chevron" />
              </NavLink>
            </div>
          </header>
          <section className="workspace-content">{children}</section>
          <footer className="workspace-footer"><span>Take it one idea at a time.</span><span><Sparkles size={12} /> Made for the curious</span></footer>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
