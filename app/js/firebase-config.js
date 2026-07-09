/* CoinForge Studio — Firebase web-app config (public client identifiers).
   Security comes from Firestore rules + authorized domains, not from
   hiding these values.
   NOTE: authDomain can move to app.coinforgestudio.com (first-party
   popups) once the OAuth client lists
   https://app.coinforgestudio.com/__/auth/handler as an authorized
   redirect URI in Google Cloud console → Credentials. */
window.CF_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDo8-AoBYa7UcNjy4_iyQzaOHpv4XNTuF8",
  authDomain: "coinforgestudio.firebaseapp.com",
  projectId: "coinforgestudio",
  storageBucket: "coinforgestudio.firebasestorage.app",
  messagingSenderId: "492236505892",
  appId: "1:492236505892:web:88a4f35b06c058ccd729b1"
};