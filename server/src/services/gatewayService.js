/**
 * Gateway Service — Email & SMS placeholder integration
 *
 * Replace the console.log stubs below with your actual provider:
 *   Email: Nodemailer, SendGrid, AWS SES, etc.
 *   SMS:   Twilio, Africa's Talking, Infobip, etc.
 *
 * Each function returns { sent: Boolean, error: String|null }
 */

//
// EMAIL GATEWAY
//

/**
 * sendEmail — Sends a single email
 * @param {Object} opts
 * @param {string}   opts.to      — recipient email address
 * @param {string}   opts.subject — email subject line
 * @param {string}   opts.body    — plain-text or HTML body
 * @returns {Promise<{sent: boolean, error: string|null}>}
 */
export const sendEmail = async ({ to, subject, body }) => {
  try {
    // TODO: Replace with real email provider, e.g. nodemailer / SendGrid
    // Example (Nodemailer):
    //   const transporter = nodemailer.createTransport({ ... });
    //   await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html: body });

    console.log(`[EMAIL GATEWAY] To: ${to} | Subject: ${subject}`);
    return { sent: true, error: null };
  } catch (err) {
    console.error("[EMAIL GATEWAY ERROR]", err.message);
    return { sent: false, error: err.message };
  }
};

/**
 * sendBulkEmail — Sends to multiple recipients
 * @param {string[]} recipients — array of email addresses
 * @param {string}   subject
 * @param {string}   body
 * @returns {Promise<{sent: boolean, error: string|null}>}
 */
export const sendBulkEmail = async (recipients, subject, body) => {
  try {
    // TODO: batch send via your email provider
    for (const to of recipients) {
      console.log(`[BULK EMAIL GATEWAY] To: ${to} | Subject: ${subject}`);
    }
    return { sent: true, error: null };
  } catch (err) {
    console.error("[BULK EMAIL GATEWAY ERROR]", err.message);
    return { sent: false, error: err.message };
  }
};

//
// SMS GATEWAY
//

/**
 * sendSMS — Sends a single SMS
 * @param {Object} opts
 * @param {string}   opts.phone   — recipient phone number (international format: +252...)
 * @param {string}   opts.message — SMS text body (max 160 chars for single SMS)
 * @returns {Promise<{sent: boolean, error: string|null}>}
 */
export const sendSMS = async ({ phone, message }) => {
  try {
    // TODO: Replace with real SMS provider, e.g. Africa's Talking / Twilio
    // Example (Africa's Talking):
    //   const AT = require('africastalking')({ apiKey: process.env.AT_API_KEY, username: process.env.AT_USERNAME });
    //   await AT.SMS.send({ to: [phone], message, from: process.env.AT_SENDER_ID });

    console.log(`[SMS GATEWAY] To: ${phone} | Message: ${message.substring(0, 50)}...`);
    return { sent: true, error: null };
  } catch (err) {
    console.error("[SMS GATEWAY ERROR]", err.message);
    return { sent: false, error: err.message };
  }
};

/**
 * sendBulkSMS — Sends to multiple phone numbers
 * @param {string[]} phones  — array of phone numbers
 * @param {string}   message — SMS text
 * @returns {Promise<{sent: boolean, error: string|null}>}
 */
export const sendBulkSMS = async (phones, message) => {
  try {
    // TODO: batch send via your SMS provider
    for (const phone of phones) {
      console.log(`[BULK SMS GATEWAY] To: ${phone} | Message: ${message.substring(0, 50)}...`);
    }
    return { sent: true, error: null };
  } catch (err) {
    console.error("[BULK SMS GATEWAY ERROR]", err.message);
    return { sent: false, error: err.message };
  }
};
