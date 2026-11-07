import Brevo from "@getbrevo/brevo";

const apiInstance = new Brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

export const sendEmail = async ({
  to,
  subject,
  html,
}) => {
  try {
    const email = new Brevo.SendSmtpEmail();

    email.sender = {
      name: process.env.EMAIL_FROM_NAME,
      email: process.env.EMAIL_FROM,
    };

    email.to = [
      {
        email: to,
      },
    ];

    email.subject = subject;
    email.htmlContent = html;

    const result = await apiInstance.sendTransacEmail(email);

    return result;
  } catch (err) {
    console.error(
      "Brevo Error:",
      err.response?.body || err.message
    );
    throw err;
  }
};