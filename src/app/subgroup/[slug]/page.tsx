'use client'

import { useParams } from 'next/navigation'
import { usePosts } from '@/context/post-context'
import type { MediaCard } from '@/context/post-context'
import CardGrid from '@/components/card-grid'
import DetailModal from '@/components/detail-modal'
import SubgroupChat from '@/components/subgroup/SubgroupChat'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase-client'
import { callRpc } from '@/lib/rpc'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { useUserHistory } from '@/hooks/use-user-history'
import { isPitchMode } from '@/lib/pitch-mode'

type Tab = 'posts' | 'chat'

export default function SubgroupDetail() {
  const params = useParams() as { slug: string }
  const { posts } = usePosts()
  const { user } = useAuth()
  const toast = useToast()
  const { trackAction } = useUserHistory()
  const pitchMode = isPitchMode()
  const [subgroupId, setSubgroupId] = useState<string | null>(null)
  const [subgroupData, setSubgroupData] = useState<any>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [isModerator, setIsModerator] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sortMode, setSortMode] = useState<'new' | 'hot' | 'top'>('new')
  const [tab, setTab] = useState<Tab>('posts')

  useEffect(() => {
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('subgroups')
          .select(
            `
            id, 
            name, 
            description, 
            slug,
            cover_image_url,
            created_by,
            created_at,
            member_count,
            post_count
          `
          )
          .eq('slug', params.slug)
          .maybeSingle()

        if (error) throw error
        if (!data) {
          setSubgroupData(null)
          return
        }

        setSubgroupId(data.id)

        let creator_username = null
        if (data.created_by) {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username')
              .eq('external_id', data.created_by)
              .maybeSingle()
            creator_username = profileData?.username || data.created_by
          } catch {
            creator_username = data.created_by
          }
        }

        setSubgroupData({ ...data, creator_username })

        if (user?.id) {
          trackAction('view', params.slug, 'subgroup')
        }

        try {
          const { count } = await supabase
            .from('subgroup_follows')
            .select('*', { count: 'exact', head: true })
            .eq('subgroup_id', data.id)
          setFollowerCount(count || 0)
        } catch {
          setFollowerCount(0)
        }

        if (user?.id) {
          try {
            const [followResult, moderatorResult] = await Promise.all([
              supabase.rpc('is_following_subgroup_ext', {
                target_subgroup_id: data.id,
                external_id_param: user.id,
              }),
              supabase.rpc('is_subgroup_moderator_ext', {
                subgroup_id_param: data.id,
                external_id_param: user.id,
              }),
            ])
            setIsFollowing(followResult.data || false)
            setIsModerator(moderatorResult.data || false)
          } catch {
            setIsFollowing(false)
            setIsModerator(false)
          }
        }
      } catch (error: any) {
        console.error('Failed to load subgroup:', error)
        toast.error('Failed to load subgroup: ' + (error.message || 'Please try again'))
      } finally {
        setLoading(false)
      }
    })()
  }, [params.slug, user?.id])

  const handleFollow = async () => {
    if (!user?.id) {
      toast.error('Please sign in to follow subgroups')
      return
    }
    if (!subgroupId) return
    setFollowLoading(true)
    try {
      const { data, error } = await callRpc('toggle_follow_subgroup_ext', {
        target_subgroup_id: subgroupId,
      })
      if (error) throw error
      setIsFollowing(data.following)
      setFollowerCount((prev) => (data.following ? prev + 1 : prev - 1))
      toast.success(data.following ? 'Following subgroup!' : 'Unfollowed subgroup')
    } catch (error: any) {
      toast.error(error.message || 'Failed to follow subgroup')
    } finally {
      setFollowLoading(false)
    }
  }

  const openUpload = () => {
    if (!subgroupData) return
    window.dispatchEvent(
      new CustomEvent('pitch:open-upload', {
        detail: {
          group: {
            id: subgroupData.id,
            name: subgroupData.name,
            slug: subgroupData.slug,
          },
        },
      })
    )
  }

  const hotScore = (card: MediaCard) => {
    const ageHours = Math.max(
      0,
      (Date.now() - new Date(card.date).getTime()) / 3_600_000
    )
    return (card.views + 1) / Math.pow(ageHours + 2, 1.5)
  }

  const getSortedCards = (cards: MediaCard[]) => {
    switch (sortMode) {
      case 'hot':
        return [...cards].sort((a, b) => hotScore(b) - hotScore(a))
      case 'top':
        return [...cards].sort((a, b) => b.views - a.views)
      default:
        return [...cards].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
    }
  }

  const cards: MediaCard[] = subgroupId
    ? getSortedCards(posts.filter((p) => p.subgroupId === subgroupId))
    : []

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-white font-['Space_Mono'] flex items-center justify-center">
        <div className="text-black/40 text-sm uppercase tracking-wide">Loading…</div>
      </div>
    )
  }

  if (!subgroupData) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-white font-['Space_Mono'] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-black/50 mb-4">Group not found</p>
          <Link href={pitchMode ? '/' : '/subgroup'} className="underline underline-offset-4">
            {pitchMode ? '← Back to the web' : '← Browse subgroups'}
          </Link>
        </div>
      </div>
    )
  }

  // —— Pitch layout: clean room, posts + chat ——
  if (pitchMode) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-white font-['Space_Mono']">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <Link
            href="/"
            className="inline-block text-[10px] uppercase tracking-wide text-black/45 hover:text-black mb-6"
          >
            ← Creative web
          </Link>

          <header className="border-b border-black pb-6 mb-6">
            <p className="text-[10px] uppercase tracking-wide text-black/40 mb-2">
              Group
            </p>
            <h1 className="text-3xl sm:text-4xl font-normal uppercase tracking-tight">
              {subgroupData.name}
            </h1>
            {subgroupData.description ? (
              <p className="mt-3 text-sm text-black/70 max-w-2xl leading-relaxed">
                {subgroupData.description}
              </p>
            ) : (
              <p className="mt-3 text-sm text-black/45 max-w-2xl">
                A room for work and conversation. Upload, comment, or chat.
              </p>
            )}
            <p className="mt-4 text-[10px] uppercase tracking-wide text-black/40">
              {subgroupData.post_count ?? cards.length} posts
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openUpload}
                className="border border-black bg-black text-white px-5 py-2.5 text-xs uppercase tracking-wide hover:bg-white hover:text-black"
              >
                Upload
              </button>
              <div className="flex border border-black">
                {(
                  [
                    ['posts', 'Posts'],
                    ['chat', 'Chat'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`px-4 py-2.5 text-xs uppercase tracking-wide ${
                      tab === id
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-black/5'
                    } ${id === 'posts' ? 'border-r border-black' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {tab === 'chat' ? (
            <SubgroupChat
              subgroupId={subgroupData.id}
              subgroupName={subgroupData.name}
            />
          ) : cards.length === 0 ? (
            <div className="border border-dashed border-black/30 px-6 py-20 text-center">
              <p className="text-sm text-black/50 mb-4">No posts yet in this room.</p>
              <button
                type="button"
                onClick={openUpload}
                className="border border-black bg-black text-white px-5 py-2 text-xs uppercase tracking-wide hover:bg-white hover:text-black"
              >
                Be first
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-[10px] uppercase text-black/40">Sort</span>
                {(['new', 'hot', 'top'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSortMode(mode)}
                    className={`px-2.5 py-1 text-[10px] uppercase tracking-wide border border-black ${
                      sortMode === mode
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-black hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <CardGrid cards={cards} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // —— Standard (non-pitch) layout ——
  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden mb-4">
            {subgroupData.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={subgroupData.cover_image_url}
                alt={subgroupData.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-gray-100 to-gray-200" />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-normal">d/{subgroupData.slug}</h1>
                  {subgroupData.description && (
                    <p className="text-sm text-gray-300 mt-2">
                      {subgroupData.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-300">{followerCount} members</div>
                  <div className="text-xs text-gray-400">
                    {subgroupData.creator_username && (
                      <div className="mb-1">
                        Created by u/{subgroupData.creator_username}
                      </div>
                    )}
                    Created {getTimeAgo(subgroupData.created_at)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link
                href={`/create?subgroup=${encodeURIComponent(subgroupData.id)}`}
                className="px-6 py-2 bg-black text-white hover:bg-gray-800 transition-colors text-sm font-normal"
              >
                Create Post
              </Link>
              <button
                onClick={handleFollow}
                disabled={followLoading || !user}
                className={`px-6 py-2 border-2 transition-colors text-sm font-normal ${
                  isFollowing
                    ? 'border-gray-300 text-black hover:border-red-500 hover:text-red-500'
                    : 'border-black bg-black text-white hover:bg-gray-800'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {followLoading ? '...' : isFollowing ? 'Joined' : 'Join'}
              </button>
              {isModerator && (
                <Link
                  href={`/subgroup/${params.slug}/mod`}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  Mod Tools
                </Link>
              )}
              <div className="flex border border-black ml-2">
                <button
                  type="button"
                  onClick={() => setTab('posts')}
                  className={`px-3 py-2 text-xs uppercase ${
                    tab === 'posts' ? 'bg-black text-white' : ''
                  }`}
                >
                  Posts
                </button>
                <button
                  type="button"
                  onClick={() => setTab('chat')}
                  className={`px-3 py-2 text-xs uppercase border-l border-black ${
                    tab === 'chat' ? 'bg-black text-white' : ''
                  }`}
                >
                  Chat
                </button>
              </div>
            </div>

            {tab === 'posts' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sort:</span>
                {(['new', 'hot', 'top'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSortMode(mode)}
                    className={`px-3 py-1 text-sm transition-colors ${
                      sortMode === mode
                        ? 'bg-black text-white'
                        : 'text-gray-600 hover:text-black hover:bg-gray-100'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {tab === 'chat' ? (
          <SubgroupChat
            subgroupId={subgroupData.id}
            subgroupName={subgroupData.name}
          />
        ) : cards.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-gray-300 rounded-lg">
            <div className="text-gray-500 mb-4">
              <h3 className="text-lg font-normal mb-2">No posts yet</h3>
              <p className="text-sm">Be the first to share something in this subgroup!</p>
            </div>
            <Link
              href={`/create?subgroup=${encodeURIComponent(subgroupId || '')}`}
              className="inline-block px-6 py-2 bg-black text-white hover:bg-gray-800 transition-colors text-sm"
            >
              Create Post
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <CardGrid cards={cards} />
          </div>
        )}

        <DetailModal />
      </main>
    </div>
  )
}
