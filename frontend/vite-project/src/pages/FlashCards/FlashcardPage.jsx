import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import AppShell from "../../components/auth/layout/AppShell";
import flashcardService from "../../services/flashcardService";

const FlashcardPage = () => {
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isStudyMode = Boolean(documentId);

  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedTracker, setReviewedTracker] = useState({});

  useEffect(() => {
    const loadSets = async () => {
      try {
        setLoading(true);
        const response = isStudyMode
          ? await flashcardService.getFlashcardsForDocument(documentId)
          : await flashcardService.getAllFlashcardSets();

        const data = response?.data || [];
        setSets(Array.isArray(data) ? data : []);

        const setFromQuery = searchParams.get("set");
        if (setFromQuery && data.some((set) => set._id === setFromQuery)) {
          setSelectedSetId(setFromQuery);
        } else if (data.length > 0) {
          setSelectedSetId(data[0]._id);
        }
      } catch (error) {
        toast.error(error?.error || error?.message || "Failed to load flashcards");
      } finally {
        setLoading(false);
      }
    };

    loadSets();
  }, [documentId, isStudyMode, searchParams]);

  const selectedSet = useMemo(
    () => sets.find((set) => set._id === selectedSetId) || null,
    [sets, selectedSetId]
  );

  const selectedCard = selectedSet?.cards?.[currentIndex] || null;

  const calculateProgress = (set) => {
    const reviewed = set.cards.filter((card) => (card.reviewCount || 0) > 0).length;
    const total = set.cards.length || 1;
    const percentage = Math.round((reviewed / total) * 100);
    return { reviewed, total: set.cards.length || 0, percentage };
  };

  const handleStudySet = (set) => {
    const docId = typeof set.documentId === "object" ? set.documentId?._id : set.documentId;
    if (!docId) {
      toast.error("Document id is missing for this set");
      return;
    }
    navigate(`/documents/${docId}/flashcards?set=${set._id}`);
  };

  const markReviewedIfNeeded = async () => {
    if (!selectedCard?._id) return;
    const key = `${selectedSetId}-${selectedCard._id}`;
    if (reviewedTracker[key]) return;

    try {
      await flashcardService.reviewFlashcard(selectedCard._id, currentIndex);
      setReviewedTracker((prev) => ({ ...prev, [key]: true }));

      setSets((prev) =>
        prev.map((set) => {
          if (set._id !== selectedSetId) return set;
          return {
            ...set,
            cards: set.cards.map((card) =>
              card._id === selectedCard._id
                ? { ...card, reviewCount: (card.reviewCount || 0) + 1, lastReviewed: new Date().toISOString() }
                : card
            ),
          };
        })
      );
    } catch {
      toast.error("Failed to mark review");
    }
  };

  const handleReveal = async () => {
    setShowAnswer(true);
    await markReviewedIfNeeded();
  };

  const handleToggleStar = async () => {
    if (!selectedCard?._id) return;
    try {
      await flashcardService.toggleStar(selectedCard._id);
      setSets((prev) =>
        prev.map((set) => {
          if (set._id !== selectedSetId) return set;
          return {
            ...set,
            cards: set.cards.map((card) =>
              card._id === selectedCard._id ? { ...card, isStarred: !card.isStarred } : card
            ),
          };
        })
      );
    } catch {
      toast.error("Failed to update star");
    }
  };

  const handleDeleteSet = async () => {
    if (!selectedSet?._id) return;
    try {
      await flashcardService.deleteFlashcardSet(selectedSet._id);
      toast.success("Flashcard set deleted");
      if (isStudyMode) {
        navigate("/flashcards");
      } else {
        setSets((prev) => prev.filter((set) => set._id !== selectedSet._id));
      }
    } catch {
      toast.error("Failed to delete set");
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-slate-200 bg-white p-12 flex items-center justify-center gap-3 text-slate-600">
          <Loader2 className="animate-spin" size={20} /> Loading flashcards...
        </div>
      </AppShell>
    );
  }

  if (!isStudyMode) {
    return (
      <AppShell>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold">Flashcards</h1>

          {sets.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-slate-500">
              No flashcard sets yet. Generate a set from document details.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {sets.map((set) => {
                const progress = calculateProgress(set);
                const title =
                  typeof set.documentId === "object" ? set.documentId?.title : "Flashcard Set";

                return (
                  <div key={set._id} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-300 hover:shadow-sm transition-all">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 grid place-items-center">
                      <BookOpen size={22} />
                    </div>

                    <h3 className="mt-4 text-2xl font-semibold leading-tight line-clamp-2">{title || "Flashcard Set"}</h3>
                    <p className="text-sm text-slate-500 mt-1 uppercase">Created {new Date(set.createdAt).toLocaleString()}</p>

                    <div className="mt-4 flex items-center gap-2 text-sm">
                      <span className="px-3 py-1 rounded-lg border border-slate-200 bg-slate-50">{progress.total} Cards</span>
                      <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-medium">{progress.percentage}%</span>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <span>Progress</span>
                        <span>{progress.reviewed}/{progress.total} reviewed</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 mt-2 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${progress.percentage}%` }} />
                      </div>
                    </div>

                    <button
                      onClick={() => handleStudySet(set)}
                      className="mt-5 w-full py-3 rounded-xl bg-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-200"
                    >
                      Study Now
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  if (!selectedSet || !selectedCard) {
    return (
      <AppShell>
        <div className="space-y-4">
          <button onClick={() => navigate("/flashcards")} className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600">
            <ArrowLeft size={18} /> Back to Flashcards
          </button>
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-slate-500">No flashcard set found for this document.</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(`/documents/${documentId}`)}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600"
          >
            <ArrowLeft size={18} /> Back to Document
          </button>

          <button
            onClick={handleDeleteSet}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
          >
            <Trash2 size={16} /> Delete Set
          </button>
        </div>

        <h1 className="text-4xl font-bold">Flashcards</h1>

        <div className="max-w-xl mx-auto rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 uppercase">{selectedCard.difficulty || "medium"}</span>
            <button onClick={handleToggleStar} className={`p-2 rounded-lg ${selectedCard.isStarred ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
              <Star size={16} fill={selectedCard.isStarred ? "currentColor" : "none"} />
            </button>
          </div>

          <p className="mt-12 text-3xl font-semibold leading-relaxed">{selectedCard.question}</p>

          {showAnswer ? (
            <div className="mt-8 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-lg">
              {selectedCard.answer}
            </div>
          ) : (
            <button onClick={handleReveal} className="mt-10 text-slate-500 hover:text-emerald-600">Click to reveal answer</button>
          )}
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => {
              setShowAnswer(false);
              setCurrentIndex((prev) => Math.max(prev - 1, 0));
            }}
            disabled={currentIndex === 0}
            className="px-5 py-2.5 rounded-xl border border-slate-300 disabled:opacity-50"
          >
            Previous
          </button>

          <span className="text-slate-600 font-medium">{currentIndex + 1} / {selectedSet.cards.length}</span>

          <button
            onClick={() => {
              setShowAnswer(false);
              setCurrentIndex((prev) => Math.min(prev + 1, selectedSet.cards.length - 1));
            }}
            disabled={currentIndex >= selectedSet.cards.length - 1}
            className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-800 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </AppShell>
  );
};

export default FlashcardPage;