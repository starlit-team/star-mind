import type { MindEdge, MindMapData, MindMapStyle, MindNode } from '@/types/mindmap'

const STORAGE_KEY = 'star-mind:mindmap'
const LEGACY_STORAGE_KEY = 'star-mind:snapshot'
const DEFAULT_SAVE_DELAY = 500
const EXPORT_FILE_NAME = 'star-mind.json'
const DEFAULT_STYLE: MindMapStyle = {
  fontColor: '#111827',
  edgeColor: '#94a3b8',
  edgeWidth: 2,
  horizontalGap: 380,
  verticalGap: 140,
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

export function loadMindMapData(): MindMapData | null {
  const savedData = readStorageItem(STORAGE_KEY) ?? readStorageItem(LEGACY_STORAGE_KEY)
  return savedData ? validateMindMapData(savedData) : null
}

export function saveMindMapData(data: MindMapData): void {
  cancelPendingSave()
  writeStorageItem(STORAGE_KEY, JSON.stringify(data))
}

export function debounceSaveMindMapData(data: MindMapData, delay = DEFAULT_SAVE_DELAY): void {
  cancelPendingSave()

  const serializedData = JSON.stringify(data)
  saveTimer = setTimeout(() => {
    writeStorageItem(STORAGE_KEY, serializedData)
    saveTimer = null
  }, delay)
}

export function clearMindMapData(): void {
  cancelPendingSave()
  removeStorageItem(STORAGE_KEY)
  removeStorageItem(LEGACY_STORAGE_KEY)
}

export function exportJson(data: MindMapData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = EXPORT_FILE_NAME
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function importJson(file: File): Promise<MindMapData | null> {
  try {
    const rawJson = await file.text()
    const parsedData = JSON.parse(rawJson) as unknown

    return validateMindMapData(parsedData)
  } catch {
    return null
  }
}

export function validateMindMapData(value: unknown): MindMapData | null {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return null
  }

  const nodes = normalizeNodes(value.nodes)
  if (nodes.length === 0) return null

  const firstNode = nodes[0]
  if (!firstNode) return null

  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = normalizeEdges(value.edges, nodeIds)
  const existingEdgeIds = new Set(edges.map((edge) => edge.id))

  for (const node of nodes) {
    if (!node.parentId || !nodeIds.has(node.parentId)) continue

    const edgeId = `${node.parentId}-${node.id}`
    if (existingEdgeIds.has(edgeId)) continue

    edges.push({
      id: edgeId,
      source: node.parentId,
      target: node.id,
      type: 'smoothstep',
    })
    existingEdgeIds.add(edgeId)
  }

  const selectedNodeId =
    typeof value.selectedNodeId === 'string' && nodeIds.has(value.selectedNodeId)
      ? value.selectedNodeId
      : firstNode.id

  return {
    nodes,
    edges,
    selectedNodeId,
    style: normalizeStyle(value.style),
  }
}

export const loadSnapshot = loadMindMapData
export const saveSnapshot = saveMindMapData
export const clearSnapshot = clearMindMapData

function cancelPendingSave(): void {
  if (!saveTimer) return

  clearTimeout(saveTimer)
  saveTimer = null
}

function readStorageItem(key: string): unknown | null {
  try {
    if (typeof localStorage === 'undefined') return null

    const rawData = localStorage.getItem(key)
    return rawData ? (JSON.parse(rawData) as unknown) : null
  } catch {
    return null
  }
}

function writeStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return

    localStorage.setItem(key, value)
  } catch {
    // Saving is best-effort so a storage quota or privacy-mode error does not interrupt editing.
  }
}

function removeStorageItem(key: string): void {
  try {
    if (typeof localStorage === 'undefined') return

    localStorage.removeItem(key)
  } catch {
    // Clearing is best-effort for the same reason saving is.
  }
}

function normalizeNodes(value: unknown[]): MindNode[] {
  const nodes: MindNode[] = []
  const nodeIds = new Set<string>()

  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== 'string' || item.id.trim() === '') continue
    if (!isRecord(item.data) || typeof item.data.text !== 'string') continue
    if (!isRecord(item.position)) continue
    if (!isFiniteNumber(item.position.x) || !isFiniteNumber(item.position.y)) continue
    if (nodeIds.has(item.id)) continue

    nodes.push({
      id: item.id,
      type: 'mindmap',
      parentId: typeof item.parentId === 'string' ? item.parentId : null,
      position: {
        x: item.position.x,
        y: item.position.y,
      },
      data: {
        text: item.data.text.trim() || '未命名想法',
        ...(typeof item.data.note === 'string' ? { note: item.data.note } : {}),
        ...(typeof item.data.color === 'string' ? { color: item.data.color } : {}),
        ...(isHexColor(item.data.fontColor) ? { fontColor: item.data.fontColor } : {}),
      },
    })
    nodeIds.add(item.id)
  }

  return nodes.map((node) => ({
    ...node,
    parentId: node.parentId && nodeIds.has(node.parentId) ? node.parentId : null,
  }))
}

function normalizeEdges(value: unknown[], nodeIds: Set<string>): MindEdge[] {
  const edges: MindEdge[] = []
  const edgeIds = new Set<string>()

  for (const item of value) {
    if (!isRecord(item)) continue
    if (typeof item.source !== 'string' || typeof item.target !== 'string') continue
    if (!nodeIds.has(item.source) || !nodeIds.has(item.target)) continue

    const id =
      typeof item.id === 'string' && item.id.trim() !== ''
        ? item.id
        : `${item.source}-${item.target}`
    if (edgeIds.has(id)) continue

    edges.push({
      id,
      source: item.source,
      target: item.target,
      type: 'smoothstep',
    })
    edgeIds.add(id)
  }

  return edges
}

function normalizeStyle(value: unknown): MindMapStyle {
  if (!isRecord(value)) return { ...DEFAULT_STYLE }

  return {
    fontColor: isHexColor(value.fontColor) ? value.fontColor : DEFAULT_STYLE.fontColor,
    edgeColor: isHexColor(value.edgeColor) ? value.edgeColor : DEFAULT_STYLE.edgeColor,
    edgeWidth: clampNumber(value.edgeWidth, 1, 8, DEFAULT_STYLE.edgeWidth),
    horizontalGap: clampNumber(value.horizontalGap, 260, 640, DEFAULT_STYLE.horizontalGap),
    verticalGap: clampNumber(value.verticalGap, 90, 280, DEFAULT_STYLE.verticalGap),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (!isFiniteNumber(value)) return fallback

  return Math.min(max, Math.max(min, value))
}
