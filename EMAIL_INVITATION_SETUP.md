# Email Invitation System Setup Guide

## Overview
The email invitation system allows users to invite collaborators to study sessions via email. Recipients receive an email with a shareable link and can join the session directly.

## Architecture

### Backend Components
- **Notification Model** (`backend/models/Notification.js`)
  - Stores invitation data with read/unread status
  - Tracks sender, recipient, session, and document info

- **Notification Controller** (`backend/controllers/notificationController.js`)
  - `inviteToSession` - Sends email invitation + creates in-app notification
  - `getNotifications` - Retrieves user's notifications list
  - `markAsRead` - Marks notification as read
  - `deleteNotification` - Removes notification

- **Notification Routes** (`backend/routes/notificationRoutes.js`)
  - All routes protected by JWT auth middleware
  - `POST /api/notifications/invite-session` - Send invitation
  - `GET /api/notifications` - Get notifications
  - `PATCH /api/notifications/:id/read` - Mark as read
  - `DELETE /api/notifications/:id` - Delete notification

### Frontend Components
- **InviteModal** (`src/components/session/InviteModal.jsx`)
  - Email input form
  - Send button with loading state
  - Success/error messages

- **NotificationsPanel** (`src/components/layout/NotificationsPanel.jsx`)
  - Bell icon in header with unread count badge
  - Slide-out panel showing notifications
  - Join Session, Mark as Read, Delete buttons
  - Auto-refresh every 30 seconds

- **Notification Service** (`src/services/notificationService.js`)
  - API wrapper for notification endpoints

## Configuration

### 1. Environment Variables (Required)

Add to `backend/.env`:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
```

### 2. Gmail App Password Setup (Recommended)

For Gmail accounts with 2FA enabled:

1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer" (or your device)
3. Google generates a 16-character app password
4. Copy this password to `EMAIL_PASSWORD` in `.env`

**Note:** Regular Gmail password won't work with Nodemailer if 2FA is enabled.

### 3. Alternative Email Services

If not using Gmail, update the nodemailer config in `notificationController.js`:

```javascript
// For Outlook/Hotmail
const transporter = nodemailer.createTransport({
  service: "hotmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// For Yahoo Mail
const transporter = nodemailer.createTransport({
  service: "yahoo",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// For custom SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.your-provider.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
```

## Usage Flow

### User Perspective

1. **Create Study Session**
   - User creates a collaborative study session
   - Session gets unique UUID

2. **Invite Others**
   - Click "Share" button in session
   - Enter recipient's email address
   - Click "Send Invite"
   - Success message confirms send

3. **Recipient Receives Email**
   - Email contains session name, document, and join button
   - Recipient clicks button or copies link
   - Navigates to session

4. **Recipient Sees Notification**
   - In-app notification appears in header bell icon
   - Shows: "John invited you to Math Study Session"
   - Can click to join session
   - Can mark as read or delete

### Backend Flow

1. **POST /api/notifications/invite-session**
   - Validate sessionId & recipientEmail
   - Look up recipient by email in User collection
   - Create Notification document in MongoDB
   - Send HTML email via Nodemailer
   - Return 201 with success message
   - **Note:** Email sends asynchronously (non-blocking)

2. **GET /api/notifications**
   - Returns notifications for logged-in user
   - Includes unreadCount for badge
   - Sorted by most recent first
   - Limit 50 notifications

3. **PATCH /api/notifications/:id/read**
   - Sets isRead=true and readAt=now()
   - Returns updated notification

4. **DELETE /api/notifications/:id**
   - Removes from database
   - Returns success message

## Testing

### Manual Testing

1. **Terminal Test (Send Email)**
   ```bash
   # In backend directory
   curl -X POST http://localhost:8000/api/notifications/invite-session \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{
       "sessionId": "abc-123-def",
       "sessionName": "Math Study",
       "documentName": "Calculus Notes.pdf",
       "recipientEmail": "friend@example.com"
     }'
   ```

2. **Check Email**
   - Look in recipient's inbox
   - Click button to verify link works

3. **Frontend Test (Notifications)**
   - Log in as recipient
   - Check bell icon in header
   - Click to open panel
   - Verify notification appears
   - Click "Join Session" button

### Automated Testing (Optional)

Add tests in `backend/__tests__/notifications.test.js`:

```javascript
describe("Notification API", () => {
  test("should send invitation email", async () => {
    const res = await request(app)
      .post("/api/notifications/invite-session")
      .set("Authorization", `Bearer ${token}`)
      .send({
        sessionId: "test-123",
        sessionName: "Test Session",
        documentName: "test.pdf",
        recipientEmail: "test@example.com",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
```

## Troubleshooting

### Email Not Sending

1. **Check .env variables**
   ```bash
   # In backend directory, verify these are set:
   echo $EMAIL_USER
   echo $EMAIL_PASSWORD
   ```

2. **Gmail App Password Error**
   - Ensure you're using app-specific password (not regular password)
   - Verify 2FA is enabled on Gmail account
   - Check password doesn't have spaces

3. **Check Logs**
   ```bash
   # Monitor backend errors
   npm run dev
   # Look for "Failed to send email" messages
   ```

### Notification Not Appearing

1. **Verify recipient exists**
   - Email must match registered user in database
   - Check User collection in MongoDB

2. **Check JWT token**
   - Must be logged in to receive notifications
   - AuthContext should provide valid token

3. **Frontend troubleshooting**
   ```javascript
   // In browser console
   const notifs = await notificationService.getNotifications();
   console.log(notifs); // Check if any exist
   ```

## Performance Notes

- **Email sending is non-blocking** - No timeout waiting for SMTP
- **Notifications are paginated** - Default limit 50, sorted by recency
- **Auto-refresh** - Panel refreshes every 30 seconds when open
- **Optional:** Implement real-time updates with Socket.io for instant notifications

## Security Considerations

- All notification endpoints require JWT authentication
- Recipients must be registered users (prevents spam to random emails)
- Email addresses stored in Notification document for audit trail
- Rate limiting recommended for inviteToSession endpoint

## Future Enhancements

1. **Notification Preferences**
   - Users can disable email notifications
   - Keep only in-app notifications

2. **Socket.io Real-time Notifications**
   - Instant notification without page refresh
   - Replace 30-second auto-refresh

3. **Email Templates**
   - Customizable email design
   - Brand colors and logo

4. **Resend Invitations**
   - Button to resend previous invitations
   - Invitation expiry tracking

5. **Bulk Invitations**
   - Comma-separated email list
   - CSV import support

6. **Two-factor Authentication**
   - Email code verification
   - Session joining confirmation

## Support

For issues or questions:
1. Check backend logs: `npm run dev` output
2. Check browser console: F12 → Console tab
3. Check MongoDB: Verify Notification collection exists
4. Check email credentials: Test with standalone SMTP client
