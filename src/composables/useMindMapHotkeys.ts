import { onBeforeUnmount, onMounted } from 'vue'
import { useMindMapStore } from '@/stores/mindmap'

export function useMindMapHotkeys(): void {
  const store = useMindMapStore()

  function handleKeydown(event: KeyboardEvent) {
    if (isTextField(event.target)) return

    const selectedNodeId = store.selectedNodeId
    const key = event.key.toLowerCase()

    if ((event.metaKey || event.ctrlKey) && key === 's') {
      event.preventDefault()
      store.persist()
      return
    }

    if (!selectedNodeId) return

    switch (event.key) {
      case 'Tab':
        event.preventDefault()
        store.addChildNode(selectedNodeId)
        break
      case 'Enter':
        event.preventDefault()
        store.addSiblingNode(selectedNodeId)
        break
      case 'Delete':
      case 'Backspace':
        event.preventDefault()
        store.deleteNode(selectedNodeId)
        break
      case 'F2':
        event.preventDefault()
        store.requestEditNode(selectedNodeId)
        break
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
}

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  )
}
