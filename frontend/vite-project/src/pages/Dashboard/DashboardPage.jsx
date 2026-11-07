import { ArrowRight, ArrowUpRight, BookOpen, BrainCircuit, Check, Clock3, FileText, Layers3, Loader2, Sparkles, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AppShell from "../../components/auth/layout/AppShell";
import CreateSessionModal from "../../components/session/CreateSessionModal";
import progressService from "../../services/progressService";

const statConfig = [
  { key: "totalDocuments", label: "Documents", icon: FileText, tone: "stat-lilac", link: "/documents" },
  { key: "totalFlashcards", label: "Flashcards", icon: Layers3, tone: "stat-mint", link: "/flashcards" },
  { key: "totalQuizzes", label: "Quizzes", icon: BrainCircuit, tone: "stat-peach", link: "/documents" },
];

const formatDate = (dateString) => {
  if (!dateString) return "Date unavailable";
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const DashboardPage = () => {
  const [searchParams] = useSearchParams();
  const { user, loginWithOAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);

  useEffect(() => {
    const authenticated = searchParams.get("authenticated");
    if (authenticated !== "true") return;
    const handleOAuthLogin = async () => {
      const success = await loginWithOAuth();
      if (success) window.history.replaceState({}, document.title, window.location.pathname);
    };
    handleOAuthLogin();
  }, [searchParams, loginWithOAuth]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const response = await progressService.getDashboardData();
        setDashboardData(response?.data || response);
      } catch (err) {
        setError(err?.error || err?.message || "We couldn't load your learning overview.");
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const recentItems = useMemo(() => {
    if (!dashboardData?.recentActivity) return [];
    const docs = (dashboardData.recentActivity.documents || []).map((doc) => ({ id: doc._id, label: doc.title, detail: "Opened a document", timestamp: doc.lastAccessed || doc.updatedAt || doc.createdAt, type: "document", to: `/documents/${doc._id}` }));
    const quizzes = (dashboardData.recentActivity.quizzes || []).map((quiz) => ({ id: quiz._id, label: quiz.title, detail: "Completed a quiz", timestamp: quiz.completedAt || quiz.createdAt, type: "quiz", to: `/quizzes/${quiz._id}/results` }));
    return [...docs, ...quizzes].filter((item) => item.timestamp).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
  }, [dashboardData]);

  const overview = dashboardData?.overview || {};
  const firstName = (user?.username || user?.name || "friend").split(/[\s@]/)[0];
  const dayPart = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(new Date());

  return (
    <AppShell>
      <div className="dashboard-page">
        <div className="dashboard-heading">
          <div><div className="eyebrow"><span className="eyebrow-dot" /> {dayPart.toUpperCase()} · YOUR LEARNING SPACE</div><h1>Good to see you, <em>{firstName}.</em></h1><p>Pick up a thread, or start somewhere new. You’re right on time.</p></div>
          <button onClick={() => setIsCreateSessionOpen(true)} className="button button-dark"><UsersRound size={17} /> Study with someone <ArrowRight size={15} /></button>
        </div>

        {loading ? (
          <div className="dashboard-state"><Loader2 className="animate-spin" size={20} /> Gathering your learning space…</div>
        ) : error ? (
          <div className="dashboard-error"><span>{error}</span><button onClick={() => window.location.reload()}>Try again <ArrowRight size={14} /></button></div>
        ) : (
          <>
            <div className="dashboard-stats">
              {statConfig.map(({ key, label, icon: Icon, tone, link }) => <Link to={link} key={key} className="dashboard-stat"><span className={`stat-icon ${tone}`}><Icon size={19} /></span><span className="stat-label">{label}</span><strong>{overview[key] || 0}</strong><span className="stat-footer">In your learning space <ArrowUpRight size={14} /></span></Link>)}
            </div>

            <div className="dashboard-main-grid">
              <section className="continue-card">
                <div className="continue-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="continue-art-center"><BookOpen size={32} strokeWidth={1.5}/></div><span className="art-spark art-spark-one">✳</span><span className="art-spark art-spark-two">✦</span><span className="art-label">KEEP EXPLORING</span></div>
                <div className="continue-copy"><span className="continue-kicker"><Sparkles size={13}/> YOUR NEXT SMALL STEP</span><h2>Curiosity is a good place to start.</h2><p>Your library is waiting whenever you’re ready to make sense of something new.</p><Link to="/documents" className="text-link">Visit your library <ArrowRight size={15}/></Link></div>
              </section>

              <section className="activity-card">
                <div className="card-heading"><div><span className="card-kicker">A LITTLE RECAP</span><h2>Recent activity</h2></div><Clock3 size={18} className="muted-icon"/></div>
                {recentItems.length === 0 ? <div className="activity-empty"><span className="empty-icon"><Sparkles size={18}/></span><p>Your story starts here.</p><small>Open a document to see it appear in your recent activity.</small><Link to="/documents" className="text-link">Go to your library <ArrowRight size={14}/></Link></div> : <div className="activity-list">{recentItems.map((item) => <Link to={item.to} key={`${item.type}-${item.id}`} className="activity-item"><span className={`activity-icon ${item.type === "document" ? "activity-document" : "activity-quiz"}`}>{item.type === "document" ? <FileText size={17}/> : <Check size={17}/>}</span><span className="activity-copy"><strong>{item.label || item.detail}</strong><small>{item.detail} · {formatDate(item.timestamp)}</small></span><ArrowUpRight size={15} className="activity-arrow"/></Link>)}</div>}
              </section>
            </div>

            <section className="dashboard-nudge"><span className="nudge-mark"><Sparkles size={17}/></span><span><strong>Learning isn’t a race.</strong><small>A few focused minutes today can make tomorrow feel easier.</small></span><span className="nudge-check">ONE STEP AT A TIME</span></section>
          </>
        )}
      </div>

      <CreateSessionModal isOpen={isCreateSessionOpen} onClose={() => setIsCreateSessionOpen(false)} />
    </AppShell>
  );
};

export default DashboardPage;
