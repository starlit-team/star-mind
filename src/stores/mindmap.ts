import { computed, ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import type { MindEdge, MindMapData, MindMapStyle, MindNode } from '@/types/mindmap'
import { layoutMindMap } from '@/utils/layout'
import {
  clearMindMapData,
  debounceSaveMindMapData,
  exportJson as exportMindMapJson,
  importJson,
  loadMindMapData,
  saveMindMapData,
} from '@/utils/storage'

const ROOT_NODE_ID = 'root'

const defaultStyle: MindMapStyle = {
  fontColor: '#111827',
  edgeColor: '#94a3b8',
  edgeWidth: 2,
  horizontalGap: 380,
  verticalGap: 140,
}

const rootNode: MindNode = {
  id: ROOT_NODE_ID,
  type: 'mindmap',
  parentId: null,
  position: { x: 0, y: 0 },
  data: {
    text: '中心主题',
    note: '从这里开始展开你的想法',
    color: '#2563eb',
  },
}

function cloneNode(node: MindNode): MindNode {
  return {
    ...node,
    data: { ...node.data },
    position: { ...node.position },
  }
}

function createRootMap(): MindMapData {
  return {
    nodes: [cloneNode(rootNode)],
    edges: [],
    selectedNodeId: ROOT_NODE_ID,
    style: { ...defaultStyle },
  }
}

function createNode(parent: MindNode, style: MindMapStyle, text = '新想法'): MindNode {
  return {
    id: nanoid(),
    type: 'mindmap',
    parentId: parent.id,
    position: {
      x: parent.position.x + style.horizontalGap,
      y: parent.position.y + style.verticalGap,
    },
    data: { text },
  }
}

function createEdge(parentId: string, childId: string): MindEdge {
  return {
    id: `${parentId}-${childId}`,
    source: parentId,
    target: childId,
    type: 'smoothstep',
  }
}

function normalizeNode(node: MindNode): MindNode {
  const legacyData = node.data as MindNode['data'] & { title?: string }

  return {
    ...node,
    type: 'mindmap',
    parentId: node.parentId ?? null,
    data: {
      ...node.data,
      text: legacyData.text ?? legacyData.title ?? '未命名想法',
    },
  }
}

function normalizeMapData(mapData: MindMapData | null): MindMapData {
  if (!mapData || mapData.nodes.length === 0) {
    return createRootMap()
  }

  const childIds = new Set(mapData.edges.map((edge) => edge.target))
  const nodes = mapData.nodes.map((node) => normalizeNode(node))
  const nextNodes = nodes.map((node) => ({
    ...node,
    parentId: node.id === ROOT_NODE_ID ? null : node.parentId,
  }))

  if (!nextNodes.some((node) => node.id === ROOT_NODE_ID)) {
    const fallback = createRootMap()
    return {
      ...fallback,
      nodes: [...fallback.nodes, ...nextNodes],
    }
  }

  return {
    nodes: nextNodes.map((node) => ({
      ...node,
      parentId:
        node.id === ROOT_NODE_ID ? null : (node.parentId ?? findParentId(mapData.edges, node.id)),
    })),
    edges: mapData.edges,
    selectedNodeId: mapData.selectedNodeId ?? (childIds.has(ROOT_NODE_ID) ? null : ROOT_NODE_ID),
    style: normalizeStyle(mapData.style),
  }
}

function normalizeStyle(style: MindMapData['style']): MindMapStyle {
  return {
    fontColor: isHexColor(style?.fontColor) ? style.fontColor : defaultStyle.fontColor,
    edgeColor: isHexColor(style?.edgeColor) ? style.edgeColor : defaultStyle.edgeColor,
    edgeWidth: clampNumber(style?.edgeWidth, 1, 8, defaultStyle.edgeWidth),
    horizontalGap: clampNumber(style?.horizontalGap, 260, 640, defaultStyle.horizontalGap),
    verticalGap: clampNumber(style?.verticalGap, 90, 280, defaultStyle.verticalGap),
  }
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback

  return Math.min(max, Math.max(min, value))
}

function findParentId(edges: MindEdge[], nodeId: string): string | null {
  return edges.find((edge) => edge.target === nodeId)?.source ?? null
}

function getDescendantIds(edges: MindEdge[], nodeId: string): Set<string> {
  const childrenByParent = new Map<string, string[]>()

  for (const edge of edges) {
    const children = childrenByParent.get(edge.source) ?? []
    children.push(edge.target)
    childrenByParent.set(edge.source, children)
  }

  const descendants = new Set<string>()
  const stack = [...(childrenByParent.get(nodeId) ?? [])]

  while (stack.length > 0) {
    const currentId = stack.pop()
    if (!currentId || descendants.has(currentId)) continue

    descendants.add(currentId)
    stack.push(...(childrenByParent.get(currentId) ?? []))
  }

  return descendants
}

export const useMindMapStore = defineStore('mindmap', () => {
  const initialData = normalizeMapData(typeof window === 'undefined' ? null : loadMindMapData())
  const mindMapStyle = ref<MindMapStyle>(normalizeStyle(initialData.style))
  const nodes = shallowRef<MindNode[]>(layoutMindMap(initialData.nodes, mindMapStyle.value))
  const edges = shallowRef<MindEdge[]>(initialData.edges)
  const selectedNodeId = ref<string | null>(initialData.selectedNodeId)
  const editingNodeId = ref<string | null>(null)

  const mindMapData = computed<MindMapData>(() => ({
    nodes: nodes.value,
    edges: edges.value,
    selectedNodeId: selectedNodeId.value,
    style: mindMapStyle.value,
  }))

  const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedNodeId.value))

  function addChildNode(parentId: string): string | null {
    const parent = nodes.value.find((node) => node.id === parentId)
    if (!parent) return null

    const child = createNode(parent, mindMapStyle.value)
    nodes.value = [...nodes.value, child]
    edges.value = [...edges.value, createEdge(parent.id, child.id)]
    selectedNodeId.value = child.id
    autoLayout()

    return child.id
  }

  function addSiblingNode(nodeId: string): string | null {
    const node = nodes.value.find((item) => item.id === nodeId)
    if (!node || node.parentId === null) return null

    return addChildNode(node.parentId)
  }

  function updateNodeText(id: string, text: string): void {
    nodes.value = nodes.value.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, text } } : node,
    )
    autoLayout()
  }

  function deleteNode(id: string): void {
    if (id === ROOT_NODE_ID) return

    const deletedNode = nodes.value.find((node) => node.id === id)
    if (!deletedNode) return

    const idsToDelete = getDescendantIds(edges.value, id)
    idsToDelete.add(id)

    nodes.value = nodes.value.filter((node) => !idsToDelete.has(node.id))
    edges.value = edges.value.filter(
      (edge) => !idsToDelete.has(edge.source) && !idsToDelete.has(edge.target),
    )
    selectedNodeId.value = deletedNode.parentId ?? ROOT_NODE_ID
    autoLayout()
  }

  function selectNode(id: string | null): void {
    selectedNodeId.value = id && nodes.value.some((node) => node.id === id) ? id : null
  }

  function requestEditNode(id: string | null = selectedNodeId.value): void {
    editingNodeId.value = id && nodes.value.some((node) => node.id === id) ? id : null
  }

  function clearEditRequest(id: string): void {
    if (editingNodeId.value === id) {
      editingNodeId.value = null
    }
  }

  function autoLayout(): void {
    nodes.value = layoutMindMap(nodes.value, mindMapStyle.value)
  }

  function updateStyle(nextStyle: Partial<MindMapStyle>): void {
    const currentStyle = mindMapStyle.value
    const normalizedStyle = normalizeStyle({
      ...currentStyle,
      ...nextStyle,
    })
    const shouldLayout =
      normalizedStyle.horizontalGap !== currentStyle.horizontalGap ||
      normalizedStyle.verticalGap !== currentStyle.verticalGap

    mindMapStyle.value = normalizedStyle

    if (shouldLayout) {
      autoLayout()
    }
  }

  function replaceMap(
    nextNodes: MindNode[],
    nextEdges: MindEdge[],
    nextSelectedNodeId: string | null = nextNodes[0]?.id ?? ROOT_NODE_ID,
  ): void {
    const nextData = normalizeMapData({
      nodes: nextNodes,
      edges: nextEdges,
      selectedNodeId: nextSelectedNodeId,
    })

    nodes.value = nextData.nodes
    edges.value = nextData.edges
    selectedNodeId.value = nextData.selectedNodeId
    mindMapStyle.value = normalizeStyle(nextData.style)
    autoLayout()
  }

  function resetMap(): void {
    const nextData = createRootMap()
    nodes.value = nextData.nodes
    edges.value = nextData.edges
    selectedNodeId.value = nextData.selectedNodeId
    mindMapStyle.value = normalizeStyle(nextData.style)
    clearMindMapData()
  }

  function persist(): void {
    saveMindMapData(mindMapData.value)
  }

  function exportJson(): void {
    exportMindMapJson(mindMapData.value)
  }

  async function importJsonFile(file: File): Promise<boolean> {
    const nextData = await importJson(file)
    if (!nextData) return false

    replaceMap(nextData.nodes, nextData.edges, nextData.selectedNodeId)
    return true
  }

  watch(mindMapData, (data) => {
    debounceSaveMindMapData(data)
  })

  return {
    nodes,
    edges,
    mindMapStyle,
    selectedNodeId,
    editingNodeId,
    selectedNode,
    mindMapData,
    addChildNode,
    addSiblingNode,
    updateNodeText,
    deleteNode,
    selectNode,
    requestEditNode,
    clearEditRequest,
    autoLayout,
    updateStyle,
    replaceMap,
    resetMap,
    persist,
    exportJson,
    importJsonFile,
    addChild: addChildNode,
    updateNodeTitle: updateNodeText,
  }
})
