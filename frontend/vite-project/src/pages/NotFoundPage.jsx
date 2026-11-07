import { ArrowLeft, BrainCircuit, Search } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <Link to="/" className="brand-lockup not-found-brand"><span className="brand-mark"><BrainCircuit size={19}/></span><span className="brand-name">morrow<span>.</span></span></Link>
      <div className="not-found-content">
        <span className="not-found-icon"><Search size={24}/></span>
        <p className="eyebrow"><span className="eyebrow-dot"/> A SMALL DETOUR</p>
        <h1>This page wandered off.</h1>
        <p>We couldn’t find what you were looking for. Let’s take you back to your learning space.</p>
        <Link to="/" className="button button-dark"><ArrowLeft size={16}/> Back to Morrow</Link>
      </div>
      <span className="not-found-note">404 · A page for the curious</span>
    </main>
  );
}
