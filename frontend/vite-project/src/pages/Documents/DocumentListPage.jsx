import { FileText, Loader2, Plus, Trash2, Upload, X, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AppShell from "../../components/auth/layout/AppShell";
import CreateSessionModal from "../../components/session/CreateSessionModal";
import documentService from "../../services/documentationService";

const formatSize = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DocumentListPage = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await documentService.getDocuments();
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      setError(err?.error || err?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleDelete = async (event, id) => {
    event.stopPropagation();
    try {
      await documentService.deleteDocument(id);
      setDocuments((prev) => prev.filter((doc) => doc._id !== id));
      toast.success("Document deleted");
    } catch (err) {
      toast.error(err?.error || err?.message || "Delete failed");
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter document title");
      return;
    }
    if (!file) {
      toast.error("Please choose a PDF file");
      return;
    }

    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("PDF must be 10MB or smaller");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("file", file);

      await documentService.uploadDocument(formData);
      toast.success("Document uploaded successfully");
      setIsUploadOpen(false);
      setTitle("");
      setFile(null);
      await loadDocuments();
    } catch (err) {
      toast.error(err?.error || err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">My Documents</h1>
            <p className="text-slate-500 mt-1">Manage and organize your learning materials</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setIsCreateSessionOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-md"
            >
              <Users size={18} /> Create Study Session
            </button>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 shadow-md"
            >
              <Plus size={18} /> Upload Document
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 flex items-center justify-center gap-3 text-slate-600">
            <Loader2 className="animate-spin" size={20} /> Loading documents...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {documents.map((doc) => (
              <button
                key={doc._id}
                onClick={() => navigate(`/documents/${doc._id}`)}
                className="text-left rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center">
                    <FileText size={26} />
                  </div>
                  <Trash2
                    onClick={(event) => handleDelete(event, doc._id)}
                    size={17}
                    className="text-slate-400 hover:text-red-500"
                  />
                </div>

                <h3 className="mt-5 font-semibold text-2xl leading-tight line-clamp-2">{doc.title}</h3>
                <p className="text-slate-500 mt-2">{formatSize(doc.fileSize)}</p>

                <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500">
                  Uploaded {new Date(doc.createdAt || doc.uploadDate).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200 p-8 relative">
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute right-5 top-5 p-2 rounded-lg hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <h2 className="text-3xl font-bold">Upload New Document</h2>
            <p className="text-slate-500 mt-1">Add a PDF document to your library</p>

            <form onSubmit={handleUpload} className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Document Title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500"
                  placeholder="React JS Concept Guide"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">PDF File</label>
                <label className="w-full rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 p-8 text-center cursor-pointer block hover:bg-emerald-50">
                  <Upload className="mx-auto text-emerald-600" size={30} />
                  <p className="mt-3 font-semibold text-emerald-700">{file ? file.name : "Choose PDF file"}</p>
                  <p className="text-sm text-slate-500">PDF up to 10MB</p>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-8 py-3 rounded-xl border border-slate-300 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-8 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-60"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CreateSessionModal
        isOpen={isCreateSessionOpen}
        onClose={() => setIsCreateSessionOpen(false)}
      />
    </AppShell>
  );
};

export default DocumentListPage;