// client/src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDuzgllaO7FdHu1Ia51ehCLMRxBWeTV8i0",
  authDomain: "haat-tasks.firebaseapp.com",
  projectId: "haat-tasks",
  storageBucket: "haat-tasks.firebasestorage.app",
  messagingSenderId: "38862539999",
  appId: "1:38862539999:web:32c70e719f8cb7e165ed6a",
  measurementId: "G-3FEJRTGZXL",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
