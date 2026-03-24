

Use this as your README content.


# AI Learning Platform

AI Learning Platform is a full-stack web application for collaborative and intelligent studying.  
Users can upload PDF notes, generate AI summaries/flashcards/quizzes, track progress, and join real-time study sessions with shared highlights, comments, notes, and synchronized navigation.

## Live Purpose

This project helps students and teams:
- Learn faster from documents
- Convert study material into active-recall content
- Collaborate in real time during sessions
- Track learning progress over time

## Core Features

### Authentication and User Management
- Register and login with JWT-based auth
- Protected routes and profile management

### Document Learning Workflow
- Upload and store PDF documents
- Parse content for AI processing
- Document-based AI chat and concept explanation

### AI Study Tools
- AI summary generation
- AI flashcard generation
- AI quiz generation
- Chat history for document conversations

### Flashcards and Quizzes
- Review and star flashcards
- Submit quiz attempts and view results
- Delete and manage generated learning sets

### Collaborative Study Sessions
- Create and join study sessions via share link
- Live presence and participant updates
- Real-time PDF page sync
- Real-time highlights, comments, and notes
- Socket-based collaboration using WebSockets

### Notifications and Invitations
- Email invitation support
- Session share links and alerts

### Progress Analytics
- Dashboard progress endpoints for learning insights

## Tech Stack

### Frontend
- React 19
- Vite
- Tailwind CSS
- React Router
- Axios
- Socket.IO Client
- React PDF

### Backend
- Node.js
- Express
- MongoDB with Mongoose
- Socket.IO
- JWT Authentication
- Multer (file uploads)
- Nodemailer (email notifications)
- Google Gemini SDK integration

## Project Structure

~~~text
AI-learning-Platform/
  backend/
    config/
    controllers/
    middleware/
    models/
    routes/
    utils/
    uploads/
    server.js
  frontend/
    vite-project/
      src/
      public/
~~~

## Prerequisites

- Node.js 18 or later
- npm
- MongoDB (Atlas or local)
- Gemini API key
- Gmail app password (if using email invites)

## Environment Variables

Create a backend environment file with values like this:

~~~env
MONGO_URI=your_mongodb_connection_string
PORT=8000
JWT_SECRET=your_strong_jwt_secret
NODE_ENV=development
JWT_EXPIRE=7d
MAX_FILE_SIZE=10485760
GEMINI_API_KEY=your_gemini_api_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_app_password
FRONTEND_URL=http://localhost:5173
~~~

Create a frontend environment file:

~~~env
VITE_API_BASE=https://ai-learning-platform-c2jg.onrender.com
~~~

## Installation and Local Run

### 1) Clone Repository
~~~bash
git clone https://github.com/DevireddyHepsiba/AI-learning-Platform.git
cd AI-learning-Platform
~~~

### 2) Install Backend Dependencies
~~~bash
cd backend
npm install
~~~

### 3) Install Frontend Dependencies
~~~bash
cd ../frontend/vite-project
npm install
~~~

### 4) Run Backend
~~~bash
cd ../../backend
npm run dev
~~~

### 5) Run Frontend
Open a second terminal:
~~~bash
cd frontend/vite-project
npm run dev
~~~

## Default Local URLs

- Frontend: http://localhost:5173
- Backend API: http://ai-learning-platform-c2jg.onrender.com/api
- Socket Server: https://ai-learning-platform-c2jg.onrender.com

## Main API Modules

- Auth: register, login, profile, password update
- Documents: upload, list, view, delete
- AI: chat, summary, explain, flashcard generation, quiz generation, chat history
- Flashcards: list, review, star, delete
- Quizzes: list, fetch, submit, results, delete
- Sessions: create, join, collaborate in real time
- Progress: dashboard analytics
- Notifications: invite and alert workflows

## Available Scripts

### Backend
- npm run dev
- npm start

### Frontend
- npm run dev
- npm run build
- npm run preview
- npm run lint

## Real-Time Collaboration Flow

1. User creates a session from a document
2. A shareable session URL is generated
3. Participants join the same room
4. Highlights, comments, notes, and page navigation sync instantly via Socket.IO

## Security Notes

- Keep all secrets in environment files
- Never commit API keys, tokens, or passwords
- Rotate any key that was accidentally exposed
- Use strong JWT secrets in production

## Troubleshooting

- If CORS fails, verify FRONTEND_URL in backend env
- If PDFs fail to load, verify upload path and API base URL
- If sockets fail, ensure backend is running and origin is allowed
- If AI calls fail, verify GEMINI_API_KEY and network access
- If email invites fail, verify EMAIL_USER and app password

## Future Improvements

- Role-based session permissions
- Voice/video collaboration integration
- Study streaks and advanced analytics
- Cloud storage integration for documents
- Automated test coverage for routes and sockets

## Author

Hepsiba Devireddy


~~~

One important security note: your previously shared environment text included real secrets. Rotate the MongoDB password, JWT secret, Gemini key, token, and email app password immediately before making the repository public.One important security note: your previously shared environment text included real secrets. Rotate the MongoDB password, JWT secret, Gemini key, token, and email app password immediately before making the repository public.
