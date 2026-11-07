import Notification from "../../models/Notification.js";
import User from "../../auth/models/User.js";
import nodemailer from "nodemailer";

// Create email transporter (configure with your email service)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "your-email@gmail.com",
    pass: process.env.EMAIL_PASSWORD || "your-app-password",
  },
});

// Promise wrapper for transporter.sendMail
const sendEmail = (options) =>
  new Promise((resolve, reject) => {
    transporter.sendMail(
      { from: process.env.EMAIL_USER || "your-email@gmail.com", ...options },
      (err, info) => {
        if (err) return reject(err);
        resolve(info);
      }
    );
  });

/**
 * Send session invitation via email
 * POST /api/notifications/invite-session
 * Body: { sessionId, sessionName, documentName, recipientEmail }
 */
export const inviteToSession = async (req, res) => {
  try {
    const { sessionId, sessionName, documentName, recipientEmail } = req.body;
    const userId = req.user.id;
    const userName = req.user.username;

    if (!sessionId || !recipientEmail || !sessionName || !documentName) {
      return res.status(400).json({
        success: false,
        message: "sessionId, sessionName, documentName and recipientEmail are required",
      });
    }

    // Normalize and validate recipient email
    const normalizedEmail = String(recipientEmail).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    // Check if recipient exists
    let recipient = await User.findOne({ email: normalizedEmail });

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

    await sendEmail({
  to: normalizedEmail,
  subject: `Study Session Invitation - ${sessionName}`,
  html: emailContent,
});

console.log("Invitation email sent successfully.");

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
    const userId = req.user.id;

    const notifications = await Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .limit(50);

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

    // const notification = await Notification.findByIdAndUpdate(
    //   id,
    //   { isRead: true, readAt: new Date() },
    //   { new: true }
    // );

    const notification = await Notification.findOneAndUpdate(
  {
    _id: id,
    recipientId: req.user.id,
  },
  {
    isRead: true,
    readAt: new Date(),
  },
  {
    new: true,
  }
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

    const notification = await Notification.findOneAndDelete({
  _id: id,
  recipientId: req.user.id,
});

if (!notification) {
  return res.status(404).json({
    success: false,
    message: "Notification not found",
  });
}

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
