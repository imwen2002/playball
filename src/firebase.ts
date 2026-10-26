/**
 * Firebase Firestore integration for tournament players cloud persistence
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { PlayerSubmission } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or connecting...');
    }
  }
}
testConnection();

const PLAYERS_COLLECTION = 'players';

/**
 * Realtime listener for tournament players
 */
export function subscribeToPlayers(
  onUpdate: (players: PlayerSubmission[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const q = query(collection(db, PLAYERS_COLLECTION));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: PlayerSubmission[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name || '',
          email: data.email || '',
          gender: data.gender || 'male',
          dominantHand: data.dominantHand || 'right',
          level: Number(data.level) || 1,
          tierName: data.tierName || '',
          assessmentMode: data.assessmentMode || 'quiz',
          quizAnswers: data.quizAnswers || undefined,
          notes: data.notes || '',
          submittedAt: data.submittedAt || new Date().toISOString(),
          updatedAt: data.updatedAt || undefined,
        });
      });
      // Sort in memory by submittedAt descending (newest first)
      list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.error('Error listening to players collection:', err);
      if (onError) {
        onError(err);
      } else {
        handleFirestoreError(err, OperationType.LIST, PLAYERS_COLLECTION);
      }
    }
  );
}

/**
 * Save or update player submission to Firestore
 */
export async function savePlayerSubmission(player: PlayerSubmission): Promise<void> {
  // Use a sanitized ID or email-based document ID
  const docId = player.id || player.email.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
  const docRef = doc(db, PLAYERS_COLLECTION, docId);
  const payload = {
    name: player.name.trim(),
    email: player.email.trim(),
    gender: player.gender,
    dominantHand: player.dominantHand,
    level: Number(player.level),
    tierName: player.tierName,
    assessmentMode: player.assessmentMode,
    notes: (player.notes || '').slice(0, 500),
    submittedAt: player.submittedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${PLAYERS_COLLECTION}/${docId}`);
  }
}

/**
 * Delete a player from Firestore
 */
export async function deletePlayerSubmission(playerId: string): Promise<void> {
  const docRef = doc(db, PLAYERS_COLLECTION, playerId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${PLAYERS_COLLECTION}/${playerId}`);
  }
}

/**
 * Batch load sample players (optional action for organizers)
 */
export async function batchLoadSamplePlayers(samples: PlayerSubmission[]): Promise<void> {
  const batch = writeBatch(db);
  for (const player of samples) {
    const docId = player.id || player.email.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
    const docRef = doc(db, PLAYERS_COLLECTION, docId);
    batch.set(docRef, {
      name: player.name,
      email: player.email,
      gender: player.gender,
      dominantHand: player.dominantHand,
      level: Number(player.level),
      tierName: player.tierName,
      assessmentMode: player.assessmentMode,
      notes: player.notes || '',
      submittedAt: player.submittedAt || new Date().toISOString(),
    });
  }
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, PLAYERS_COLLECTION);
  }
}

/**
 * Batch delete a list of player doc IDs from Firestore
 */
export async function batchDeletePlayers(playerDocIds: string[]): Promise<void> {
  if (playerDocIds.length === 0) return;
  const batch = writeBatch(db);
  for (const docId of playerDocIds) {
    const docRef = doc(db, PLAYERS_COLLECTION, docId);
    batch.delete(docRef);
  }
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, PLAYERS_COLLECTION);
  }
}

const TOURNAMENTS_COLLECTION = 'tournaments';
const ACTIVE_TOURNAMENT_DOC = 'active';

export interface TournamentCloudState {
  courtSchedule: any | null;
  matchScores: Record<string, { scoreA?: number; scoreB?: number; completed?: boolean }>;
  updatedAt: string;
}

/**
 * Subscribe to real-time tournament state (schedule, match scores, completion status)
 */
export function subscribeToTournamentState(
  onUpdate: (state: TournamentCloudState | null) => void,
  onError?: (error: unknown) => void
): () => void {
  const docRef = doc(db, TOURNAMENTS_COLLECTION, ACTIVE_TOURNAMENT_DOC);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate({
          courtSchedule: data.courtSchedule ?? null,
          matchScores: data.matchScores ?? {},
          updatedAt: data.updatedAt ?? new Date().toISOString(),
        });
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('Error listening to tournament state:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Deep sanitize any data before sending to Firestore to strip out undefined values,
 * which cause Firestore setDoc() to fail with 'Unsupported field value: undefined'.
 */
function sanitizeForFirestore(data: any): any {
  if (data === undefined || data === null) return null;
  return JSON.parse(JSON.stringify(data));
}

/**
 * Save active tournament state to Firestore with auto-sanitization
 */
export async function saveTournamentState(
  courtSchedule: any | null,
  matchScores: Record<string, { scoreA?: number; scoreB?: number; completed?: boolean }>
): Promise<void> {
  const docRef = doc(db, TOURNAMENTS_COLLECTION, ACTIVE_TOURNAMENT_DOC);
  try {
    const payload = sanitizeForFirestore({
      courtSchedule: courtSchedule ?? null,
      matchScores: matchScores ?? {},
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, payload, { merge: true });
    console.log('[Firestore] Tournament state successfully autosaved to cloud:', {
      hasSchedule: Boolean(courtSchedule),
      scoreCount: Object.keys(matchScores || {}).length,
    });
  } catch (err) {
    console.error('[Firestore] Failed saving tournament state to cloud:', err);
    handleFirestoreError(err, OperationType.WRITE, `${TOURNAMENTS_COLLECTION}/${ACTIVE_TOURNAMENT_DOC}`);
  }
}
