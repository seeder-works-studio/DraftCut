import { getDB } from './db';
import type { ProjectSpec } from '@/lib/spec/types';

export async function saveProject(spec: ProjectSpec): Promise<void> {
  const db = await getDB();
  const id = spec.metadata.projectId || 'default';
  await db.put('projects', {
    id,
    spec: { ...spec, metadata: { ...spec.metadata, modified: new Date().toISOString() } },
    lastModified: Date.now(),
  });
}

export async function loadProject(
  id: string = 'default'
): Promise<ProjectSpec | undefined> {
  const db = await getDB();
  const record = await db.get('projects', id);
  return record?.spec;
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
}

export async function listProjects(): Promise<
  Array<{ id: string; spec: ProjectSpec; lastModified: number }>
> {
  const db = await getDB();
  return db.getAll('projects');
}
