import type { MindNode } from '@/types/mindmap'
import { estimateNodeSize } from './nodeSize'

const ROOT_NODE_ID = 'root'
const DEFAULT_HORIZONTAL_GAP = 380
const DEFAULT_VERTICAL_GAP = 140

interface LayoutOptions {
  horizontalGap?: number
  verticalGap?: number
}

export function layoutMindMap(nodes: MindNode[], options: LayoutOptions = {}): MindNode[] {
  if (nodes.length === 0) return []

  const horizontalGap = options.horizontalGap ?? DEFAULT_HORIZONTAL_GAP
  const verticalGap = options.verticalGap ?? DEFAULT_VERTICAL_GAP
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const childrenByParent = getChildrenByParent(nodes, nodeById)
  const roots = getLayoutRoots(nodes, nodeById)
  const maxWidthByDepth = getMaxWidthByDepth(roots, childrenByParent, nodes)
  const xByDepth = getXByDepth(maxWidthByDepth, horizontalGap)
  const positions = new Map<string, MindNode['position']>()
  const sizes = new Map<string, ReturnType<typeof estimateNodeSize>>()
  const visited = new Set<string>()
  let nextRootTop = 0

  for (const root of roots) {
    const height = placeNode(root, 0, nextRootTop, new Set())
    nextRootTop += height + verticalGap
  }

  for (const node of nodes) {
    if (visited.has(node.id)) continue

    const height = placeNode(node, 0, nextRootTop, new Set())
    nextRootTop += height + verticalGap
  }

  const rootNode = getRootNode(nodes)
  const rootPosition = positions.get(rootNode.id) ?? { x: 0, y: 0 }

  return nodes.map((node) => {
    const position = positions.get(node.id) ?? node.position
    const size = sizes.get(node.id) ?? estimateNodeSize(node, nodes)

    return {
      ...node,
      position: {
        x: position.x - rootPosition.x,
        y: position.y - rootPosition.y,
      },
      data: {
        ...node.data,
        height: size.height,
        width: size.width,
      },
    }
  })

  function placeNode(node: MindNode, depth: number, top: number, ancestors: Set<string>): number {
    if (visited.has(node.id)) {
      return sizes.get(node.id)?.height ?? estimateNodeSize(node, nodes).height
    }

    const size = estimateNodeSize(node, nodes)
    sizes.set(node.id, size)

    if (ancestors.has(node.id)) {
      positions.set(node.id, { x: xByDepth.get(depth) ?? 0, y: top })
      visited.add(node.id)
      return size.height
    }

    const nextAncestors = new Set(ancestors)
    nextAncestors.add(node.id)
    const children = (childrenByParent.get(node.id) ?? []).filter(
      (child) => !nextAncestors.has(child.id),
    )

    if (children.length === 0) {
      positions.set(node.id, { x: xByDepth.get(depth) ?? 0, y: top })
      visited.add(node.id)
      return size.height
    }

    let childTop = top
    const childHeights: number[] = []

    for (const child of children) {
      const childHeight = placeNode(child, depth + 1, childTop, nextAncestors)
      childHeights.push(childHeight)
      childTop += childHeight + verticalGap
    }

    const childrenHeight =
      childHeights.reduce((total, height) => total + height, 0) +
      verticalGap * (children.length - 1)
    const subtreeHeight = Math.max(size.height, childrenHeight)
    const y = top + childrenHeight / 2 - size.height / 2

    positions.set(node.id, { x: xByDepth.get(depth) ?? 0, y })
    visited.add(node.id)

    return subtreeHeight
  }
}

function getChildrenByParent(
  nodes: MindNode[],
  nodeById: Map<string, MindNode>,
): Map<string, MindNode[]> {
  const childrenByParent = new Map<string, MindNode[]>()

  for (const node of nodes) {
    if (!node.parentId || !nodeById.has(node.parentId)) continue

    const children = childrenByParent.get(node.parentId) ?? []
    children.push(node)
    childrenByParent.set(node.parentId, children)
  }

  return childrenByParent
}

function getMaxWidthByDepth(
  roots: MindNode[],
  childrenByParent: Map<string, MindNode[]>,
  nodes: MindNode[],
): Map<number, number> {
  const maxWidthByDepth = new Map<number, number>()
  const visited = new Set<string>()

  function visit(node: MindNode, depth: number) {
    if (visited.has(node.id)) return

    visited.add(node.id)
    const width = estimateNodeSize(node, nodes).width
    maxWidthByDepth.set(depth, Math.max(maxWidthByDepth.get(depth) ?? 0, width))

    for (const child of childrenByParent.get(node.id) ?? []) {
      visit(child, depth + 1)
    }
  }

  roots.forEach((root) => visit(root, 0))
  nodes.forEach((node) => visit(node, 0))

  return maxWidthByDepth
}

function getXByDepth(
  maxWidthByDepth: Map<number, number>,
  horizontalGap: number,
): Map<number, number> {
  const xByDepth = new Map<number, number>()
  const maxDepth = Math.max(...maxWidthByDepth.keys(), 0)
  let x = 0

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    xByDepth.set(depth, x)
    x += (maxWidthByDepth.get(depth) ?? 0) + horizontalGap
  }

  return xByDepth
}

function getLayoutRoots(nodes: MindNode[], nodeById: Map<string, MindNode>): MindNode[] {
  const rootNode = getRootNode(nodes)
  const roots = nodes.filter((node) => node.parentId === null || !nodeById.has(node.parentId))

  return [rootNode, ...roots.filter((node) => node.id !== rootNode.id)]
}

function getRootNode(nodes: MindNode[]): MindNode {
  const rootNode =
    nodes.find((node) => node.id === ROOT_NODE_ID) ?? nodes.find((node) => node.parentId === null)

  if (!rootNode) {
    throw new Error('Cannot layout an empty mind map')
  }

  return rootNode
}
