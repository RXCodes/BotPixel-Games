// authenicate firestore server
const setup = function() {
  
  let private_key = JSON.parse(JSON.parse(process.env.private_key));
  let privateString = "";
  private_key.forEach(function(key) {
    privateString += key + "\n";
  });
  let data = {
    "type": "service_account",
    "project_id": process.env.project_id,
    "private_key_id": process.env.private_key_id,
    "private_key": privateString,
    "client_email": process.env.client_email,
    "client_id": process.env.client_id,
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": process.env.cert_url
  }
  
  return data;
}

// firebase setup
const initialize = function() {
  var admin = require("firebase-admin");
  var serviceAccount = setup();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.databaseURL
  });
  const db = admin.firestore();
  exports.db = db;
}

exports.initialize = initialize;