import type { MindNode, MindNodeLevel } from '@/types/mindmap'

export interface MindNodeSize {
  width: number
  height: number
}

const NODE_SIZE_BY_LEVEL: Record<
  MindNodeLevel,
  {
    minWidth: number
    maxWidth: number
    baseHeight: number
    charsPerLine: number
    lineHeight: number
  }
> = {
  0: { minWidth: 240, maxWidth: 460, baseHeight: 72, charsPerLine: 18, lineHeight: 22 },
  1: { minWidth: 215, maxWidth: 420, baseHeight: 50, charsPerLine: 18, lineHeight: 20 },
  2: { minWidth: 116, maxWidth: 360, baseHeight: 48, charsPerLine: 14, lineHeight: 18 },
}

export function getNodeLevel(node: MindNode, nodes: MindNode[]): MindNodeLevel {
  if (!node.parentId) return 0

  const parent = nodes.find((item) => item.id === node.parentId)
  return parent?.parentId ? 2 : 1
}

export function estimateNodeSize(node: MindNode, nodes: MindNode[] = [node]): MindNodeSize {
  return estimateNodeSizeByText(node.data.text, getNodeLevel(node, nodes))
}

export function estimateNodeSizeByText(text: string, level: MindNodeLevel): MindNodeSize {
  const size = NODE_SIZE_BY_LEVEL[level]
  const normalizedText = text.trim() || '未命名想法'
  const longestSegment = Math.max(
    ...normalizedText.split(/\s+/).map((segment) => segment.length),
    normalizedText.length,
  )
  const widthByText = 40 + Math.min(longestSegment, size.charsPerLine) * 14
  const width = Math.min(size.maxWidth, Math.max(size.minWidth, widthByText))
  const lineCount = Math.max(1, Math.ceil(normalizedText.length / size.charsPerLine))
  const height = Math.max(size.baseHeight, 24 + lineCount * size.lineHeight)

  return { width, height }
}
