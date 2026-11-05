import { collection, getFirestore } from 'firebase/firestore';
import { firebaseApp } from './firebase';

export const db = getFirestore(firebaseApp);
export const todosRef = collection(db, 'todos');
export const inventoryRef = collection(db, 'inventory');
