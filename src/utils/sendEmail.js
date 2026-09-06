const handlebars = require('handlebars');
const SibApiV3Sdk = require('sib-api-v3-sdk');
const fs = require('fs');
const path = require('path');

const emailTemplate = fs.readFileSync(path.join(__dirname, '../views/email.hbs'), 'utf-8');
const template = handlebars.compile(emailTemplate);

const sendEmail = async (options) => {
  const client = SibApiV3Sdk.ApiClient.instance;
  client.authentications['api-key'].apiKey = process.env.SENDINBLUE_API_KEY;

  const messageBody = template({
    APP_NAME: process.env.APP_NAME,
    RESET_PASSWORD_URL: options.resetPasswordUrl,
    EXPIRATION_TIME: process.env.PASSWORD_EXPIRE || 10,
  });

  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.sender = { name: process.env.APP_NAME, email: process.env.SMTP_MAIL };
  sendSmtpEmail.replyTo = { email: process.env.SMTP_MAIL };
  sendSmtpEmail.to = [{ email: options.mail }];
  sendSmtpEmail.subject = 'Password Recovery';
  sendSmtpEmail.htmlContent = messageBody;

  await apiInstance.sendTransacEmail(sendSmtpEmail);
};

module.exports = sendEmail;
