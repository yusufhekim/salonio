import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAHwFtmayhoYlluAktvMWNJdcJQFEjDqhU",
  authDomain: "salonio-app.firebaseapp.com",
  projectId: "salonio-app",
  storageBucket: "salonio-app.firebasestorage.app",
  messagingSenderId: "853107496611",
  appId: "1:853107496611:web:debf18c380834dae4dd116",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
