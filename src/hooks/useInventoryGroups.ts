import { useCallback, useEffect, useState } from 'react'
import { fetchInventoryGroups } from '../lib/inventoryGroups'
import type { InventoryGroup } from '../lib/supabase'

export function useInventoryGroups() {
  const [groups, setGroups] = useState<InventoryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchInventoryGroups()
      setGroups(data)
    } catch (err) {
      console.error(err)
      setError('فشل تحميل مجموعات الجرد')
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { groups, loading, error, reload }
}
