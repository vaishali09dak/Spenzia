// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDHJucciqi5xNP9vyr4qrJ8rq0PLefMP7M",
  authDomain: "spenzia-29ccf.firebaseapp.com",
  projectId: "spenzia-29ccf",
  storageBucket: "spenzia-29ccf.firebasestorage.app",
  messagingSenderId: "512927432128",
  appId: "1:512927432128:web:de4be71e2231ea3851dc25"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;