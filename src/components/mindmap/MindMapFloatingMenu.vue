<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMindMapStore } from '@/stores/mindmap'
import type { MindMapStyle } from '@/types/mindmap'

const store = useMindMapStore()
const { mindMapStyle } = storeToRefs(store)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isStylePanelOpen = ref(false)

function exportJson() {
  store.exportJson()
}

function openImportPicker() {
  fileInputRef.value?.click()
}

async function importJson(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (file) {
    await store.importJsonFile(file)
  }

  input.value = ''
}

function updateColor(key: 'fontColor' | 'edgeColor', event: Event) {
  store.updateStyle({
    [key]: (event.target as HTMLInputElement).value,
  })
}

function updateNumber(key: 'edgeWidth' | 'horizontalGap' | 'verticalGap', event: Event) {
  store.updateStyle({
    [key]: Number((event.target as HTMLInputElement).value),
  } satisfies Partial<MindMapStyle>)
}
</script>

<template>
  <aside class="mindmap-floating-menu" aria-label="思维导图工具">
    <div class="mindmap-floating-menu__bar">
      <button type="button" @click="exportJson">导出</button>
      <button type="button" @click="openImportPicker">导入</button>
      <button type="button">主题</button>
      <button
        type="button"
        :class="{ active: isStylePanelOpen }"
        @click="isStylePanelOpen = !isStylePanelOpen"
      >
        样式
      </button>
      <button type="button">设置</button>
      <button type="button">我的</button>
    </div>

    <input
      ref="fileInputRef"
      class="mindmap-floating-menu__file"
      type="file"
      accept=".json,application/json"
      @change="importJson"
    />

    <form v-if="isStylePanelOpen" class="mindmap-style-panel">
      <label>
        <span>字体颜色</span>
        <input
          type="color"
          :value="mindMapStyle.fontColor"
          @input="updateColor('fontColor', $event)"
        />
      </label>

      <label>
        <span>连线颜色</span>
        <input
          type="color"
          :value="mindMapStyle.edgeColor"
          @input="updateColor('edgeColor', $event)"
        />
      </label>

      <label>
        <span>连线粗细</span>
        <input
          type="range"
          min="1"
          max="8"
          step="1"
          :value="mindMapStyle.edgeWidth"
          @input="updateNumber('edgeWidth', $event)"
        />
        <output>{{ mindMapStyle.edgeWidth }}</output>
      </label>

      <label>
        <span>水平间距</span>
        <input
          type="range"
          min="260"
          max="640"
          step="20"
          :value="mindMapStyle.horizontalGap"
          @input="updateNumber('horizontalGap', $event)"
        />
        <output>{{ mindMapStyle.horizontalGap }}</output>
      </label>

      <label>
        <span>垂直间距</span>
        <input
          type="range"
          min="90"
          max="280"
          step="10"
          :value="mindMapStyle.verticalGap"
          @input="updateNumber('verticalGap', $event)"
        />
        <output>{{ mindMapStyle.verticalGap }}</output>
      </label>
    </form>
  </aside>
</template>

<style scoped>
.mindmap-floating-menu {
  position: fixed;
  z-index: 20;
  top: 50%;
  left: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  transform: translateY(-50%);
  pointer-events: none;
}

.mindmap-floating-menu__bar,
.mindmap-style-panel {
  pointer-events: auto;
}

.mindmap-floating-menu__bar {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid rgb(148 163 184 / 42%);
  border-radius: 8px;
  background: rgb(255 255 255 / 92%);
  box-shadow: 0 18px 38px rgb(15 23 42 / 14%);
  backdrop-filter: blur(10px);
}

.mindmap-floating-menu button {
  min-width: 48px;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 8px 9px;
  background: #f8fafc;
  color: #334155;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.mindmap-floating-menu button:hover,
.mindmap-floating-menu button.active {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

.mindmap-floating-menu__file {
  display: none;
}

.mindmap-style-panel {
  display: grid;
  gap: 12px;
  width: 240px;
  padding: 14px;
  border: 1px solid rgb(148 163 184 / 42%);
  border-radius: 8px;
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 18px 38px rgb(15 23 42 / 14%);
  backdrop-filter: blur(10px);
}

.mindmap-style-panel label {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 8px;
  color: #475569;
  font-size: 13px;
}

.mindmap-style-panel input[type='color'] {
  width: 100%;
  height: 30px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 2px;
  background: #ffffff;
}

.mindmap-style-panel input[type='range'] {
  width: 100%;
}

.mindmap-style-panel output {
  color: #64748b;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
</style>
