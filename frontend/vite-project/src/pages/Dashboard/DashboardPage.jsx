import { BookOpen, Brain, ClipboardList, Loader2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/auth/layout/AppShell";
import CreateSessionModal from "../../components/session/CreateSessionModal";
import progressService from "../../services/progressService";

const StatCard = ({ label, value, icon: Icon, tone }) => (
  <div className="rounded-2xl bg-white border border-slate-200 p-4 md:p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-slate-500 text-xs md:text-sm font-semibold uppercase tracking-wide">{label}</p>
      <div className={`h-10 md:h-11 w-10 md:w-11 rounded-xl grid place-items-center ${tone}`}>
        <Icon size={18} />
      </div>
    </div>
    <p className="mt-3 md:mt-4 text-3xl md:text-5xl font-bold text-slate-900">{value}</p>
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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">Track your learning progress and activity</p>
          </div>

          <button
            onClick={() => setIsCreateSessionOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-md text-sm md:text-base whitespace-nowrap"
          >
            <Users size={18} /> <span className="hidden xs:inline">Create</span> Study Session
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

            <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
              <h2 className="text-lg md:text-2xl font-semibold text-slate-900">Recent Activity</h2>
              <div className="mt-4 md:mt-5 space-y-2 md:space-y-3">
                {recentItems.length === 0 ? (
                  <p className="text-slate-500 text-sm">No activity yet.</p>
                ) : (
                  recentItems.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="border border-slate-200 rounded-xl p-3 md:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm md:text-base truncate">{item.label}</p>
                        <p className="text-xs md:text-sm text-slate-500">{new Date(item.timestamp).toLocaleString()}</p>
                      </div>
                      <span className="text-xs md:text-sm font-semibold text-emerald-600 whitespace-nowrap">View</span>
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