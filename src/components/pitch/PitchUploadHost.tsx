'use client'

import { useEffect, useState } from 'react'
import PitchUploadSheet, {
  type OptimisticUpload,
  type UploadCommit,
} from '@/components/pitch/PitchUploadSheet'

type GroupHit = { id: string; name: string; slug: string }

/**
 * Global pitch upload sheet so Upload works from chrome and subgroup pages,
 * not only the home graph. Graph pages listen for pitch:upload-* events.
 */
export default function PitchUploadHost() {
  const [open, setOpen] = useState(false)
  const [preferredGroup, setPreferredGroup] = useState<GroupHit | null>(null)

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as { group?: GroupHit } | undefined
      setPreferredGroup(detail?.group ?? null)
      setOpen(true)
    }
    window.addEventListener('pitch:open-upload', onOpen as EventListener)
    return () => window.removeEventListener('pitch:open-upload', onOpen as EventListener)
  }, [])

  const emit = (name: string, detail: unknown) => {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  }

  return (
    <PitchUploadSheet
      open={open}
      onClose={() => {
        setOpen(false)
        setPreferredGroup(null)
      }}
      preferredGroup={preferredGroup}
      onOptimistic={(upload: OptimisticUpload) => emit('pitch:upload-optimistic', upload)}
      onCommit={(commit: UploadCommit) => emit('pitch:upload-commit', commit)}
      onFail={(tempPostId, tempHubId, message) =>
        emit('pitch:upload-fail', { tempPostId, tempHubId, message })
      }
    />
  )
}
