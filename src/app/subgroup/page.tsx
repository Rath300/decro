"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import supabase from '@/lib/supabase-client'
// header/menu are global in layout
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import AuthModal from '@/components/auth-modal'
 
import { motion, AnimatePresence } from 'framer-motion'

type Subgroup = { id: string; name: string; slug: string; description?: string | null }

export default function SubgroupIndex() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Subgroup[]>([])
  const [filtered, setFiltered] = useState<Subgroup[]>([])
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authAction, setAuthAction] = useState('')

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('subgroups').select('id,name,slug,description').order('name')
      setItems(data || [])
      setFiltered(data || [])
    })()
  }, [])

  useEffect(() => {
    const v = q.trim().toLowerCase()
    if (!v) { setFiltered(items); return }
    setFiltered(items.filter(s => s.name.toLowerCase().includes(v) || s.slug.toLowerCase().includes(v)))
  }, [q, items])

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-black">Subgroups</h1>
          <button
            onClick={() => {
              if (!isAuthenticated) {
                setAuthAction('create a niche')
                setShowAuthModal(true)
              } else {
                router.push('/subgroup/create')
              }
            }}
            className="px-3 py-1 border border-black text-black hover:bg-black hover:text-white text-sm"
          >
            Create Niche
          </button>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search subgroups..."
          className="w-full p-3 border border-gray-300 text-sm text-black mb-6"
        />

        {filtered.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-black">
            <p className="text-black">No subgroups yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {filtered.map((s, index) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.05,
                    ease: "easeOut"
                  }}
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link href={`/subgroup/${s.slug}`} className="block border border-black p-3 bg-white hover:bg-gray-50 transition-colors duration-200">
                    <div className="text-black font-bold mb-1">{s.name}</div>
                    <div className="text-xs text-gray-600">/{s.slug}</div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} action={authAction} />
    </div>
  )
}


