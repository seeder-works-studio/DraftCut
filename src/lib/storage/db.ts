import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Asset, ProjectSpec } from '@/lib/spec/types';

interface DraftCutDB extends DBSchema {
  projects: {
    key: string;
    value: {
      id: string;
      spec: ProjectSpec;
      thumbnail?: string;
      lastModified: number;
    };
  };
  assets: {
    key: string;
    value: {
      id: string;
      blob: Blob;
      metadata: Asset;
    };
  };
  settings: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<DraftCutDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<DraftCutDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DraftCutDB>('draftcut', 1, {
      upgrade(db) {
        db.createObjectStore('projects', { keyPath: 'id' });
        db.createObjectStore('assets', { keyPath: 'id' });
        db.createObjectStore('settings');
      },
    });
  }
  return dbPromise;
}
