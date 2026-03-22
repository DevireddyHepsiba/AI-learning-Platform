import {
  ArrowLeft,
  BookOpen,
  Brain,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import AppShell from "../../components/auth/layout/AppShell";
import documentService from "../../services/documentationService";
import flashcardService from "../../services/flashcardService";
import quizService from "../../services/quizService";
import {
  chat as askChat,
  explainConcept,
  generateFlashcards,
  generateQuiz,
  generateSummary,
  getChatHistory,
} from "../../services/aiService";

import { BASE_URL } from "../../utils/apiPath";

const tabs = ["content", "chat", "ai", "flashcards", "quizzes"];

const DocumentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [documentData, setDocumentData] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(
    tabs.includes(searchParams.get("tab")) ? searchParams.get("tab") : "content"
  );

  const [chatItems, setChatItems] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [summaryText, setSummaryText] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [concept, setConcept] = useState("");
  const [conceptLoading, setConceptLoading] = useState(false);
  const [conceptAnswer, setConceptAnswer] = useState("");

  const [flashcardSets, setFlashcardSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [flashcardLoading, setFlashcardLoading] = useState(false);

  const [quizzes, setQuizzes] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizCount, setQuizCount] = useState(5);
  const [showDebug, setShowDebug] = useState(false);

  const isDocumentReady = documentData?.status === "ready";
  const readinessMessage = "Document is still processing. Please wait until status becomes ready.";

  // Construct proper file URL
  const fileUrl = useMemo(() => {
    if (!documentData) return "";
    
    // Try multiple possible field names
    const filePath = 
      documentData.filePath || 
      documentData.filename || 
      documentData.file || 
      documentData.url || 
      documentData.fileUrl;
    
    if (!filePath) return "";
    
    // If already a full URL, return as-is
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      return filePath;
    }
    
    // If it's just a filename (no path separators), construct the path
    if (!filePath.includes("/")) {
      return `${BASE_URL}/uploads/documents/${filePath}`;
    }
    
    // If relative path, prepend BASE_URL
    if (filePath.startsWith("/")) {
      return `${BASE_URL}${filePath}`;
    }
    
    // Otherwise, assume it needs /uploads/documents/ prefix
    return `${BASE_URL}/uploads/documents/${filePath}`;
  }, [documentData]);

  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", activeTab);
      return next;
    });
  }, [activeTab, setSearchParams]);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        const response = await documentService.getDocumentById(id);
        // Handle different response structures
        const docData = response?.data || response?.data?.data || response;
        
        // Normalize the response - extract document from nested structure if needed
        const normalizedData = docData?.data ? docData.data : docData;
        
        setDocumentData(normalizedData);
      } catch (err) {
        setError(err?.error || err?.message || "Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [id]);

  useEffect(() => {
    if (activeTab === "chat") {
      (async () => {
        try {
          const response = await getChatHistory(id);
          const history = response?.data || [];
          const mapped = history
            .flatMap((session) => session.messages || [])
            .map((msg, idx) => ({
              id: `${msg.timestamp || idx}-${idx}`,
              role: msg.role,
              content: msg.content,
            }));
          setChatItems(mapped);
        } catch {
          setChatItems([]);
        }
      })();
    }

    if (activeTab === "flashcards") {
      loadFlashcards();
    }

    if (activeTab === "quizzes") {
      loadQuizzes();
    }
  }, [activeTab, id]);

  const selectedSet = useMemo(
    () => flashcardSets.find((set) => set._id === selectedSetId) || null,
    [flashcardSets, selectedSetId]
  );

  const selectedCard = selectedSet?.cards?.[flashcardIndex] || null;

  const loadFlashcards = async () => {
    try {
      setFlashcardLoading(true);
      const response = await flashcardService.getFlashcardsForDocument(id);
      const sets = response?.data || [];
      setFlashcardSets(sets);
      if (sets.length > 0) {
        setSelectedSetId(sets[0]._id);
      }
    } catch {
      setFlashcardSets([]);
    } finally {
      setFlashcardLoading(false);
    }
  };

  const loadQuizzes = async () => {
    try {
      setQuizLoading(true);
      const response = await quizService.getQuizzesForDocument(id);
      setQuizzes(response?.data || []);
    } catch {
      setQuizzes([]);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleChatSubmit = async (event) => {
    event.preventDefault();
    const question = chatInput.trim();
    if (!question || chatLoading) return;

    if (!isDocumentReady) {
      toast.error(readinessMessage);
      return;
    }

    setChatLoading(true);
    setChatItems((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: question }]);
    setChatInput("");

    try {
      const response = await askChat(id, question);
      const messages = response?.data?.messages || [];
      const assistantMessage = [...messages].reverse().find((m) => m.role === "assistant");

      setChatItems((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: assistantMessage?.content || "I could not generate a response right now.",
        },
      ]);
    } catch (err) {
      toast.error(err?.error || err?.message || "Chat failed");
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!isDocumentReady) {
      toast.error(readinessMessage);
      return;
    }

    try {
      setSummaryLoading(true);
      const data = await generateSummary(id);
      setSummaryText(data?.summary || "No summary available.");
      setSummaryOpen(true);
    } catch (err) {
      toast.error(err?.error || err?.message || "Summary generation failed");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleExplainConcept = async () => {
    if (!concept.trim()) {
      toast.error("Enter a concept first");
      return;
    }

    if (!isDocumentReady) {
      toast.error(readinessMessage);
      return;
    }

    try {
      setConceptLoading(true);
      const data = await explainConcept(id, concept.trim());
      setConceptAnswer(data?.explanation || "No explanation found.");
    } catch (err) {
      toast.error(err?.error || err?.message || "Explain concept failed");
    } finally {
      setConceptLoading(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!isDocumentReady) {
      toast.error(readinessMessage);
      return;
    }

    try {
      await generateFlashcards(id, { count: 10 });
      toast.success("Flashcards generated");
      await loadFlashcards();
    } catch (err) {
      toast.error(err?.error || err?.message || "Flashcard generation failed");
    }
  };

  const handleGenerateQuiz = async () => {
    if (!isDocumentReady) {
      toast.error(readinessMessage);
      return;
    }

    try {
      await generateQuiz(id, { count: Number(quizCount) || 5 });
      toast.success("Quiz generated");
      setIsQuizModalOpen(false);
      await loadQuizzes();
    } catch (err) {
      toast.error(err?.error || err?.message || "Quiz generation failed");
    }
  };

  const handleToggleStar = async () => {
    if (!selectedCard?._id) return;
    try {
      await flashcardService.toggleStar(selectedCard._id);
      setFlashcardSets((prev) =>
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
      toast.error("Unable to update flashcard");
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-slate-200 bg-white p-12 flex items-center justify-center gap-3 text-slate-600">
          <Loader2 className="animate-spin" size={20} /> Loading document...
        </div>
      </AppShell>
    );
  }

  if (error || !documentData) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error || "Document not found"}</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <button
          onClick={() => navigate("/documents")}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-600"
        >
          <ArrowLeft size={18} /> Back to Documents
        </button>

        <div className="flex items-center gap-3">
          <h1 className="text-5xl font-bold leading-tight">{documentData.title}</h1>
          <span
            className={`px-3 py-1 rounded-lg text-sm font-semibold ${
              isDocumentReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {documentData.status || "unknown"}
          </span>
        </div>

        {/* Debug Panel */}
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-slate-400 hover:text-slate-600 underline"
        >
          {showDebug ? "Hide Debug Info" : "Show Debug Info"}
        </button>
        {showDebug && (
          <div className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs overflow-auto max-h-40">
            <pre>{JSON.stringify({ documentData, fileUrl }, null, 2)}</pre>
          </div>
        )}

        <div className="border-b border-slate-200 flex gap-6 text-lg">
          {tabs.map((tab) => {
            const labels = {
              content: "Content",
              chat: "Chat",
              ai: "AI Actions",
              flashcards: "Flashcards",
              quizzes: "Quizzes",
            };

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-emerald-500 text-emerald-600 font-semibold"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {activeTab === "content" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-lg font-semibold">Document Viewer</p>
              <a href={fileUrl} target="_blank" rel="noreferrer" className="text-emerald-600 font-medium">
                Open in new tab
              </a>
            </div>

            {!isDocumentReady ? (
              <div className="w-full h-[40vh] rounded-xl border border-amber-200 bg-amber-50 grid place-items-center text-amber-800 text-center p-6">
                <div>
                  <p className="text-xl font-semibold">Document is processing</p>
                  <p className="mt-2">AI actions and preview will work after processing is complete.</p>
                </div>
              </div>
            ) : fileUrl ? (
              <iframe
                title="Document Viewer"
                src={fileUrl}
                className="w-full h-[70vh] rounded-xl border border-slate-200"
                onError={() => {
                  console.error("iframe error loading:", fileUrl);
                  toast.error("Could not load document PDF. Click 'Open in new tab' to download.");
                }}
              />
            ) : (
              <div className="w-full h-[70vh] rounded-xl border border-slate-200 bg-slate-50 grid place-items-center text-slate-500">
                <div className="text-center">
                  <FileText className="mx-auto mb-2" size={32} />
                  <p>No document file available</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="h-[55vh] overflow-auto border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
              {chatItems.length === 0 ? (
                <div className="h-full grid place-items-center text-center text-slate-500">
                  <div>
                    <MessageSquare className="mx-auto mb-3" size={32} />
                    <p className="text-xl font-semibold text-slate-700">Start a conversation</p>
                    <p>Ask me anything about the document.</p>
                  </div>
                </div>
              ) : (
                chatItems.map((item) => (
                  <div key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-3xl rounded-2xl px-4 py-3 ${
                        item.role === "user"
                          ? "bg-emerald-500 text-white"
                          : "bg-white border border-slate-200 text-slate-800"
                      }`}
                    >
                      {item.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="mt-4 flex gap-3">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500"
                placeholder="Ask a follow-up question..."
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="px-5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60"
              >
                {chatLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </form>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
            <div className="rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-sky-100 text-sky-600 grid place-items-center"><BookOpen size={22} /></div>
                <div>
                  <p className="text-2xl font-semibold">Generate Summary</p>
                  <p className="text-slate-500">Get a concise summary of the entire document.</p>
                </div>
              </div>
              <button
                onClick={handleGenerateSummary}
                disabled={summaryLoading}
                className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-60"
              >
                {summaryLoading ? "Summarizing..." : "Summarize"}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 grid place-items-center"><Sparkles size={22} /></div>
                <div>
                  <p className="text-2xl font-semibold">Explain a Concept</p>
                  <p className="text-slate-500">Enter a topic from this document to get detailed explanation.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  value={concept}
                  onChange={(event) => setConcept(event.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500"
                  placeholder="e.g. React Hooks"
                />
                <button
                  onClick={handleExplainConcept}
                  disabled={conceptLoading}
                  className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-60"
                >
                  {conceptLoading ? "Explaining..." : "Explain"}
                </button>
              </div>

              {conceptAnswer && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 whitespace-pre-wrap">{conceptAnswer}</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "flashcards" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            {flashcardLoading ? (
              <div className="py-14 flex items-center justify-center gap-3 text-slate-600"><Loader2 className="animate-spin" size={20} /> Loading flashcards...</div>
            ) : flashcardSets.length === 0 ? (
              <div className="py-14 text-center">
                <Brain className="mx-auto text-emerald-500" size={36} />
                <h3 className="mt-4 text-3xl font-semibold">No Flashcards Yet</h3>
                <p className="text-slate-500 mt-2">Generate flashcards from your document to start learning.</p>
                <button onClick={handleGenerateFlashcards} className="mt-6 px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600">Generate Flashcards</button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl font-semibold">Your Flashcard Sets</h3>
                  <button onClick={handleGenerateFlashcards} className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600">Generate New Set</button>
                </div>

                {!selectedSet ? (
                  <div className="text-slate-500">Select a set to continue.</div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 p-6 bg-emerald-50/30">
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={() => setSelectedSetId(null)} className="text-slate-600 hover:text-emerald-600">Back to Sets</button>
                      <span className="text-sm text-slate-500">{flashcardIndex + 1} / {selectedSet.cards.length}</span>
                    </div>

                    {selectedCard && (
                      <div className="rounded-2xl border border-slate-200 bg-linear-to-b from-emerald-50/40 to-white p-8 text-center">
                        <div className="flashcard-stage mx-auto max-w-3xl">
                          <div className={`flashcard-flip ${showAnswer ? "is-flipped" : ""}`}>
                            <article className="flashcard-face flashcard-front rounded-3xl border border-emerald-200 bg-linear-to-br from-emerald-100 to-cyan-100 p-8 text-left shadow-lg">
                              <p className="inline-flex rounded-full bg-emerald-900/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-900">
                                {selectedCard.difficulty}
                              </p>
                              <h4 className="mt-6 text-3xl font-bold leading-tight text-slate-900">{selectedCard.question}</h4>
                              <button
                                onClick={() => setShowAnswer(true)}
                                className="mt-8 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                              >
                                Show Answer
                              </button>
                            </article>

                            <article className="flashcard-face flashcard-back rounded-3xl border border-violet-200 bg-linear-to-br from-violet-100 to-fuchsia-100 p-8 text-left shadow-lg">
                              <p className="inline-flex rounded-full bg-violet-900/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-900">
                                Answer
                              </p>
                              <p className="mt-6 text-2xl font-semibold leading-relaxed text-slate-900">{selectedCard.answer}</p>
                              <button
                                onClick={() => setShowAnswer(false)}
                                className="mt-8 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                              >
                                Back to Question
                              </button>
                            </article>
                          </div>
                        </div>

                        <div className="mt-8 flex items-center justify-center gap-3">
                          <button
                            onClick={() => {
                              setShowAnswer(false);
                              setFlashcardIndex((prev) => Math.max(prev - 1, 0));
                            }}
                            className="px-4 py-2 rounded-xl border border-slate-300"
                          >
                            Previous
                          </button>
                          <button
                            onClick={handleToggleStar}
                            className={`px-4 py-2 rounded-xl border ${selectedCard.isStarred ? "bg-amber-100 border-amber-300" : "border-slate-300"}`}
                          >
                            {selectedCard.isStarred ? "Starred" : "Star"}
                          </button>
                          <button
                            onClick={() => {
                              setShowAnswer(false);
                              setFlashcardIndex((prev) => Math.min(prev + 1, selectedSet.cards.length - 1));
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!selectedSet && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {flashcardSets.map((set) => (
                      <button
                        key={set._id}
                        onClick={() => {
                          setSelectedSetId(set._id);
                          setFlashcardIndex(0);
                          setShowAnswer(false);
                        }}
                        className="rounded-2xl border border-emerald-200 bg-white p-5 text-left hover:shadow-sm"
                      >
                        <p className="text-xl font-semibold">Flashcard Set</p>
                        <p className="text-sm text-slate-500 mt-1">Created {new Date(set.createdAt).toDateString()}</p>
                        <p className="mt-4 inline-flex px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-medium">{set.cards.length} cards</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "quizzes" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-3xl font-semibold">Quizzes</h3>
              <button
                onClick={() => setIsQuizModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
              >
                Generate Quiz
              </button>
            </div>

            {quizLoading ? (
              <div className="py-12 flex items-center justify-center gap-3 text-slate-600"><Loader2 className="animate-spin" size={20} /> Loading quizzes...</div>
            ) : quizzes.length === 0 ? (
              <div className="py-12 text-center text-slate-500">No quizzes available yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizzes.map((quiz) => (
                  <div key={quiz._id} className="rounded-2xl border border-emerald-200 bg-white p-5">
                    <p className="inline-flex px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-sm">Score: {quiz.score || 0}</p>
                    <p className="mt-4 text-2xl font-semibold">{quiz.title}</p>
                    <p className="text-sm text-slate-500">Created {new Date(quiz.createdAt).toDateString()}</p>
                    <p className="mt-3 inline-flex px-3 py-1 rounded-lg bg-slate-100 text-slate-700">{quiz.totalQuestions} Questions</p>

                    <div className="mt-5">
                      {quiz.completedAt ? (
                        <button
                          onClick={() => navigate(`/quizzes/${quiz._id}/results`)}
                          className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200"
                        >
                          View Results
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/quizzes/${quiz._id}`)}
                          className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
                        >
                          Start Quiz
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {summaryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-7 relative max-h-[80vh] overflow-auto">
            <button onClick={() => setSummaryOpen(false)} className="absolute right-5 top-5 p-2 rounded-lg hover:bg-slate-100">
              <X size={20} />
            </button>
            <h2 className="text-3xl font-bold">Generated Summary</h2>
            <p className="mt-4 whitespace-pre-wrap text-lg text-slate-700">{summaryText}</p>
          </div>
        </div>
      )}

      {isQuizModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-7 relative">
            <button onClick={() => setIsQuizModalOpen(false)} className="absolute right-5 top-5 p-2 rounded-lg hover:bg-slate-100">
              <X size={20} />
            </button>
            <h2 className="text-3xl font-bold">Generate New Quiz</h2>
            <p className="text-slate-500 mt-1">Choose number of questions</p>

            <div className="mt-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Number of Questions</label>
              <input
                type="number"
                min={3}
                max={20}
                value={quizCount}
                onChange={(event) => setQuizCount(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setIsQuizModalOpen(false)} className="px-6 py-3 rounded-xl border border-slate-300 font-semibold">Cancel</button>
              <button onClick={handleGenerateQuiz} className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600">Generate</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default DocumentDetailPage;