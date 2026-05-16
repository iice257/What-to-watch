import { useEffect, useState } from 'react'
import { store } from './store'
import { initVoroforce } from './vf'

export function Voroforce() {
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const tryInit = () => {
      try {
        initVoroforce()
      } catch (e) {
        setError(e as Error)
      }
    }

    // attempt initial
    void tryInit()
    const unsub = store.subscribe(
      (s) => s.preset,
      () => {
        setTimeout(() => {
          void tryInit()
        }, 700)
      },
    )
    return () => {
      unsub()
    }
  }, [])

  if (error) {
    throw error
  }

  return null
}
