// client/src/lib/api.ts
// Firebase-backed "API" with the same surface your pages expect.

import { auth, db } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  collection, addDoc, doc, getDoc, getDocs,
  query, where, orderBy, updateDoc, deleteDoc, serverTimestamp
} from "firebase/firestore";

type User = { id: string; email: string | null };
type Task = { id: string; title: string; done: boolean; createdAt?: any; updatedAt?: any };

// ---- Auth ----
export async function apiSignup(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return { ok: true, userId: cred.user.uid };
}

export async function apiLogin(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return { ok: true, userId: cred.user.uid };
}

export async function apiLogout() {
  await signOut(auth);
  return { ok: true };
}

export async function apiMe(): Promise<{ authenticated: boolean; user?: User }> {
  const u = auth.currentUser;
  if (!u) return { authenticated: false };
  return { authenticated: true, user: { id: u.uid, email: u.email } };
}

export function apiOnAuthChanged(cb: (me: { authenticated: boolean; user?: User }) => void) {
  return onAuthStateChanged(auth, (u) => {
    if (!u) cb({ authenticated: false });
    else cb({ authenticated: true, user: { id: u.uid, email: u.email } });
  });
}

// ---- Tasks ----
const tasksCol = collection(db, "tasks");

export async function apiListTasks(): Promise<{ items: Task[] }> {
  const u = auth.currentUser;
  if (!u) return { items: [] };
  const q = query(tasksCol, where("userId", "==", u.uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const items: Task[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  return { items };
}

export async function apiCreateTask(title: string): Promise<{ item: Task }> {
  const u = auth.currentUser;
  if (!u) throw new Error("not authenticated");
  const ref = await addDoc(tasksCol, {
    userId: u.uid,
    title,
    done: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const d = await getDoc(ref);
  return { item: { id: d.id, ...(d.data() as any) } };
}

export async function apiUpdateTask(id: string, patch: Partial<Task>) {
  const ref = doc(db, "tasks", id);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
  return { ok: true };
}

export async function apiDeleteTask(id: string) {
  const ref = doc(db, "tasks", id);
  await deleteDoc(ref);
  return { ok: true };
}
