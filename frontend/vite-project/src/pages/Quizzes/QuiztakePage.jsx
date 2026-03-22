import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import AppShell from "../../components/auth/layout/AppShell";
import quizService from "../../services/quizService";

const QuiztakePage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        setLoading(true);
        const response = await quizService.getQuizById(quizId);
        setQuiz(response?.data || null);
      } catch (err) {
        setError(err?.error || err?.message || "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [quizId]);

  const question = quiz?.questions?.[currentIndex];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const handleSubmitQuiz = async () => {
    if (!quiz) return;

    const payload = Object.entries(answers).map(([questionIndex, selectedAnswer]) => ({
      questionIndex: Number(questionIndex),
      selectedAnswer,
    }));

    if (payload.length === 0) {
      toast.error("Please answer at least one question before submitting");
      return;
    }

    try {
      setSubmitting(true);
      await quizService.submitQuiz(quizId, payload);
      toast.success("Quiz submitted successfully!");
      navigate(`/quizzes/${quizId}/results`);
    } catch (err) {
      toast.error(err?.error || err?.message || "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-slate-200 bg-white p-12 flex items-center justify-center gap-3 text-slate-600">
          <Loader2 className="animate-spin" size={20} /> Loading quiz...
        </div>
      </AppShell>
    );
  }

  if (error || !quiz) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error || "Quiz not found"}</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold">{quiz.title}</h1>

        <div className="flex items-center justify-between text-slate-600">
          <p className="font-medium">Question {currentIndex + 1} of {quiz.questions.length}</p>
          <p>{answeredCount} answered</p>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${((currentIndex + 1) / quiz.questions.length) * 100}%` }} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="inline-flex px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-semibold">
            Question {currentIndex + 1}
          </p>
          <h2 className="mt-4 text-3xl font-semibold">{question.question}</h2>

          <div className="mt-6 space-y-3">
            {question.options.map((option) => {
              const isSelected = answers[currentIndex] === option;
              return (
                <button
                  key={option}
                  onClick={() => setAnswers((prev) => ({ ...prev, [currentIndex]: option }))}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-300 hover:border-emerald-300"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 disabled:opacity-50"
          >
            <ArrowLeft size={16} /> Previous
          </button>

          <div className="flex items-center gap-2">
            {quiz.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-9 w-9 rounded-lg text-sm font-semibold ${
                  currentIndex === index
                    ? "bg-emerald-500 text-white"
                    : answers[index]
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentIndex < quiz.questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, quiz.questions.length - 1))}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white"
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmitQuiz}
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-emerald-500 text-white font-semibold disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Quiz"}
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default QuiztakePage;