import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDHJucciqi5xNP9vyr4qrJ8rq0PLefMP7M",
  authDomain: "spenzia-29ccf.firebaseapp.com",
  projectId: "spenzia-29ccf",
  storageBucket: "spenzia-29ccf.firebasestorage.app",
  messagingSenderId: "512927432128",
  appId: "1:512927432128:web:de4be71e2231ea3851dc25",
  measurementId: "G-W0WBBV4889",
  databaseURL: "https://spenzia-29ccf-default-rtdb.firebaseio.com/"
};

// Guard against duplicate initialization (e.g., fast refresh)
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
