import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDHJucciqi5xNP9vyr4qrJ8rq0PLefMP7M",
  authDomain: "spenzia-29ccf.firebaseapp.com",
  projectId: "spenzia-29ccf",
  storageBucket: "spenzia-29ccf.firebasestorage.app",
  messagingSenderId: "512927432128",
  appId: "1:512927432128:web:de4be71e2231ea3851dc25",
  measurementId: "G-W0WBBV48B9",
  databaseURL: "https://spenzia-29ccf-default-rtdb.firebaseio.com/"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
