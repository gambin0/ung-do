import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './firebase.config';

/** The single Firebase app instance shared by Firestore and Auth. */
export const firebaseApp = initializeApp(firebaseConfig);
