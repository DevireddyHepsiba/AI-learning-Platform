export const sessionInviteTemplate = ({
  userName,
  sessionName,
  documentName,
  shareLink,
  recipientEmail,
}) => {
  return `
    <div style="font-family:Arial;padding:20px;max-width:700px;margin:auto">

      <h2>📚 Study Session Invitation</h2>

      <p>Hello <b>${recipientEmail}</b>,</p>

      <p>
        <strong>${userName}</strong> invited you to collaborate on
        <strong>${documentName}</strong>.
      </p>

      <hr>

      <h3>Session Details</h3>

      <p><b>Session:</b> ${sessionName}</p>

      <p><b>Document:</b> ${documentName}</p>

      <br>

      <a
      href="${shareLink}"
      style="
      background:#2563eb;
      color:white;
      padding:14px 22px;
      text-decoration:none;
      border-radius:6px;
      ">
      Join Session
      </a>

      <br><br>

      <p>If the button doesn't work, copy this link:</p>

      <p>${shareLink}</p>

      <hr>

      <p>
      Happy Learning 🚀
      </p>

    </div>
  `;
};