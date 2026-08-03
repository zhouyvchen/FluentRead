import { storage } from '@wxt-dev/storage';
import { normalizeEnglishWord } from './pronunciation';

const VOCABULARY_STORAGE_KEY = 'local:vocabulary';

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

function parseEntries(value: unknown): VocabularyEntry[] {
  if (typeof value !== 'string' || !value) return [];

  try {
    const entries = JSON.parse(value);
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    console.warn('Failed to parse vocabulary:', error);
    return [];
  }
}

function sortEntries(entries: VocabularyEntry[]) {
  return [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getVocabularyEntries(): Promise<VocabularyEntry[]> {
  return sortEntries(parseEntries(await storage.getItem(VOCABULARY_STORAGE_KEY)));
}

export async function isWordSaved(word: string): Promise<boolean> {
  const normalizedWord = normalizeEnglishWord(word);
  if (!normalizedWord) return false;

  const entries = await getVocabularyEntries();
  return entries.some(entry => entry.normalizedWord === normalizedWord);
}

export async function saveVocabularyEntry(input: SaveVocabularyInput): Promise<VocabularyEntry> {
  const normalizedWord = normalizeEnglishWord(input.word);
  if (!normalizedWord) throw new Error('Only a single English word can be saved');

  const entries = await getVocabularyEntries();
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

export async function removeVocabularyEntry(normalizedWord: string): Promise<void> {
  const entries = await getVocabularyEntries();
  const nextEntries = entries.filter(entry => entry.normalizedWord !== normalizedWord);
  await storage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(nextEntries));
}

export function watchVocabularyEntries(callback: (entries: VocabularyEntry[]) => void) {
  return storage.watch(VOCABULARY_STORAGE_KEY, newValue => {
    callback(sortEntries(parseEntries(newValue)));
  });
}
