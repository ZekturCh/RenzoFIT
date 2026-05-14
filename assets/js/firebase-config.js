// assets/js/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBYEMX6w1LLxY2nmno1EF5qyRMh03OL2HU",
  authDomain: "tesen-factory-admin.firebaseapp.com",
  projectId: "tesen-factory-admin",
  storageBucket: "tesen-factory-admin.firebasestorage.app",
  messagingSenderId: "948025644069",
  appId: "1:948025644069:web:a369aa87f01cbfae155bcc",
  measurementId: "G-74YKBKD812"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
