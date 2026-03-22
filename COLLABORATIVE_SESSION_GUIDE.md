# Real-Time Collaborative Study Session Feature - Implementation Guide

## ✅ Implementation Complete

This document describes the fully implemented collaborative study session feature for AiLearning_Platform.

---

## 📋 What Was Implemented

### Backend (Node.js + Express + Socket.io + MongoDB)

**1. MongoDB Models** (`backend/models/`)
- `Session.js` - Stores session metadata (sessionId, PDF URL, creator, active users)
- `Highlight.js` - Stores all highlights with position, color, username
- `Comment.js` - Stores comments per highlight
- `SessionNotes.js` - Stores shared collaborative notes

**2. Controllers** (`backend/controllers/`)
- `sessionController.js` - Business logic for:
  - Creating sessions (returns unique sessionId)
  - Fetching session data (PDF, highlights, comments, notes)
  - Listing user sessions
  - Ending sessions

**3. Routes** (`backend/routes/`)
- `sessionRoutes.js` - REST endpoints:
  - `POST /api/sessions` - Create new session
  - `GET /api/sessions` - Get user's sessions
  - `GET /api/sessions/:sessionId` - Fetch session data (public)
  - `PUT /api/sessions/:sessionId/end` - End session (protected)

**4. Socket.io Integration** (`backend/server.js`)
- Real-time event handlers:
  - `join-session` - User joins collaborative room
  - `highlight` - Broadcast highlights to room
  - `send-comment` - Broadcast comments to room
  - `update-notes` - Sync notes across users
  - `page-change` - Broadcast page navigation
- Rooms keyed by sessionId for traffic isolation

---

### Frontend (React + Vite + Tailwind + Socket.io)

**1. Utilities** (`frontend/src/utils/`)
- `socketClient.js` - Socket.io client initialization and event emitters
- `sessionHelpers.js` - Helper functions:
  - `getUserColor()` - Assign consistent color per user
  - `debounce()` - Debounce notes updates (300ms)
  - `throttle()` - Throttle high-frequency events
  - Text selection utilities

**2. Components** (`frontend/src/components/session/`)

**PDFViewer.jsx**
- Displays PDF using react-pdf
- Page navigation with prev/next buttons
- Shows current page and total pages
- Smooth page loading with error handling

**HighlightLayer.jsx**
- Overlay on PDF for text selection
- On selection → emit highlight to server
- Renders highlight rectangles with color-coding
- Shows username on hover
- Auto-clears selection after highlighting

**CommentsPanel.jsx**
- Slide-out panel showing comments for selected highlight
- List of all comments with usernames and timestamps
- Form to add new comment
- Debounced updates

**NotesPanel.jsx**
- Right-side collaborative notes editor
- Textarea with real-time sync
- Copy-to-clipboard button
- Shows auto-save status
- Debounced updates (300ms)

**3. Pages** (`frontend/src/pages/Session/`)

**SessionPage.jsx** - Main orchestration
- Fetches initial session state from REST API
- Initializes Socket.io connection
- Manages local state for: highlights, comments, notes, page number
- Registers socket event listeners
- Handles user interactions:
  - Text highlighting
  - Adding comments
  - Updating notes
  - Changing pages
- Top bar with:
  - Session title
  - Active user count
  - Share link button
  - Exit button
- Layout:
  - Left: PDF Viewer with highlights
  - Right: Highlights summary + Comments/Notes panels

**4. Routing** (`frontend/src/App.jsx`)
- Added route: `/session/:sessionId`
- Protected by `<ProtectedRoute>` (requires authentication)

---

## 🚀 How to Use

### 1. Create a Session (for Study Organizer)

In Dashboard, click "Create Study Session":
```
POST /api/sessions
Body: { documentUrl: "path/to/pdf.pdf", documentName: "Unit 3 PHYSICS" }
Response: { sessionId: "abc-123", shareLink: "http://localhost:5173/session/abc-123" }
```

### 2. Share Session Link

Copy the share link and send to study group members.

### 3. Join Session (for Participants)

Students click the share link → Redirected to `/session/:sessionId`
- Get prompted for username (if not logged in)
- Automatically join Socket.io room
- Connected!

### 4. Real-Time Collaboration

**Highlighting:**
- Select text in PDF
- Confirm in popup
- Highlight appears for all users in that color
- Click highlight → see comments

**Adding Comments:**
- Click a highlight on the right panel
- CommentsPanel slides in
- Type comment → Send
- Appears for all users instantly

**Shared Notes:**
- Type in Notes panel (right side)
- Debounced updates (300ms) prevent spam
- All users see changes in real-time
- Copy button to save locally

**Page Navigation:**
- Change page in PDF viewer
- All users jump to that page automatically
- "username changed to page X" notification

---

## 🔧 Configuration

### Environment Variables (backend `.env`)

```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/ailearning
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_secret
```

### Environment Variables (frontend `.env.local`)

```env
VITE_API_BASE=http://localhost:8000
```

---

## 📊 Data Flow

### Highlight Creation Flow:
```
User selects text
  → PDFViewer triggers mouseup
  → HighlightLayer detects selection
  → emitHighlight() sends to server via Socket.io
  → Server saves to Highlight model
  → Server broadcasts to room
  → All clients receive and update highlights array
  → Highlights render on PDF instantly
```

### Notes Update Flow:
```
User types in NotesPanel
  → setContent() updates local state
  → debounce(300ms) delays emit
  → emitNotesUpdate() sends content to server
  → Server saves to SessionNotes model
  → Server broadcasts to others (not sender)
  → Other clients receive and update
  → NotesPanel re-renders
```

### Page Change Flow:
```
User clicks Next/Previous
  → handlePageChange() updates state
  → emitPageChange() sends page and username
  → Server broadcasts to room
  → All clients receive page-change event
  → All PDFViewers jump to that page
```

---

## 🎨 UI Features

**Color Coding:**
- Each user gets a unique color based on username hash
- 10 nice highlight colors (yellow, red, teal, blue, salmon, mint, gold, purple, sky blue, peach)
- Consistent across session

**User Presence:**
- Top bar shows "3 active" users
- Share button for quick copy

**Responsive Layout:**
- Left: Full PDF viewer (flex-1)
- Right: 96px fixed width sidebar (w-96)
  - Top 1/3: Highlights summary
  - Bottom 2/3: Comments or Notes

**Smooth Interactions:**
- Loading states with spinners
- Error handling with fallback UI
- Instant local updates (optimistic UI)
- Debounced server updates

---

## 🔐 Security & Stability

**Authentication:**
- Socket.io validates JWT tokens via middleware
- Users can only join sessions, not modify other sessions
- Protected REST endpoints require auth

**Debouncing:**
- Notes: 300ms debounce prevents 100 emits for typing
- Reduces server load and network traffic

**Listener Cleanup:**
- Socket listeners unregistered on unmount
- No memory leaks from multiple subscriptions
- Proper socket disconnect on page exit

**Error Handling:**
- Try-catch blocks on all Socket handlers
- Error events sent to client
- Fallback UI for failed loads

---

## 🧪 Testing the Feature

### Setup:
1. Ensure MongoDB is running
2. `cd backend && npm start` (nodemon watches for changes)
3. `cd frontend/vite-project && npm run dev`

### Test Flow:
1. User A: Login, create session with PDF
2. Copy share link
3. User B: Login in different browser/incognito
4. Paste link, join session
5. User A: Highlight some text → appears for B
6. User B: Type comment → appears for A
7. Both: Edit notes → sync in real-time
8. Both: Navigate pages → synced

---

## 📈 Extensible Architecture

The feature is built for future enhancements:

**Potential Add-ons:**
- Convert highlight → Flashcard (save to Flashcard model)
- Activity feed (log who did what, when)
- Typing indicators (show "user is editing notes")
- Voice chat (Webrtc integration)
- Screen sharing
- Cursor position sync (see where others are pointing)
- Rich text notes (Quill or TipTap editor)
- Highlight voting (upvote important notes)

**Why it's Extensible:**
- Modular socket handlers
- Separate components (easy to add new panels)
- Debounce/throttle utilities reusable
- MongoDB models ready for extra fields
- REST only seeds initial state; Socket.io is real-time backbone

---

## 📝 Files Created/Modified

### Backend
- **Models:** Session.js, Highlight.js, Comment.js, SessionNotes.js
- **Controllers:** sessionController.js
- **Routes:** sessionRoutes.js
- **Server:** server.js (updated with Socket.io)

### Frontend
- **Utils:** socketClient.js, sessionHelpers.js
- **Components:** PDFViewer.jsx, HighlightLayer.jsx, CommentsPanel.jsx, NotesPanel.jsx
- **Pages:** SessionPage.jsx
- **Routing:** App.jsx (added /session/:sessionId route)

### Dependencies Installed
- Backend: `socket.io`, `uuid`
- Frontend: `socket.io-client`, `react-pdf`

---

## 🎯 Interview Talking Points

**Problem:**
"We needed real-time collaboration for study groups using shared PDFs."

**Solution:**
"Built a WebSocket-based system (Socket.io) where users join rooms by sessionId and all interactions—highlights, comments, notes, page navigation—sync instantly."

**Architecture:**
- REST API seeds initial state (session data)
- Socket.io rooms isolate traffic per session
- MongoDB persists everything for recovery

**Key Decisions:**
1. **Rooms per sessionId** → Scoped broadcasts prevent message spam
2. **Debounced notes (300ms)** → Reduces network overhead
3. **Optimistic UI** → Add highlights locally before server confirmation
4. **Color per user** → Deterministic hash, no server round-trip needed
5. **Listener cleanup** → Prevents memory leaks on unmount

**Challenges Solved:**
- **Collision handling:** UUIDs for sessionId; timestamps to avoid duplicate rendering
- **Real-time sync:** Socket.io provides pub/sub; Mongoose persists; clients reconcile state
- **User experience:** Debounce + throttle reduce jank; colors + usernames provide context

**Scalability:**
- Redis adapter could scale Socket.io across servers
- MongoDB indexes on sessionId for fast queries
- Paginated comment/highlight fetching for large sessions

---

## ✨ Summary

A production-ready collaborative study system with:
- ✅ Real-time PDF collaboration
- ✅ Color-coded highlights with names
- ✅ Comment threads per highlight
- ✅ Shared notes with debounced updates
- ✅ Synchronized page navigation
- ✅ Clean, modular code
- ✅ Extensible architecture

**Status:** Ready to use and extend! 🚀
