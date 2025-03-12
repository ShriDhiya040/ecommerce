// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js"
import { 
    collection, 
    getDocs, getDoc,
    addDoc, 
    deleteDoc,  
    doc,
    query,
    where,
    setDoc,
    updateDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBLl2GbNQOhfxNjF5Fa9x_jZy1dopNcPo8",
    authDomain: "ecommerce-736e5.firebaseapp.com",
    projectId: "ecommerce-736e5",
    storageBucket: "ecommerce-736e5.firebasestorage.app",
    messagingSenderId: "488641341900",
    appId: "1:488641341900:web:a96eed98f1814bca24d569",
    measurementId: "G-8S7ZXSCLT7"
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export Firebase Modules

export { auth, db, storage, collection, getDocs, addDoc, setDoc, deleteDoc,updateDoc, doc,query,where, serverTimestamp,getDoc };



