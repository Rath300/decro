'use client'

import { useEffect, useState } from 'react'

export default function VersionIndicator() {
  const [version, setVersion] = useState('alpha 0.01')

  useEffect(() => {
    // Fetch version from the JSON file
    fetch('/api/version')
      .then(res => res.json())
      .then(data => setVersion(data.version))
      .catch(() => setVersion('alpha 0.01'))
  }, [])

  return (
    <div className="fixed bottom-4 right-4 text-xs font-['Space_Mono'] text-gray-500 bg-white/80 backdrop-blur-sm px-2 py-1 rounded border border-gray-300 z-50">
      {version}
    </div>
  )
}

