import {
  ArrowDownRight,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  CirclePlay,
  FileText,
  Layers3,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const features = [
  {
    number: "01",
    title: "Understand the hard parts",
    description: "Ask questions against your own material and get clear, source-aware explanations.",
    icon: BrainCircuit,
    color: "lavender",
  },
  {
    number: "02",
    title: "Remember what matters",
    description: "Turn reading into active recall with focused flashcards and quick quizzes.",
    icon: Layers3,
    color: "mint",
  },
  {
    number: "03",
    title: "Make progress together",
    description: "Bring people into a shared study room with synced pages, notes, and highlights.",
    icon: UsersRound,
    color: "peach",
  },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing-page min-h-screen text-ink">
      <header className="landing-nav mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-14">
        <Link to="/" className="brand-lockup" aria-label="Morrow home">
          <span className="brand-mark"><BrainCircuit size={20} strokeWidth={2.2} /></span>
          <span className="brand-name">morrow<span>.</span></span>
        </Link>

        <nav className="hidden items-center gap-9 text-sm font-semibold text-ink/65 md:flex" aria-label="Main navigation">
          <a href="#how-it-works" className="nav-link">How it works</a>
          <a href="#features" className="nav-link">Features</a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <Link to="/dashboard" className="button button-dark button-small">Open workspace <ArrowRight size={15} /></Link>
          ) : (
            <>
              <Link to="/login" className="nav-login">Log in</Link>
              <Link to="/register" className="button button-dark button-small">Get started <ArrowRight size={15} /></Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero-wrap mx-auto max-w-[1440px] px-5 pb-16 pt-7 sm:px-8 sm:pt-12 lg:px-14 lg:pb-24">
          <div className="hero-panel relative overflow-hidden rounded-[2rem] px-6 py-9 sm:px-10 sm:py-12 lg:grid lg:min-h-[570px] lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:gap-6 lg:px-[5.4rem] lg:py-16">
            <div className="hero-orb hero-orb-one" />
            <div className="hero-orb hero-orb-two" />
            <div className="relative z-10 max-w-[650px]">
              <div className="eyebrow eyebrow-light"><Sparkles size={14} /> A calmer way to learn</div>
              <h1 className="hero-title mt-6 text-[clamp(3.2rem,7.4vw,6.8rem)] font-semibold leading-[.91] tracking-[-.075em] text-white">
                Make room<br />for <span className="hero-title-accent">aha.</span>
              </h1>
              <p className="mt-7 max-w-[490px] text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
                Your notes, an AI study partner, and your people — together in one space built for understanding.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={isAuthenticated ? "/dashboard" : "/register"} className="button button-lime">
                  {isAuthenticated ? "Go to your workspace" : "Start learning free"}<ArrowRight size={17} />
                </Link>
                <a href="#how-it-works" className="button button-glass"><CirclePlay size={17} /> See how it works</a>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/60 sm:text-sm">
                {["Your own materials", "Study at your pace", "Learn with friends"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2"><Check size={14} className="text-lime" />{item}</span>
                ))}
              </div>
            </div>

            <div className="hero-product relative z-10 mx-auto mt-12 w-full max-w-[500px] lg:mt-0 lg:translate-x-5">
              <div className="product-window">
                <div className="product-topbar">
                  <div className="flex gap-1.5"><i /><i /><i /></div>
                  <span>YOUR LEARNING SPACE</span>
                  <span className="product-avatar">S</span>
                </div>
                <div className="product-content">
                  <div className="product-greeting">
                    <span className="product-kicker">TUESDAY, STUDY DAY</span>
                    <h2>A little progress<br />goes a long way.</h2>
                    <p>Pick up right where your curiosity left off.</p>
                  </div>
                  <div className="product-streak"><span className="streak-spark">✳</span><strong>4 days</strong><small>of showing up</small></div>
                  <div className="product-lesson">
                    <div className="lesson-icon"><FileText size={18} /></div>
                    <div className="min-w-0 flex-1"><small>CONTINUE READING</small><strong>How memory really works</strong><span>Chapter 03 · 8 min left</span></div>
                    <ArrowDownRight size={17} className="text-slate-400" />
                  </div>
                  <div className="product-bottom">
                    <div><span className="mini-label">YOUR WEEK</span><div className="week-bars"><i /><i /><i /><i /><i /><i /><i /></div><div className="week-days"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div></div>
                    <div className="product-progress"><span className="mini-label">FOCUS TIME</span><strong>2<span>h</span> 40<span>m</span></strong><small>↑ 18% this week</small></div>
                  </div>
                </div>
              </div>
              <div className="float-note float-note-top"><span className="float-note-icon"><Sparkles size={15} /></span><span><strong>Your AI study buddy</strong><small>Ready when you are</small></span><i className="online-dot" /></div>
              <div className="float-note float-note-bottom"><span className="avatar-stack"><i>J</i><i>A</i><i>M</i></span><span><strong>Better together</strong><small>Your group is studying</small></span></div>
            </div>
          </div>
          <div className="hero-footnote"><span>BUILT FOR CURIOUS MINDS</span><span>Less cramming. More getting it.</span></div>
        </section>

        <section id="how-it-works" className="story-section mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-14 lg:py-24">
          <div className="section-heading grid gap-5 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
            <div><div className="eyebrow"><span className="eyebrow-dot" /> THE MORROW METHOD</div><h2 className="section-title mt-5">From “I read it”<br />to <em>“I get it.”</em></h2></div>
            <p className="max-w-[510px] pb-2 text-base leading-7 text-muted lg:justify-self-end lg:text-lg">Learning clicks when the right tools come together. Morrow turns what you already have into a study flow that feels clear, focused, and yours.</p>
          </div>
          <div className="method-grid mt-12 grid gap-3 md:grid-cols-3 lg:mt-16">
            {[
              { step: "01", title: "Bring your material", text: "Start with the PDFs and documents you already use. Your library stays organized and easy to pick back up.", icon: BookOpen, tone: "method-lavender" },
              { step: "02", title: "Make it make sense", text: "Ask questions, explore tricky ideas, and turn your source material into a summary that feels approachable.", icon: BrainCircuit, tone: "method-lime" },
              { step: "03", title: "Keep the momentum", text: "Practice with flashcards and quizzes, or invite a friend into a live study session.", icon: UsersRound, tone: "method-peach" },
            ].map((item) => {
              const Icon = item.icon;
              return <article key={item.step} className="method-card"><div className="flex items-center justify-between"><span className="method-step">{item.step} / 03</span><span className={`method-icon ${item.tone}`}><Icon size={20} /></span></div><h3>{item.title}</h3><p>{item.text}</p></article>;
            })}
          </div>
        </section>

        <section id="features" className="feature-section mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-14 lg:py-20">
          <div className="feature-banner relative overflow-hidden rounded-[2rem] p-7 sm:p-10 lg:p-14">
            <div className="feature-banner-glow" />
            <div className="relative z-10 grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
              <div><div className="eyebrow eyebrow-light"><Sparkles size={14} /> THE WHOLE PICTURE</div><h2 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.02] tracking-[-.055em] text-white sm:text-5xl">One place for the way you learn.</h2><p className="mt-5 max-w-md text-base leading-7 text-white/65">Thoughtful tools, all connected to the things you are learning right now.</p></div>
              <div className="grid gap-2 sm:grid-cols-3">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return <article key={feature.number} className="feature-tile"><div className={`feature-icon feature-${feature.color}`}><Icon size={19} /></div><span>{feature.number}</span><h3>{feature.title}</h3><p>{feature.description}</p></article>;
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="closing-section mx-auto max-w-[1440px] px-5 pb-20 pt-10 text-center sm:px-8 lg:px-14 lg:pb-28 lg:pt-20">
          <span className="closing-mark"><Sparkles size={17} /></span>
          <p className="eyebrow justify-center">YOUR NEXT CHAPTER STARTS HERE</p>
          <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-.06em] text-ink sm:text-6xl">Curiosity looks good on you.</h2>
          <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-muted">Make a little space for the things you have been meaning to understand.</p>
          <Link to={isAuthenticated ? "/dashboard" : "/register"} className="button button-dark mt-8">{isAuthenticated ? "Return to your workspace" : "Make your free account"}<ArrowRight size={16} /></Link>
        </section>
      </main>

      <footer className="landing-footer mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-muted sm:flex-row sm:px-8 lg:px-14"><Link to="/" className="brand-lockup brand-lockup-small"><span className="brand-mark"><BrainCircuit size={15} /></span><span className="brand-name">morrow<span>.</span></span></Link><span>Make room for aha. © {new Date().getFullYear()} Morrow Learning</span><span>Made for the curious</span></footer>
    </div>
  );
}
