import axiosInstance from "../utils/axiosinstance";

const notificationService = {
  /**
   * Send a session invitation to a user's email
   */
  sendSessionInvite: async (sessionId, sessionName, documentName, email) => {
    const response = await axiosInstance.post("/api/notifications/invite-session", {
      sessionId,
      sessionName,
      documentName,
      recipientEmail: email,
    });
    return response.data;
  },

  /**
   * Get all notifications for the current user
   */
  getNotifications: async () => {
    const response = await axiosInstance.get("/api/notifications");
    return response.data.data;
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (notificationId) => {
    const response = await axiosInstance.patch(
      `/api/notifications/${notificationId}/read`
    );
    return response.data;
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (notificationId) => {
    const response = await axiosInstance.delete(`/api/notifications/${notificationId}`);
    return response.data;
  },
};

export default notificationService;
