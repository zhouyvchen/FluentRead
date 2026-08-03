<template>
  <div class="popup-shell">
    <el-container>
      <el-header class="custom-padding">
        <Header/>
        <nav class="view-switch" aria-label="弹窗视图">
          <button :class="{ active: activeView === 'settings' }" @click="activeView = 'settings'">设置</button>
          <button :class="{ active: activeView === 'vocabulary' }" @click="activeView = 'vocabulary'">生词本</button>
        </nav>
      </el-header>
      <el-main class="custom-padding" style="min-height: 320px">
        <Main v-show="activeView === 'settings'"/>
        <VocabularyBook v-if="activeView === 'vocabulary'"/>
      </el-main>
      <el-footer v-show="activeView === 'settings'" class="custom-padding">
        <Footer/>
      </el-footer>
    </el-container>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import Header from '../../components/Header.vue';
import Main from "../../components/Main.vue";
import Footer from "../../components/Footer.vue";
import VocabularyBook from '../../components/VocabularyBook.vue';
import '../../styles/theme.css';
// Element Plus 基础与暗色变量
import 'element-plus/theme-chalk/base.css';
import 'element-plus/theme-chalk/dark/css-vars.css';

const activeView = ref<'settings' | 'vocabulary'>('settings');
</script>

<style scoped>
@media screen and (max-height: 800px) {
  .popup-container {
    max-height: 90vh;
  }
}

@media screen and (max-width: 480px) {
  .popup-container {
    width: 95vw;
  }
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}

::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
}

.el-main {
  min-height: 460px;
  height: auto;
}

.custom-padding {
  padding: 12px 16px;
}

.el-header {
  height: auto;
}

.view-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 34px;
  padding: 3px;
  border: 1px solid var(--fr-border-color-light);
  border-radius: 6px;
  background: var(--fr-hover-color);
}

.view-switch button {
  color: var(--fr-text-color-regular);
  background: transparent;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.view-switch button.active {
  color: #1677ff;
  background: var(--fr-bg-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
