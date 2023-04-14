const nodemailer = require('nodemailer');
const { google } = require("googleapis");
const { execStoredProcedure } = require('./dbProc')

const OAuth2 = google.auth.OAuth2;

const createTransporter = async () => {

  try {
    const storedProcedureName = 'pr_settings_oauth_load';
    const parameters = {
      current_uid: null,
      co_row_guid: null
    };
    const result = await execStoredProcedure(storedProcedureName, parameters);

    var oauth_service = result.recordset[0]['oauth_service'];
    var oauth_mailbox = result.recordset[0]['oauth_mailbox'];
    var oauth_client = result.recordset[0]['oauth_client'];
    var oauth_secret = result.recordset[0]['oauth_secret'];
    var oauth_token = result.recordset[0]['oauth_token'];

  } catch (err) {
    throw(err);
  };

  const oauth2Client = new OAuth2(
    oauth_client,
    oauth_secret,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: oauth_token
  });

  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        reject("Failed to create access token :(");
      }
      resolve(token);
    });
  });

  const transporter = nodemailer.createTransport({
    service: oauth_service,
    auth: {
      type: "OAuth2",
      user: oauth_mailbox,
      accessToken,
      clientId: oauth_client,
      clientSecret: oauth_secret,
      refreshToken: oauth_token
    }
  });

  return transporter;
};

const sendEmail = async (emailOptions) => {
  let emailTransporter = await createTransporter();
  await emailTransporter.sendMail(emailOptions);
};

module.exports = {
  sendEmail
}