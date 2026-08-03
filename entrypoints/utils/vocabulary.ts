import { storage } from '@wxt-dev/storage';
import browser from 'webextension-polyfill';
import { normalizeEnglishWord } from './pronunciation';

const VOCABULARY_STORAGE_KEY = 'local:vocabulary';
export const VOCABULARY_MESSAGE_TYPE = 'FLUENTREAD_VOCABULARY';

export interface VocabularyEntry {
  word: string;
  normalizedWord: string;
  translation: string;
  phonetic: string;
  createdAt: number;
  updatedAt: number;
}

export interface SaveVocabularyInput {
  word: string;
  translation: string;
  phonetic?: string;
}

type VocabularyMessage =
  | { type: typeof VOCABULARY_MESSAGE_TYPE; action: 'get' }
  | { type: typeof VOCABULARY_MESSAGE_TYPE; action: 'isSaved'; word: string }
  | { type: typeof VOCABULARY_MESSAGE_TYPE; action: 'save'; input: SaveVocabularyInput }
  | { type: typeof VOCABULARY_MESSAGE_TYPE; action: 'remove'; normalizedWord: string };

interface VocabularyResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function sendVocabularyMessage<T>(message: VocabularyMessage): Promise<T> {
  const response = await browser.runtime.sendMessage(message) as VocabularyResponse<T>;
  if (!response?.success) throw new Error(response?.error || 'Vocabulary operation failed');
  return response.data as T;
}

let writeQueue: Promise<unknown> = Promise.resolve();

function isVocabularyEntry(value: unknown): value is VocabularyEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<VocabularyEntry>;
  return typeof entry.word === 'string'
    && typeof entry.normalizedWord === 'string'
    && typeof entry.translation === 'string'
    && typeof entry.phonetic === 'string'
    && typeof entry.createdAt === 'number'
    && typeof entry.updatedAt === 'number';
}

function parseEntries(value: unknown): VocabularyEntry[] {
  if (typeof value !== 'string' || !value) return [];

  try {
    const entries = JSON.parse(value);
    return Array.isArray(entries) ? entries.filter(isVocabularyEntry) : [];
  } catch (error) {
    console.warn('Failed to parse vocabulary:', error);
    return [];
  }
}

function sortEntries(entries: VocabularyEntry[]) {
  return [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getVocabularyEntries(): Promise<VocabularyEntry[]> {
  return sendVocabularyMessage<VocabularyEntry[]>({
    type: VOCABULARY_MESSAGE_TYPE,
    action: 'get',
  } satisfies VocabularyMessage);
}

export async function isWordSaved(word: string): Promise<boolean> {
  return sendVocabularyMessage<boolean>({
    type: VOCABULARY_MESSAGE_TYPE,
    action: 'isSaved',
    word,
  } satisfies VocabularyMessage);
}

export async function saveVocabularyEntry(input: SaveVocabularyInput): Promise<VocabularyEntry> {
  return sendVocabularyMessage<VocabularyEntry>({
    type: VOCABULARY_MESSAGE_TYPE,
    action: 'save',
    input,
  } satisfies VocabularyMessage);
}

export async function removeVocabularyEntry(normalizedWord: string): Promise<void> {
  await sendVocabularyMessage<void>({
    type: VOCABULARY_MESSAGE_TYPE,
    action: 'remove',
    normalizedWord,
  } satisfies VocabularyMessage);
}

export function watchVocabularyEntries(callback: (entries: VocabularyEntry[]) => void) {
  return storage.watch(VOCABULARY_STORAGE_KEY, newValue => {
    callback(sortEntries(parseEntries(newValue)));
  });
}

async function readVocabularyEntries(): Promise<VocabularyEntry[]> {
  return sortEntries(parseEntries(await storage.getItem(VOCABULARY_STORAGE_KEY)));
}

async function saveEntryInBackground(input: SaveVocabularyInput): Promise<VocabularyEntry> {
  const normalizedWord = normalizeEnglishWord(input.word);
  if (!normalizedWord) throw new Error('Only a single English word can be saved');

  const entries = await readVocabularyEntries();
  const existingIndex = entries.findIndex(entry => entry.normalizedWord === normalizedWord);
  const now = Date.now();
  const existing = existingIndex >= 0 ? entries[existingIndex] : null;
  const entry: VocabularyEntry = {
    word: input.word.trim(),
    normalizedWord,
    translation: input.translation,
    phonetic: input.phonetic || existing?.phonetic || '',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (existingIndex >= 0) entries.splice(existingIndex, 1);
  entries.unshift(entry);
  await storage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(entries));
  return entry;
}

async function removeEntryInBackground(normalizedWord: string): Promise<void> {
  const entries = await readVocabularyEntries();
  const nextEntries = entries.filter(entry => entry.normalizedWord !== normalizedWord);
  await storage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(nextEntries));
}

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.catch(() => undefined);
  return result;
}

export async function handleVocabularyMessage(message: VocabularyMessage): Promise<unknown> {
  if (message.action === 'save') return enqueueWrite(() => saveEntryInBackground(message.input));
  if (message.action === 'remove') return enqueueWrite(() => removeEntryInBackground(message.normalizedWord));

  await writeQueue;
  const entries = await readVocabularyEntries();
  if (message.action === 'isSaved') {
    const normalizedWord = normalizeEnglishWord(message.word);
    return normalizedWord !== null && entries.some(entry => entry.normalizedWord === normalizedWord);
  }
  return entries;
}
