/**
 * Email Notification Service Placeholder / Handler
 */
export async function sendEmailNotification(to: string, subject: string, body: string) {
  console.log(`[EMAIL SERVICE] Sending email to ${to} | Subject: ${subject}`);
  return { success: true, messageId: `msg_${Date.now()}` };
}
