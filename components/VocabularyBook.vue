<template>
  <section class="vocabulary-book">
    <header class="book-header">
      <div>
        <h2>生词本</h2>
        <p>{{ entries.length }} 个待掌握单词</p>
      </div>
    </header>

    <div v-if="isLoading" class="book-state">正在读取生词...</div>
    <div v-else-if="entries.length === 0" class="book-state book-empty">
      <div class="empty-mark">Aa</div>
      <strong>还没有生词</strong>
      <span>划词翻译后点击书签按钮即可收藏</span>
    </div>

    <div v-else class="word-list">
      <article v-for="entry in entries" :key="entry.normalizedWord" class="word-item">
        <div class="word-main">
          <div class="word-title-row">
            <div class="word-title">
              <strong>{{ entry.word }}</strong>
              <span v-if="entry.phonetic">{{ entry.phonetic }}</span>
            </div>
            <div class="word-actions">
              <button class="icon-button" :class="{ active: speakingWord === entry.normalizedWord }" @click="toggleSpeech(entry)" :title="speakingWord === entry.normalizedWord ? '停止朗读' : '朗读单词'">
                <svg v-if="speakingWord === entry.normalizedWord" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              </button>
              <button class="icon-button" @click="toggleTranslation(entry.normalizedWord)" :title="isTranslationHidden(entry.normalizedWord) ? '显示翻译' : '隐藏翻译'">
                <svg v-if="isTranslationHidden(entry.normalizedWord)" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94"></path>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
                  <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88"></path>
                  <path d="M1 1l22 22"></path>
                </svg>
              </button>
              <button class="icon-button danger" @click="removeEntry(entry)" title="删除生词">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6l-1 14H6L5 6"></path>
                  <path d="M10 11v6M14 11v6"></path>
                  <path d="M9 6V4h6v2"></path>
                </svg>
              </button>
            </div>
          </div>
          <button v-if="isTranslationHidden(entry.normalizedWord)" class="translation-cover" @click="toggleTranslation(entry.normalizedWord)">
            点击查看翻译
          </button>
          <p v-else class="translation">{{ entry.translation }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { speakText, stopSpeech } from '@/entrypoints/utils/pronunciation';
import { getVocabularyEntries, removeVocabularyEntry, watchVocabularyEntries, type VocabularyEntry } from '@/entrypoints/utils/vocabulary';

const entries = ref<VocabularyEntry[]>([]);
const hiddenTranslations = ref(new Set<string>());
const speakingWord = ref('');
const isLoading = ref(true);
let unwatchVocabulary: (() => void) | undefined;
let isDisposed = false;

onMounted(() => {
  let storageVersion = 0;
  unwatchVocabulary = watchVocabularyEntries(nextEntries => {
    storageVersion += 1;
    entries.value = nextEntries;
  });

  getVocabularyEntries()
    .then(initialEntries => {
      if (!isDisposed && storageVersion === 0) entries.value = initialEntries;
    })
    .catch(error => {
      console.error('Failed to load vocabulary:', error);
    })
    .finally(() => {
      if (!isDisposed) isLoading.value = false;
    });
});

onBeforeUnmount(() => {
  isDisposed = true;
  unwatchVocabulary?.();
  stopSpeech();
});

function isTranslationHidden(normalizedWord: string) {
  return hiddenTranslations.value.has(normalizedWord);
}

function toggleTranslation(normalizedWord: string) {
  const nextHidden = new Set(hiddenTranslations.value);
  if (nextHidden.has(normalizedWord)) nextHidden.delete(normalizedWord);
  else nextHidden.add(normalizedWord);
  hiddenTranslations.value = nextHidden;
}

function toggleSpeech(entry: VocabularyEntry) {
  if (speakingWord.value === entry.normalizedWord) {
    stopSpeech();
    speakingWord.value = '';
    return;
  }

  speakingWord.value = entry.normalizedWord;
  const reset = () => {
    if (speakingWord.value === entry.normalizedWord) speakingWord.value = '';
  };
  if (!speakText(entry.word, 'en-US', { onEnd: reset, onError: reset })) reset();
}

async function removeEntry(entry: VocabularyEntry) {
  if (speakingWord.value === entry.normalizedWord) {
    stopSpeech();
    speakingWord.value = '';
  }
  await removeVocabularyEntry(entry.normalizedWord);
}
</script>

<style scoped>
.vocabulary-book {
  color: var(--fr-text-color-primary);
  text-align: left;
}

.book-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  margin-bottom: 12px;
}

.book-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
}

.book-header p {
  margin: 2px 0 0;
  color: var(--fr-text-color-regular);
  font-size: 12px;
}

.book-state {
  display: flex;
  min-height: 300px;
  align-items: center;
  justify-content: center;
  color: var(--fr-text-color-regular);
  font-size: 13px;
}

.book-empty {
  flex-direction: column;
  gap: 7px;
}

.book-empty strong {
  color: var(--fr-text-color-primary);
  font-size: 14px;
}

.empty-mark {
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  color: #1677ff;
  border: 1px solid #91caff;
  border-radius: 6px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 18px;
  font-weight: 700;
  background: #e6f4ff;
}

.word-list {
  display: flex;
  max-height: 410px;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding-right: 2px;
}

.word-item {
  border: 1px solid var(--fr-border-color-lighter);
  border-left: 3px solid #1677ff;
  border-radius: 6px;
  background: var(--fr-bg-color);
}

.word-main {
  padding: 10px 10px 10px 12px;
}

.word-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.word-title {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 7px;
}

.word-title strong {
  overflow: hidden;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.word-title span {
  color: var(--fr-text-color-regular);
  font-size: 11px;
  white-space: nowrap;
}

.word-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 3px;
}

.icon-button {
  display: flex;
  width: 27px;
  height: 27px;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--fr-text-color-regular);
  background: transparent;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
}

.icon-button:hover,
.icon-button.active {
  color: #1677ff;
  background: #e6f4ff;
}

.icon-button.danger:hover {
  color: #cf1322;
  background: #fff1f0;
}

.translation {
  margin: 8px 0 0;
  color: var(--fr-text-color-primary);
  font-size: 13px;
  line-height: 1.5;
}

.translation-cover {
  width: 100%;
  min-height: 32px;
  margin-top: 8px;
  color: var(--fr-text-color-regular);
  background: var(--fr-hover-color);
  border: 1px dashed var(--fr-border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

:global(.dark) .empty-mark,
:global(.dark) .icon-button:hover,
:global(.dark) .icon-button.active {
  background: rgba(24, 144, 255, 0.15);
}

:global(.dark) .icon-button.danger:hover {
  background: rgba(255, 77, 79, 0.15);
}
</style>
