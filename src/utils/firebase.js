/**
 * Firebase configuration for the wanderingwojo project.
 *
 * SETUP STEPS:
 * 1. Go to Firebase Console > Project Settings > Your Apps
 * 2. Copy the web app config values below
 * 3. Enable Authentication > Sign-in method > Anonymous
 * 4. Create Firestore Database (production mode)
 * 5. Deploy security rules from kladg.md spec
 */

// TODO: Fill in config from Firebase Console
const firebaseConfig = {
  apiKey: '',
  authDomain: 'wanderingwojo.firebaseapp.com',
  projectId: 'wanderingwojo',
  storageBucket: 'wanderingwojo.appspot.com',
  messagingSenderId: '',
  appId: '',
}

let db = null
let auth = null

// Only initialize Firebase when config is filled in
if (firebaseConfig.apiKey) {
  const { initializeApp } = await import('firebase/app')
  const { getFirestore } = await import('firebase/firestore')
  const { getAuth } = await import('firebase/auth')

  const app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  auth = getAuth(app)
}

export { db, auth }
