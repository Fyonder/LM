import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { 
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAZKTBs4SOniXugbe-DtYJ0p_iDLnVwoYY",
  authDomain: "auuii-delivery.firebaseapp.com",
  databaseURL: "https://auuii-delivery-default-rtdb.firebaseio.com",
  projectId: "auuii-delivery",
  storageBucket: "auuii-delivery.appspot.com",
  messagingSenderId: "106340917964",
  appId: "1:106340917964:web:61cd7ee2ed815de44a9869",
  measurementId: "G-R49W5WBLZZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export all needed Firebase functionalities
export { 
  // Auth
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  
  // Firestore
  db,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  
  // Storage
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
};