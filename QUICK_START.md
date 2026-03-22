# Quick Start - Collaborative Study Sessions

## 🚀 Get Running in 2 Minutes

### Start Backend
```bash
cd backend
npm start
# Server runs on http://localhost:8000
# Socket.io ready for WebSocket connections
```

### Start Frontend
```bash
cd frontend/vite-project
npm run dev
# Frontend runs on http://localhost:5173
```

---

## 📌 Test the Feature

### 1️⃣ Open App
- Go to http://localhost:5173
- Login with your credentials

### 2️⃣ Create Session
- Go to Dashboard
- Click "Create Study Session" (in DocumentListPage or add button to Dashboard)
- Upload a PDF (use existing document)
- Get session link like: `http://localhost:5173/session/abc-123-def`

### 3️⃣ Open Two Browsers
- Paste link in **Browser 1** (logged in as User A) → See PDF
- Paste link in **Browser 2** (logged in as User B) → See same PDF

### 4️⃣ Test Features
**Highlight:** User A → Select text in PDF → Confirm → See yellow highlight
**Comment:** User A → Click highlight on right panel → Add comment → User B sees instantly
**Notes:** Both → Type in Notes panel → Changes sync live
**Page:** User A → Click "Next" → User B's page changes automatically

---

## 🔧 Quick Fix Reference

### If Socket.io doesn't connect:
1. Check CORS in `backend/server.js` (FRONTEND_URL should match)
2. Check MongoDB connection
3. Both servers running?

### If PDF won't load:
1. PDF URL must be valid (use document you uploaded)
2. Check react-pdf import: `pdfjs.GlobalWorkerOptions.workerSrc`

### If highlights don't appear:
1. Select text in PDF canvas (not outside)
2. Check if you're on same page
3. Console errors? Check socket events

---

## 📱 Key URLs for Development

- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:8000/api`
- **Socket.io:** `http://localhost:8000` (automatic via socket.io-client)

---

## 📂 File Structure Reference

```
backend/
  ├── models/
  │   ├── Session.js
  │   ├── Highlight.js
  │   ├── Comment.js
  │   └── SessionNotes.js
  ├── controllers/
  │   └── sessionController.js
  ├── routes/
  │   └── sessionRoutes.js
  └── server.js (Socket.io handlers added)

frontend/vite-project/src/
  ├── pages/Session/
  │   └── SessionPage.jsx
  ├── components/session/
  │   ├── PDFViewer.jsx
  │   ├── HighlightLayer.jsx
  │   ├── CommentsPanel.jsx
  │   └── NotesPanel.jsx
  ├── utils/
  │   ├── socketClient.js
  │   └── sessionHelpers.js
  └── App.jsx (router updated)
```

---

## ✨ Ready to Extend?

Add these features:
- **Flashcard conversion:** Highlight → Save as flashcard
- **Activity log:** "User A highlighted at 2:35 PM"
- **Cursor sync:** See where teammates are pointing
- **Voice chat:** WebRTC integration
- **Presence:** "User B is typing..."

See `COLLABORATIVE_SESSION_GUIDE.md` for architecture details.

---

Good luck! 🎓
