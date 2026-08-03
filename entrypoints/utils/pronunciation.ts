const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const ENGLISH_WORD_PATTERN = /^[A-Za-z]+(?:['’-][A-Za-z]+)*$/;
const PHONETIC_REQUEST_TIMEOUT = 6000;

interface DictionaryEntry {
  phonetic?: string;
  phonetics?: Array<{ text?: string }>;
}

export interface SpeechCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

const phoneticCache = new Map<string, string>();

export function normalizeEnglishWord(text: string): string | null {
  const normalized = text.trim().replace(/’/g, "'").toLowerCase();
  return ENGLISH_WORD_PATTERN.test(normalized) ? normalized : null;
}

export async function fetchPhonetic(word: string): Promise<string> {
  const normalizedWord = normalizeEnglishWord(word);
  if (!normalizedWord) return '';

  const cached = phoneticCache.get(normalizedWord);
  if (cached !== undefined) return cached;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), PHONETIC_REQUEST_TIMEOUT);
  try {
    const response = await fetch(`${DICTIONARY_API_URL}${encodeURIComponent(normalizedWord)}`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 404) phoneticCache.set(normalizedWord, '');
      return '';
    }

    const entries = await response.json() as DictionaryEntry[];
    const phonetic = entries.find(entry => entry.phonetic)?.phonetic
      || entries.flatMap(entry => entry.phonetics || []).find(item => item.text)?.text
      || '';

    phoneticCache.set(normalizedWord, phonetic);
    return phonetic;
  } catch (error) {
    console.warn('Failed to fetch phonetic:', error);
    return '';
  } finally {
    window.clearTimeout(timeout);
  }
}

export function speakText(text: string, lang = 'en-US', callbacks: SpeechCallbacks = {}): boolean {
  if (!text || !('speechSynthesis' in window)) return false;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.onstart = () => callbacks.onStart?.();
  utterance.onend = () => callbacks.onEnd?.();
  utterance.onerror = () => callbacks.onError?.();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
