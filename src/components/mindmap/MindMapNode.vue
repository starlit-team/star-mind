<script setup lang="ts">
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import { computed, nextTick, ref, watch } from 'vue'
import { useMindMapStore } from '@/stores/mindmap'
import type { MindMapNodeData } from '@/types/mindmap'

const props = defineProps<NodeProps<MindMapNodeData>>()

const store = useMindMapStore()
const isEditing = ref(false)
const draftText = ref(props.data.text)
const originalText = ref(props.data.text)
const inputRef = ref<HTMLTextAreaElement | null>(null)

const isSelected = computed(() => store.selectedNodeId === props.id)
const nodeLevel = computed(() => props.data.level ?? 2)
const nodeLevelClass = computed(() => `mindmap-node--level-${nodeLevel.value}`)
const accentColor = computed(() => props.data.color ?? levelAccentColors[nodeLevel.value])
const textColor = computed(() => props.data.fontColor ?? levelTextColors[nodeLevel.value])
const nodeStyle = computed(() => ({
  minHeight: `${props.data.height ?? 48}px`,
  width: `${props.data.width ?? 190}px`,
}))

const levelAccentColors = {
  0: '#2563eb',
  1: '#14b8a6',
  2: '#4b5563',
} as const

const levelTextColors = {
  0: '#0f172a',
  1: '#0f172a',
  2: '#4b5563',
} as const

watch(
  () => props.data.text,
  (text) => {
    if (!isEditing.value) {
      draftText.value = text
    }
  },
)

watch(
  () => store.editingNodeId,
  (editingNodeId) => {
    if (editingNodeId === props.id) {
      void startEditing()
      store.clearEditRequest(props.id)
    }
  },
)

async function startEditing() {
  store.selectNode(props.id)
  originalText.value = props.data.text
  draftText.value = props.data.text
  isEditing.value = true

  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
}

function saveEdit() {
  if (!isEditing.value) return

  const nextText = draftText.value.trim() || '未命名想法'
  store.updateNodeText(props.id, nextText)
  draftText.value = nextText
  originalText.value = nextText
  isEditing.value = false
}

function handleDraftInput(event: Event) {
  const textarea = event.target as HTMLTextAreaElement
  draftText.value = textarea.value
  store.updateNodeText(props.id, textarea.value)
}

function cancelEdit() {
  store.updateNodeText(props.id, originalText.value)
  draftText.value = originalText.value
  isEditing.value = false
}
</script>

<template>
  <div
    class="mindmap-node"
    :class="[
      nodeLevelClass,
      { 'mindmap-node--selected': isSelected, 'mindmap-node--editing': isEditing },
    ]"
    :style="nodeStyle"
    @dblclick.stop="startEditing"
  >
    <Handle type="target" :position="Position.Left" :connectable="props.connectable" />

    <div class="mindmap-node__accent" :style="{ backgroundColor: accentColor }" />
    <div class="mindmap-node__content">
      <textarea
        v-if="isEditing"
        ref="inputRef"
        v-model="draftText"
        class="mindmap-node__input nodrag nopan"
        @blur="saveEdit"
        @click.stop
        @dblclick.stop
        @input="handleDraftInput"
        @keydown.enter.prevent="saveEdit"
        @keydown.esc.prevent="cancelEdit"
      />
      <strong v-else :style="{ color: textColor }">{{ data.text }}</strong>
      <span v-if="!isEditing && data.note">{{ data.note }}</span>
    </div>

    <Handle type="source" :position="Position.Right" :connectable="props.connectable" />
  </div>
</template>

<style scoped>
.mindmap-node {
  position: relative;
  display: grid;
  grid-template-columns: 6px minmax(0, 1fr);
  align-items: stretch;
  box-sizing: border-box;
  min-width: 190px;
  max-width: none;
  border: 2px solid #d9e2ec;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 26px rgb(15 23 42 / 12%);
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.mindmap-node--level-0 {
  min-width: 240px;
  border-color: #bfdbfe;
  background: #eff6ff;
  box-shadow: 0 16px 36px rgb(37 99 235 / 18%);
}

.mindmap-node--level-1 {
  min-width: 215px;
  border-color: #99f6e4;
  background: #f0fdfa;
  box-shadow: 0 12px 30px rgb(20 184 166 / 14%);
}

.mindmap-node--level-2 {
  grid-template-columns: 1fr;
  border-color: #4b5563;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: none;
}

.mindmap-node--selected {
  border-color: #2563eb;
  box-shadow:
    0 0 0 3px rgb(37 99 235 / 18%),
    0 12px 30px rgb(37 99 235 / 22%);
}

.mindmap-node--level-2.mindmap-node--selected {
  border-color: #4b5563;
  box-shadow: 0 0 0 3px rgb(37 99 235 / 18%);
}

.mindmap-node--editing {
  border-color: #14b8a6;
}

.mindmap-node__accent {
  min-height: 100%;
  border-radius: 6px 0 0 6px;
}

.mindmap-node--level-2 .mindmap-node__accent {
  display: none;
}

.mindmap-node__content {
  display: grid;
  gap: 4px;
  align-content: center;
  min-width: 0;
  padding: 12px 10px 12px 14px;
}

.mindmap-node--level-2 .mindmap-node__content {
  place-items: center;
  height: 100%;
  padding: 8px;
}

.mindmap-node strong {
  overflow-wrap: anywhere;
  color: #0f172a;
  font-size: 15px;
  line-height: 1.25;
}

.mindmap-node--level-0 strong {
  font-size: 18px;
}

.mindmap-node--level-1 strong {
  font-size: 16px;
}

.mindmap-node--level-2 strong {
  display: block;
  color: #4b5563;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.2;
  text-align: center;
}

.mindmap-node__input {
  width: 100%;
  height: 100%;
  min-width: 0;
  border: 1px solid #93c5fd;
  border-radius: 6px;
  outline: none;
  overflow: hidden;
  padding: 6px 8px;
  resize: none;
  color: #0f172a;
  font: inherit;
  line-height: 1.25;
}

.mindmap-node__input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgb(37 99 235 / 16%);
}

.mindmap-node span {
  overflow-wrap: anywhere;
  color: #64748b;
  font-size: 12px;
  line-height: 1.35;
}

.mindmap-node--level-2 span {
  display: none;
}
</style>
