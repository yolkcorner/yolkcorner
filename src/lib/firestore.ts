import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let db: FirebaseFirestore.Firestore | null = null;

function getDb(): FirebaseFirestore.Firestore {
  if (db) return db;

  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(
      /\\n/g,
      "\n",
    );

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Firebase credentials not configured");
    }

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  db = getFirestore();
  return db;
}

export function isFirestoreConfigured() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

const COLLECTION = "config";
const DOC_ID = "site-content";

export async function readFromFirestore(): Promise<string | null> {
  const snapshot = await getDb().collection(COLLECTION).doc(DOC_ID).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  return data?.json ?? null;
}

export async function writeToFirestore(rawJson: string): Promise<void> {
  await getDb()
    .collection(COLLECTION)
    .doc(DOC_ID)
    .set({ json: rawJson, updatedAt: new Date().toISOString() });
}
