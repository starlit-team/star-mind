import type { Edge, Node } from '@vue-flow/core'

export type MindNodeLevel = 0 | 1 | 2

export interface MindNodeData extends Record<string, unknown> {
  text: string
  note?: string
  color?: string
  fontColor?: string
  level?: MindNodeLevel
  width?: number
  height?: number
}

type MindMapCustomEvents = Record<string, never>

export type MindNode = Omit<Node<MindNodeData, MindMapCustomEvents, 'mindmap'>, 'data' | 'type'> & {
  data: MindNodeData
  parentId: string | null
  type: 'mindmap'
}

export type MindEdge = Edge<Record<string, never>, MindMapCustomEvents, 'smoothstep'>

export interface MindMapData {
  nodes: MindNode[]
  edges: MindEdge[]
  selectedNodeId: string | null
  style?: MindMapStyle
}

export interface MindMapStyle {
  fontColor: string
  edgeColor: string
  edgeWidth: number
  horizontalGap: number
  verticalGap: number
}

export interface MindMapSnapshot extends MindMapData {
  updatedAt: string
}

export type MindMapNodeData = MindNodeData
export type MindMapNode = MindNode
export type MindMapEdge = MindEdge
