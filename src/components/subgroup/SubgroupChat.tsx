'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { isPitchMode } from '@/lib/pitch-mode'

type ChatMessage = {
  id: string
  username: string
  content: string
  created_at: string
  author_external_id: string
}

export default function SubgroupChat({
  subgroupId,
  subgroupName,
}: {
  subgroupId: string
  subgroupName: string
}) {
  const { isAuthenticated } = useAuth()
  const pitchMode = isPitchMode()
  const canChat = isAuthenticated || pitchMode
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [guestName, setGuestName] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/subgroup-chat?subgroupId=${encodeURIComponent(subgroupId)}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setMessages(data.messages || [])
      setError('')
    } catch (e: any) {
      setError(e?.message || 'Could not load chat')
    } finally {
      setLoading(false)
    }
  }, [subgroupId])

  useEffect(() => {
    void load()
    const t = window.setInterval(() => void load(), 8000)
    return () => window.clearInterval(t)
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async () => {
    const content = text.trim()
    if (!content || !canChat || sending) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/subgroup-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subgroupId,
          content,
          username: guestName || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setText('')
      if (data.message) {
        setMessages((prev) => [...prev, data.message])
      } else {
        await load()
      }
    } catch (e: any) {
      setError(e?.message || 'Could not send')
    } finally {
      setSending(false)
    }
  }

  const timeAgo = (iso: string) => {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    return `${Math.floor(s / 86400)}d`
  }

  return (
    <div className="border border-black flex flex-col min-h-[28rem] max-h-[70vh] bg-white">
      <div className="border-b border-black px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-black/50 font-['Space_Mono']">
          {subgroupName} · room chat
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <p className="text-xs font-['Space_Mono'] text-black/40">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm font-['Space_Mono'] text-black/50">
            No messages yet. Say hello to the room.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="font-['Space_Mono']">
              <div className="flex items-baseline gap-2 text-[10px] uppercase tracking-wide text-black/40">
                <span className="text-black/70">{m.username}</span>
                <span>{timeAgo(m.created_at)}</span>
              </div>
              <p className="text-sm text-black mt-1 whitespace-pre-wrap break-words">
                {m.content}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-black p-3 space-y-2">
        {error && (
          <p className="text-xs font-['Space_Mono'] text-red-600">{error}</p>
        )}
        {!canChat ? (
          <p className="text-xs font-['Space_Mono'] text-black/50">
            Sign in to chat in this group.
          </p>
        ) : (
          <>
            {pitchMode && !isAuthenticated && (
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="username (optional)"
                maxLength={24}
                className="w-full border border-black/20 px-3 py-2 text-xs font-['Space_Mono']"
              />
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
                placeholder="Message the room…"
                maxLength={1000}
                className="flex-1 border border-black px-3 py-2 text-sm font-['Space_Mono']"
              />
              <button
                type="button"
                disabled={sending || !text.trim()}
                onClick={() => void send()}
                className="border border-black bg-black text-white px-4 py-2 text-xs font-['Space_Mono'] uppercase disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
