import "server-only";

import { MongoClient, type Collection } from "mongodb";
import { seedProjects } from "./seed-projects";
import type { Project, TrackerPayload } from "./types";

type StoredProject = Project & { _id?: string; createdAt?: string; updatedAt?: string };

const dbName = process.env.MONGODB_DB || "DevTracker";
const collectionName = process.env.MONGODB_COLLECTION || "DevTracker";
const uri = process.env.MONGODB_URI || "mongodb://dummy-localhost:27017";
const isDummyUri =
  !process.env.MONGODB_URI ||
  uri.includes("dummy") ||
  uri.includes("<") ||
  uri.includes("your-connection-string");

const memoryStore = globalThis as typeof globalThis & {
  __aztuteProjects?: Project[];
  __aztuteMongoClient?: Promise<MongoClient>;
};

function cloneProjects(projects: Project[]) {
  return structuredClone(projects);
}

function ensureMemory() {
  if (!memoryStore.__aztuteProjects) {
    memoryStore.__aztuteProjects = cloneProjects(seedProjects);
  }
  return memoryStore.__aztuteProjects;
}

async function getCollection(): Promise<Collection<StoredProject> | null> {
  if (isDummyUri) return null;

  try {
    if (!memoryStore.__aztuteMongoClient) {
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 3500,
      });
      memoryStore.__aztuteMongoClient = client.connect();
    }

    const client = await memoryStore.__aztuteMongoClient;
    const collection = client.db(dbName).collection<StoredProject>(collectionName);
    await collection.createIndex({ id: 1 }, { unique: true });
    return collection;
  } catch (error) {
    memoryStore.__aztuteMongoClient = undefined;
    console.warn("MongoDB unavailable; using in-memory tracker store.", error);
    return null;
  }
}

async function seedMongoIfEmpty(collection: Collection<StoredProject>) {
  const count = await collection.estimatedDocumentCount();
  if (count > 0) return;
  const timestamp = new Date().toISOString();
  await collection.insertMany(
    cloneProjects(seedProjects).map((project) => ({
      ...project,
      _id: project.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  );
}

function stripMongoFields(project: StoredProject): Project {
  const { _id, createdAt, updatedAt, ...rest } = project;
  void _id;
  void createdAt;
  void updatedAt;
  return rest;
}

export async function listProjects(): Promise<TrackerPayload> {
  const collection = await getCollection();
  if (!collection) {
    return { projects: cloneProjects(ensureMemory()), persistence: "memory" };
  }

  await seedMongoIfEmpty(collection);
  const projects = await collection.find({}).sort({ projectNumber: 1 }).toArray();
  return { projects: projects.map(stripMongoFields), persistence: "mongodb" };
}

export async function createProject(project: Project): Promise<TrackerPayload> {
  const collection = await getCollection();
  if (!collection) {
    ensureMemory().push(project);
    return listProjects();
  }

  const timestamp = new Date().toISOString();
  await collection.insertOne({
    ...project,
    _id: project.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return listProjects();
}

export async function updateProject(id: string, project: Project): Promise<TrackerPayload> {
  const collection = await getCollection();
  if (!collection) {
    const projects = ensureMemory();
    const index = projects.findIndex((item) => item.id === id);
    if (index === -1) throw new Error("Project not found");
    projects[index] = project;
    return listProjects();
  }

  const result = await collection.updateOne(
    { id },
    { $set: { ...project, updatedAt: new Date().toISOString() } },
  );
  if (!result.matchedCount) throw new Error("Project not found");
  return listProjects();
}

export async function deleteProject(id: string): Promise<TrackerPayload> {
  const collection = await getCollection();
  if (!collection) {
    memoryStore.__aztuteProjects = ensureMemory().filter((project) => project.id !== id);
    return listProjects();
  }

  await collection.deleteOne({ id });
  return listProjects();
}

export async function replaceProjects(projects: Project[]): Promise<TrackerPayload> {
  const cleanProjects = cloneProjects(projects);
  const collection = await getCollection();
  if (!collection) {
    memoryStore.__aztuteProjects = cleanProjects;
    return listProjects();
  }

  const timestamp = new Date().toISOString();
  await collection.deleteMany({});
  if (cleanProjects.length) {
    await collection.insertMany(
      cleanProjects.map((project) => ({
        ...project,
        _id: project.id,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    );
  }
  return listProjects();
}

export async function resetProjects(): Promise<TrackerPayload> {
  return replaceProjects(seedProjects);
}
