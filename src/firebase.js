// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBu_nTtUzjTf1K_1P0yF6_KBa7pX_r7d74",
  authDomain: "idmachine.firebaseapp.com",
  databaseURL: "https://idmachine-default-rtdb.firebaseio.com",
  projectId: "idmachine",
  storageBucket: "idmachine.firebasestorage.app",
  messagingSenderId: "528831135229",
  appId: "1:528831135229:web:4c6d48048874d746616d94"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

export default app; 