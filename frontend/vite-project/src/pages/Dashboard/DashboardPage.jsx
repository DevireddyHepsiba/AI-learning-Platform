import { BookOpen, Brain, ClipboardList, Loader2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/auth/layout/AppShell";
import CreateSessionModal from "../../components/session/CreateSessionModal";
import progressService from "../../services/progressService";

const StatCard = ({ label, value, icon: Icon, tone }) => (
  <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-slate-500 text-sm font-semibold uppercase tracking-wide">{label}</p>
      <div className={`h-11 w-11 rounded-xl grid place-items-center ${tone}`}>
        <Icon size={20} />
      </div>
    </div>
    <p className="mt-4 text-5xl font-bold text-slate-900">{value}</p>
  </div>
);

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const response = await progressService.getDashboardData();
        setDashboardData(response?.data || response);
      } catch (err) {
        setError(err?.error || err?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const recentItems = useMemo(() => {
    if (!dashboardData?.recentActivity) return [];
    const docs = (dashboardData.recentActivity.documents || []).map((d) => ({
      id: d._id,
      label: `Accessed Document: ${d.title}`,
      timestamp: d.lastAccessed || d.updatedAt || d.createdAt,
      type: "document",
    }));
    const quizzes = (dashboardData.recentActivity.quizzes || []).map((q) => ({
      id: q._id,
      label: `Completed Quiz: ${q.title}`,
      timestamp: q.completedAt || q.createdAt,
      type: "quiz",
    }));

    return [...docs, ...quizzes]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 6);
  }, [dashboardData]);

  const overview = dashboardData?.overview || {};

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-1">Track your learning progress and activity</p>
          </div>

          <button
            onClick={() => setIsCreateSessionOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-md"
          >
            <Users size={18} /> Create Study Session
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 flex items-center justify-center gap-3 text-slate-600">
            <Loader2 className="animate-spin" size={20} /> Loading dashboard...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <StatCard
                label="Total Documents"
                value={overview.totalDocuments || 0}
                icon={BookOpen}
                tone="bg-sky-100 text-sky-600"
              />
              <StatCard
                label="Total Flashcards"
                value={overview.totalFlashcards || 0}
                icon={Brain}
                tone="bg-fuchsia-100 text-fuchsia-600"
              />
              <StatCard
                label="Total Quizzes"
                value={overview.totalQuizzes || 0}
                icon={ClipboardList}
                tone="bg-emerald-100 text-emerald-600"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">Recent Activity</h2>
              <div className="mt-5 space-y-3">
                {recentItems.length === 0 ? (
                  <p className="text-slate-500">No activity yet.</p>
                ) : (
                  recentItems.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{item.label}</p>
                        <p className="text-sm text-slate-500">{new Date(item.timestamp).toLocaleString()}</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">View</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <CreateSessionModal
        isOpen={isCreateSessionOpen}
        onClose={() => setIsCreateSessionOpen(false)}
      />
    </AppShell>
  );
};

export default DashboardPage;