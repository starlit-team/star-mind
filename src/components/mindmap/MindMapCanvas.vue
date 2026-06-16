<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { storeToRefs } from 'pinia'
import {
  VueFlow,
  type Edge,
  type Node,
  type NodeMouseEvent,
  type VueFlowStore,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import MindMapFloatingMenu from './MindMapFloatingMenu.vue'
import MindMapNode from './MindMapNode.vue'
import { useMindMapHotkeys } from '@/composables/useMindMapHotkeys'
import { useMindMapStore } from '@/stores/mindmap'
import type { MindNode, MindNodeData, MindNodeLevel } from '@/types/mindmap'

const ROOT_NODE_ID = 'root'

type FlowMindNode = Node<MindNodeData, Record<string, never>, 'mindmap'>
type FlowMindEdge = Edge<Record<string, never>, Record<string, never>, 'smoothstep'>

const store = useMindMapStore()
const { mindMapStyle, nodes } = storeToRefs(store)
useMindMapHotkeys()

const nodeTypes = {
  mindmap: markRaw(MindMapNode),
}

const flowNodes = computed<FlowMindNode[]>(() => nodes.value.map(toFlowNode))
const flowEdges = computed<FlowMindEdge[]>(() =>
  nodes.value.flatMap((node) => {
    if (!node.parentId) return []

    return [
      {
        id: `${node.parentId}-${node.id}`,
        source: node.parentId,
        target: node.id,
        type: 'smoothstep',
        style: {
          stroke: mindMapStyle.value.edgeColor,
          strokeWidth: mindMapStyle.value.edgeWidth,
        },
      },
    ]
  }),
)

function toFlowNode(node: MindNode): FlowMindNode {
  return {
    id: node.id,
    type: 'mindmap',
    position: node.position,
    data: {
      ...node.data,
      fontColor: mindMapStyle.value.fontColor,
      level: getNodeLevel(node),
    },
  }
}

function getNodeLevel(node: MindNode): MindNodeLevel {
  if (!node.parentId) return 0

  const parent = nodes.value.find((item) => item.id === node.parentId)
  return parent?.parentId ? 2 : 1
}

function handlePaneReady(flow: VueFlowStore) {
  centerRootNode(flow)
}

function centerRootNode(flow: VueFlowStore) {
  const rootNode = nodes.value.find((node) => node.id === ROOT_NODE_ID)
  if (!rootNode) return

  flow.setCenter(
    rootNode.position.x + (rootNode.data.width ?? 240) / 2,
    rootNode.position.y + (rootNode.data.height ?? 76) / 2,
    {
      zoom: 1,
    },
  )
}

function handleNodeClick(event: NodeMouseEvent) {
  store.selectNode(event.node.id)
}
</script>

<template>
  <section class="mindmap-shell">
    <MindMapFloatingMenu />
    <VueFlow
      :nodes="flowNodes"
      :edges="flowEdges"
      class="mindmap-canvas"
      :node-types="nodeTypes"
      :min-zoom="0.25"
      :max-zoom="1.8"
      :pan-on-drag="true"
      :zoom-on-scroll="true"
      :zoom-on-pinch="true"
      :zoom-on-double-click="false"
      @pane-ready="handlePaneReady"
      @node-click="handleNodeClick"
      @pane-click="store.selectNode(null)"
    >
      <Background pattern-color="#cbd5e1" :gap="24" />
      <MiniMap pannable zoomable />
      <Controls />
    </VueFlow>
  </section>
</template>

<style scoped>
.mindmap-shell {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #edf2f7;
}

.mindmap-canvas {
  width: 100%;
  height: 100%;
}
</style>
