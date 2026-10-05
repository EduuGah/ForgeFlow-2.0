import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
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

/** The popup cannot work here; a full-page redirect still can. */
const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
]);

function errorCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : undefined;
}

export function isLoginDismissed(error: unknown): boolean {
  const code = errorCode(error);
  return code !== undefined && DISMISSED_LOGIN_CODES.has(code);
}

export interface LoginErrorMessage {
  title: string;
  description?: string;
}

/** Says what went wrong instead of a generic "try again". */
export function describeLoginError(error: unknown): LoginErrorMessage {
  const code = errorCode(error);
  switch (code) {
    case 'auth/unauthorized-domain':
      return {
        title: 'Login com Google não liberado neste endereço',
        description: `O Firebase ainda não autorizou "${window.location.hostname}". Adicione-o em Authentication › Configurações › Domínios autorizados.`,
      };
    case 'auth/popup-blocked':
      return {
        title: 'O navegador bloqueou a janela de login',
        description: 'Permita pop-ups para este site e tente de novo.',
      };
    case 'auth/network-request-failed':
      return {
        title: 'Sem conexão com a internet',
        description: 'Conecte-se para entrar com o Google.',
      };
    case 'auth/operation-not-allowed':
      return {
        title: 'Login com Google desativado',
        description:
          'Ative o provedor Google em Authentication › Método de login no Firebase.',
      };
    case 'auth/too-many-requests':
      return {
        title: 'Muitas tentativas seguidas',
        description: 'Aguarde alguns minutos e tente de novo.',
      };
    case 'auth/web-storage-unsupported':
      return {
        title: 'O navegador bloqueou o armazenamento do login',
        description:
          'Desative o modo privado ou o bloqueio de cookies para este site.',
      };
    default:
      return {
        title: 'Não foi possível entrar com o Google',
        description: code ? `Código do erro: ${code}` : undefined,
      };
  }
}

/**
 * Popup first (keeps the app state); when the popup cannot open, falls back
 * to a full-page redirect, finished by `finishRedirectLogin` on return.
 */
export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    const code = errorCode(error);
    if (code && REDIRECT_FALLBACK_CODES.has(code)) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
}

/** Resolves a redirect sign-in after the page loads again; throws its error. */
export async function finishRedirectLogin(): Promise<void> {
  await getRedirectResult(auth);
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
