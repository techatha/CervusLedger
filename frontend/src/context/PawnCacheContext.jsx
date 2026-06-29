import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ListPawnsSorted } from 'wailsjs/go/pawn_handler/PawnHandler'

const PawnCacheContext = createContext(null)

export function PawnCacheProvider({ children }) {
  const [activePawns, setActivePawns] = useState([])
  const [inactivePawns, setInactivePawns] = useState([])
  const [forfeitedPawns, setForfeitedPawns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reloadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [active, inactive, forfeited] = await Promise.all([
        ListPawnsSorted('active', '', 'desc'),
        ListPawnsSorted('ถอน', '', 'desc'),
        ListPawnsSorted('ขาด', '', 'desc'),
      ])
      setActivePawns(active || [])
      setInactivePawns(inactive || [])
      setForfeitedPawns(forfeited || [])
      setError(null)
    } catch (e) {
      console.error('Failed to reload pawn cache:', e)
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reloadAll()
  }, [reloadAll])

  return (
    <PawnCacheContext.Provider value={{
      activePawns,
      inactivePawns,
      forfeitedPawns,
      loading,
      error,
      reloadAll
    }}>
      {children}
    </PawnCacheContext.Provider>
  )
}

export function usePawnCache() {
  const context = useContext(PawnCacheContext)
  if (!context) {
    throw new Error('usePawnCache must be used within a PawnCacheProvider')
  }
  return context
}
