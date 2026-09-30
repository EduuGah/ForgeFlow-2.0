import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

function createFirestore(): Firestore {
  // Persistent cache keeps queued writes and last-known data across reloads,
  // so the app keeps working offline. Falls back to memory where IndexedDB is
  // unavailable (private windows, some embedded browsers).
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      firebaseConfig.firestoreDatabaseId,
    );
  } catch {
    return initializeFirestore(
      app,
      { localCache: memoryLocalCache() },
      firebaseConfig.firestoreDatabaseId,
    );
  }
}

// The database id must be passed explicitly: this project does not use "(default)".
export const db = createFirestore();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export type { User };

/** Errors that mean "the person closed the sign-in window", not a failure. */
const DISMISSED_LOGIN_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

export function isLoginDismissed(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return typeof code === 'string' && DISMISSED_LOGIN_CODES.has(code);
}

export function describeLoginError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'auth/popup-blocked') {
    return 'O navegador bloqueou a janela de login. Permita pop-ups para este site e tente de novo.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Sem conexão com a internet. Conecte-se para entrar com Google.';
  }
  return 'Não foi possível entrar com Google. Tente novamente.';
}

export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

export {
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
};
