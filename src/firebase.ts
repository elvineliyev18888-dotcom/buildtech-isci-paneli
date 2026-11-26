import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCzdaAf4P9YMAt84rRN7ADKnUHu0qT0Go8',
  authDomain: 'buildtech-store.firebaseapp.com',
  projectId: 'buildtech-store',
  storageBucket: 'buildtech-store.firebasestorage.app',
  messagingSenderId: '496564557645',
  appId: '1:496564557645:web:899d2b0eb5830364384904',
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const PRODUCTS_COLLECTION = 'buildtech_products';
