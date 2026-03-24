import { ArrowLeft, CheckCircle2, Loader2, XCircle, Check, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../../components/auth/layout/AppShell";
import quizService from "../../services/quizService";

const QuizResultpage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        setLoading(true);
        const response = await quizService.getQuizResults(quizId);
        setResultData(response?.data || null);
      } catch (err) {
        setError(err?.error || err?.message || "Failed to load quiz result");
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [quizId]);

  const quiz = resultData?.quiz;
  const results = resultData?.results || [];

  const metrics = useMemo(() => {
    const total = results.length;
    const correct = results.filter((item) => item.isCorrect).length;
    return { total, correct, incorrect: Math.max(total - correct, 0) };
  }, [results]);

  if (loading) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-slate-200 bg-white p-12 flex items-center justify-center gap-3 text-slate-600">
          <Loader2 className="animate-spin" size={20} /> Loading quiz results...
        </div>
      </AppShell>
    );
  }

  if (error || !quiz) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error || "Result not found"}</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          onClick={() => navigate("/documents")}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600"
        >
          <ArrowLeft size={18} /> Back to Document
        </button>

        <h1 className="text-4xl font-bold">{quiz.title} - Quiz Results</h1>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-500 font-semibold uppercase tracking-wide">Your Score</p>
          <p className={`text-7xl font-bold mt-2 ${quiz.score >= 70 ? "text-emerald-600" : "text-rose-600"}`}>{quiz.score}%</p>
          <p className="text-slate-500 mt-2">{quiz.score >= 70 ? "Great work!" : "Keep practicing!"}</p>

          <div className="mt-6 flex justify-center gap-3">
            <span className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700">{metrics.total} Total</span>
            <span className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700">{metrics.correct} Correct</span>
            <span className="px-4 py-2 rounded-xl bg-rose-100 text-rose-700">{metrics.incorrect} Incorrect</span>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Detailed Review</h2>

          {results.map((item, index) => (
            <div key={item.questionIndex} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold">Question {index + 1}</span>
                {item.isCorrect ? (
                  <CheckCircle2 className="text-emerald-600" size={20} />
                ) : (
                  <XCircle className="text-rose-600" size={20} />
                )}
              </div>

              <p className="mt-4 text-2xl font-semibold">{item.question}</p>

              <div className="mt-4 space-y-2">
                {item.options.map((option) => {
                  const isSelected = item.selectedAnswer === option;
                  const isCorrect = item.correctAnswer === option;
                  
                  return (
                    <div
                      key={option}
                      className={`rounded-xl border-2 px-4 py-3 transition-all ${
                        isCorrect
                          ? "border-emerald-500 bg-emerald-100"
                          : isSelected && !isCorrect
                          ? "border-rose-500 bg-rose-100"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={`font-bold ${isCorrect ? "text-emerald-800" : isSelected && !isCorrect ? "text-rose-800" : "text-slate-700"}`}>
                          {option}
                        </span>
                        <div className="flex items-center gap-2">
                          {isCorrect && (
                            <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 text-white">
                              <Check size={16} />
                              <span className="text-xs font-bold">Correct Answer</span>
                            </div>
                          )}
                          {isSelected && !isCorrect && (
                            <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-500 text-white">
                              <X size={16} />
                              <span className="text-xs font-bold">Your Answer</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {item.explanation && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Explanation</p>
                  <p className="mt-2 text-slate-700">{item.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
};

export default QuizResultpage;