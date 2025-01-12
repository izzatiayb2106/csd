// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {getAuth} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// web app firebase config 
const firebaseConfig = {
    apiKey: "AIzaSyDlW_S0Zxa83NSrb__Sa5yva1pXUN4we40",
    authDomain: "my-csd-plus-app.firebaseapp.com",
    projectId: "my-csd-plus-app",
    storageBucket: "my-csd-plus-app.firebasestorage.app",
    messagingSenderId: "606207666511",
    appId: "1:606207666511:web:9dbfba6dfea196fb207d3a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;