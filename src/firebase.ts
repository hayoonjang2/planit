import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBJ4NztWO7SzFyak9zqyPI1jYcOoeHc3qs",
  authDomain: "planit-94376.firebaseapp.com",
  projectId: "planit-94376",
  storageBucket: "planit-94376.firebasestorage.app",
  messagingSenderId: "823986427173",
  appId: "1:823986427173:web:963f431afcc1e87505b6cc",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);