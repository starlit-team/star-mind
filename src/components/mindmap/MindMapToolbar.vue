<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMindMapStore } from '@/stores/mindmap'

const store = useMindMapStore()
const { selectedNode } = storeToRefs(store)
const draftTitle = ref(selectedNode.value?.data.text ?? '')

watch(selectedNode, (node) => {
  draftTitle.value = node?.data.text ?? ''
})

function addChild() {
  store.addChildNode(selectedNode.value?.id ?? 'root')
}

function updateTitle() {
  if (!selectedNode.value) return
  store.updateNodeText(selectedNode.value.id, draftTitle.value.trim() || '未命名想法')
}
</script>

<template>
  <aside class="mindmap-toolbar">
    <div class="mindmap-toolbar__group">
      <button type="button" @click="addChild">添加子节点</button>
      <button type="button" @click="store.autoLayout">自动布局</button>
      <button type="button" class="secondary" @click="store.resetMap">重置</button>
    </div>

    <label class="mindmap-toolbar__field">
      <span>当前节点</span>
      <input
        v-model="draftTitle"
        type="text"
        :disabled="!selectedNode"
        @blur="updateTitle"
        @keyup.enter="updateTitle"
      />
    </label>
  </aside>
</template>

<style scoped>
.mindmap-toolbar {
  display: grid;
  align-content: start;
  gap: 16px;
  width: 300px;
  padding: 18px;
  border-right: 1px solid #dce3ec;
  background: #f8fafc;
}

.mindmap-toolbar__group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mindmap-toolbar__field {
  display: grid;
  gap: 8px;
  color: #475569;
  font-size: 13px;
}

button,
input {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font: inherit;
}

button {
  padding: 9px 12px;
  cursor: pointer;
  background: #2563eb;
  color: #ffffff;
  font-weight: 700;
}

button.secondary {
  background: #ffffff;
  color: #334155;
}

input {
  width: 100%;
  padding: 10px 12px;
  background: #ffffff;
  color: #0f172a;
}
</style>
