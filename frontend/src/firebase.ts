import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ??
    'AIzaSyB9aJOGDGarXs7uCdOqM8ZxrfV63MH1Z_g',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ??
    'lavanderiazanotto.firebaseapp.com',
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'lavanderiazanotto',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ??
    'lavanderiazanotto.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '820105304839',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ??
    '1:820105304839:web:af97ab5f19342e865703a2',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export default app;
