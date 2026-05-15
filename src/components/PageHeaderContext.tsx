import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export interface PageHeaderState {
  title: string
  onBack: () => void
}

interface PageHeaderContextValue {
  header: PageHeaderState | null
  register: (state: PageHeaderState) => () => void
}

const PageHeaderContext = createContext<PageHeaderContextValue>({
  header: null,
  register: () => () => {},
})

let nextId = 0

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<{ id: number; state: PageHeaderState }[]>([])

  const register = useCallback((state: PageHeaderState) => {
    const id = nextId++
    setEntries(prev => [...prev, { id, state }])
    return () => {
      setEntries(prev => prev.filter(e => e.id !== id))
    }
  }, [])

  const header = entries.length > 0 ? entries[entries.length - 1].state : null

  return (
    <PageHeaderContext.Provider value={{ header, register }}>
      {children}
    </PageHeaderContext.Provider>
  )
}

export function usePageHeader() {
  return useContext(PageHeaderContext)
}

/** Register a header override for the lifetime of the component. Pass `null` to clear. */
export function usePageHeaderOverride(state: PageHeaderState | null, deps: unknown[]) {
  const { register } = usePageHeader()
  useEffect(() => {
    if (!state) return
    const unregister = register(state)
    return unregister
  }, deps)
}
