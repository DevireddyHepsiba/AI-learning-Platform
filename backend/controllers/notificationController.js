import Notification from "../models/Notification.js";
import User from "../models/User.js";
import postmark from "postmark";

/**
 * Initialize Postmark email client
 * Works on Render free tier (nodemailer/Gmail doesn't)
 */
const getPostmarkClient = () => {
  const apiToken = process.env.POSTMARK_API_TOKEN;

  if (!apiToken) {
    console.warn("⚠️ Postmark not configured. Set POSTMARK_API_TOKEN.");
    return null;
  }

  try {
    return new postmark.ServerClient(apiToken);
  } catch (error) {
    console.error("❌ Failed to initialize Postmark:", error.message);
    return null;
  }
};

/**
 * Send session invitation via email
 * POST /api/notifications/invite-session
 * Body: { sessionId, sessionName, documentName, recipientEmail }
 */
export const inviteToSession = async (req, res) => {
  try {
    const { sessionId, sessionName, documentName, recipientEmail } = req.body;
    const userId = req.user._id;
    const userName = req.user.username;

    if (!sessionId || !recipientEmail) {
      return res.status(400).json({
        success: false,
        message: "sessionId and recipientEmail are required",
      });
    }

    // Check if recipient exists
    let recipient = await User.findOne({ email: recipientEmail });

    // Create notification (for registered users)
    if (recipient) {
      await Notification.create({
        type: "session_invite",
        recipientId: recipient._id,
        recipientEmail,
        senderId: userId,
        senderName: userName,
        sessionId,
        sessionName,
        documentName,
        shareLink: `${process.env.FRONTEND_URL || "http://localhost:5173"}/session/${sessionId}`,
        message: `${userName} invited you to collaborate on "${documentName}"`,
      });
    }

    // Send email invitation
    const shareLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/session/${sessionId}`;

    const emailContent = `
      <h2>You're invited to a study session!</h2>
      <p>Hi ${recipientEmail},</p>
      <p><strong>${userName}</strong> invited you to collaborate on <strong>${documentName}</strong></p>
      
      <h3>Session Details:</h3>
      <p><strong>Session Name:</strong> ${sessionName}</p>
      <p><strong>Document:</strong> ${documentName}</p>
      
      <p>Join the session by clicking the button below:</p>
      <a href="${shareLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Join Study Session
      </a>
      
      <p>Or copy this link: ${shareLink}</p>
      
      <p>In this session, you can:</p>
      <ul>
        <li>Highlight important text</li>
        <li>Add comments to highlights</li>
        <li>Edit shared notes together in real-time</li>
        <li>Navigate through the document together</li>
      </ul>
      
      <p>Happy studying!</p>
    `;

    const mailOptions = {
      From: process.env.POSTMARK_FROM_EMAIL || "noreply@ailearning.app",
      To: recipientEmail,
      Subject: `Join study session: ${sessionName}`,
      HtmlBody: emailContent,
    };

    // Initialize Postmark client
    const postmarkClient = getPostmarkClient();
    
    if (!postmarkClient) {
      console.error("❌ Cannot send email: Postmark not configured");
      return res.status(500).json({
        success: false,
        message: "Email service not configured on server. Please contact administrator.",
        data: { recipientEmail, sessionId, shareLink },
      });
    }

    // Send email via Postmark (non-blocking)
    postmarkClient.sendEmail(mailOptions)
      .then(() => {
        console.log("✅ Email sent successfully to:", recipientEmail);
      })
      .catch((error) => {
        console.error("❌ Email send error:", error.message);
      });

    res.status(201).json({
      success: true,
      message: `Invitation sent to ${recipientEmail}`,
      data: {
        recipientEmail,
        sessionId,
        shareLink,
      },
    });
  } catch (error) {
    console.error("Invite to session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send invitation",
      error: error.message,
    });
  }
};

/**
 * Get user notifications
 * GET /api/notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: error.message,
    });
  }
};

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    await Notification.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};
