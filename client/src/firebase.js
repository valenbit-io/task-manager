// client/src/firebase.js

// Importamos la función para iniciar la app
import { initializeApp } from "firebase/app";
// Importamos la autenticación y el proveedor de Google
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// PEGA AQUÍ TU CONFIGURACIÓN (La que copiaste de la consola)
const firebaseConfig = {
  apiKey: "AIzaSyA2VjhkkK1bWSaaeKcvYrKJ0DEeT8O2BrE",
  authDomain: "task-manager-portfolio-911c4.firebaseapp.com",
  projectId: "task-manager-portfolio-911c4",
  storageBucket: "task-manager-portfolio-911c4.firebasestorage.app",
  messagingSenderId: "382186033430",
  appId: "1:382186033430:web:ad3ab8b40141f3f6628037",
  measurementId: "G-4235TKQJ2J"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos las herramientas que usaremos en la App
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// Funciones auxiliares para Login y Logout
export const loginGoogle = () => signInWithPopup(auth, provider);
export const logout = () => signOut(auth);