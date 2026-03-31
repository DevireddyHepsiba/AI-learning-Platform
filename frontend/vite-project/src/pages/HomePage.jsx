import { BookOpen, Brain, MessageSquareText, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import studyHero from "../assets/study-hero.svg";

const features = [
  {
    title: "Smart Documents",
    description: "Upload PDFs, extract concepts, and learn with structured AI-assisted guidance.",
    icon: BookOpen,
    tone: "from-cyan-500/20 to-sky-500/10 text-cyan-200",
  },
  {
    title: "Flashcards + Quizzes",
    description: "Generate active recall study sets instantly and reinforce retention with test modes.",
    icon: Brain,
    tone: "from-amber-500/20 to-orange-500/10 text-amber-200",
  },
  {
    title: "Live Collaboration",
    description: "Highlight together, take shared notes, and learn in real-time in collaborative sessions.",
    icon: Users,
    tone: "from-emerald-500/20 to-teal-500/10 text-emerald-200",
  },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.2),transparent_40%),radial-gradient(circle_at_50%_90%,rgba(245,158,11,0.16),transparent_35%)]" />

      <header className="mx-auto flex w-full max-w-none items-center justify-between px-3 md:px-4 lg:px-12 py-4 md:py-6 gap-2">
        <div className="flex items-center gap-1.5 md:gap-2 text-sm md:text-lg font-semibold tracking-tight truncate">
          <Sparkles size={16} className="text-cyan-300 flex-shrink-0" />
          <span className="truncate">AI Learning</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to="/login"
            className="rounded-lg border border-slate-500/40 px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-slate-100 hover:border-slate-300/50 whitespace-nowrap"
          >
            Login
          </Link>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20 whitespace-nowrap"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="rounded-lg bg-white px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-slate-900 hover:bg-slate-100 whitespace-nowrap"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-none px-3 md:px-4 lg:px-12 pb-8 md:pb-12 pt-6 md:pt-8">
        <section className="rounded-2xl md:rounded-3xl border border-white/10 bg-white/3 p-4 md:p-6 lg:p-12 shadow-[0_10px_50px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="grid items-center gap-6 md:gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-semibold tracking-wide text-cyan-100">
                Learn Better. Learn Together.
              </p>
              <h1 className="mt-3 md:mt-5 max-w-4xl text-2xl md:text-4xl lg:text-5xl font-bold leading-tight text-white">
                Your study cockpit for AI-powered understanding and real-time collaboration.
              </h1>
              <p className="mt-3 md:mt-5 max-w-3xl text-xs md:text-base lg:text-lg text-slate-300 line-clamp-4 md:line-clamp-none">
                Transform static PDFs into interactive learning journeys with summaries, concept explanations,
                flashcards, quizzes, and collaborative sessions where every highlight becomes shared understanding.
              </p>

              <div className="mt-4 md:mt-8 flex flex-col xs:flex-row flex-wrap items-center gap-2 md:gap-3">
                <Link
                  to={isAuthenticated ? "/dashboard" : "/register"}
                  className="w-full xs:w-auto rounded-xl bg-cyan-300 px-4 md:px-5 py-2 md:py-3 text-xs md:text-sm font-bold text-slate-900 hover:bg-cyan-200 text-center"
                >
                  {isAuthenticated ? "Go to Dashboard" : "Start Learning Free"}
                </Link>
                <Link
                  to={isAuthenticated ? "/documents" : "/login"}
                  className="w-full xs:w-auto rounded-xl border border-slate-400/40 px-4 md:px-5 py-2 md:py-3 text-xs md:text-sm font-semibold text-slate-100 hover:border-slate-200/50 text-center"
                >
                  Explore Features
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-slate-900/40 p-2 md:p-3 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <img
                src={studyHero}
                alt="Collaborative AI learning overview"
                className="h-full w-full rounded-xl object-cover"
              />
            </div>
          </div>
        </section>

        <section className="mt-6 md:mt-8 grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-white/3 p-4 md:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
              >
                <div className={`mb-3 md:mb-4 inline-flex rounded-xl bg-linear-to-br p-2.5 md:p-3 ${feature.tone}`}>
                  <Icon size={18} />
                </div>
                <h3 className="text-base md:text-xl font-semibold text-white">{feature.title}</h3>
                <p className="mt-1.5 md:mt-2 text-xs md:text-sm leading-5 md:leading-6 text-slate-300">{feature.description}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-6 md:mt-8 rounded-2xl md:rounded-3xl border border-white/10 bg-linear-to-r from-cyan-500/15 via-slate-900/20 to-emerald-500/15 p-4 md:p-6 lg:p-7">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-white">Our Motto</h2>
          <p className="mt-2 md:mt-3 text-xs md:text-base lg:text-lg text-slate-200">
            Turn every document into clarity, every doubt into discussion, and every session into progress.
          </p>
          <div className="mt-3 md:mt-5 inline-flex items-center gap-1.5 md:gap-2 rounded-lg bg-white/10 px-2.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-slate-100">
            <MessageSquareText size={14} className="text-cyan-200 flex-shrink-0" />
            <span>Think deeply. Collaborate openly. Learn continuously.</span>
          </div>
        </section>
      </main>
    </div>
  );
}
