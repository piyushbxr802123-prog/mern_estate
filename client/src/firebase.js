// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,    
  authDomain: "mern-estate-dba17.firebaseapp.com",
  projectId: "mern-estate-dba17",
  storageBucket: "mern-estate-dba17.firebasestorage.app",
  messagingSenderId: "258863603553",
  appId: "1:258863603553:web:9c489a88536690efbdef20"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);