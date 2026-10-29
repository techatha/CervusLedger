import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { GetCategorizedPawns } from 'wailsjs/go/pawn_handler/PawnHandler'

const PawnCacheContext = createContext(null)

export function PawnCacheProvider({ children }) {
  const [activePawns, setActivePawns] = useState([])
  const [inactivePawns, setInactivePawns] = useState([])
  const [forfeitedPawns, setForfeitedPawns] = useState([])
  const [counts, setCounts] = useState({ active: 0, forfeited: 0, redeemed: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reloadAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await GetCategorizedPawns('desc')
      setActivePawns(data.active || [])
      setInactivePawns(data.redeemed || [])
      setForfeitedPawns(data.forfeited || [])
      setCounts(data.counts || { active: 0, forfeited: 0, redeemed: 0, total: 0 })
      setError(null)
    } catch (e) {
      console.error('Failed to reload pawn cache:', e)
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reloadAll()
  }, [reloadAll])

  return (
    <PawnCacheContext.Provider value={{
      activePawns,
      inactivePawns,
      forfeitedPawns,
      counts,
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
