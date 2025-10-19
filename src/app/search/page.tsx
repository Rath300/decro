/**
 * Search Page with Tag-Based Filtering
 * Search posts by tags and keywords
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import supabase from '@/lib/supabase-client'
import { PostStats } from '@/components/post-stats'
import { useAuth } from '@/context/auth-context'

interface Tag {
  id: string
  name: string
  slug: string
  usage_count: number
}

interface SearchResult {
  id: string
  title: string
  description: string
  content_type: string
  media_url: string
  creator_id: string
  creator_username: string
  subgroup_name: string
  views: number
  like_count: number
  comment_count: number
  created_at: string
  tags: string[]
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get('tags')?.split(',').filter(Boolean) || []
  )
  const [results, setResults] = useState<SearchResult[]>([])
  const [popularTags, setPopularTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchFilter, setSearchFilter] = useState<'all' | 'liked' | 'viewed'>('all')

  // Load popular tags
  useEffect(() => {
    const loadTags = async () => {
      try {
        const { data, error } = await supabase.rpc('get_popular_tags', {
          limit_count: 30
        })

        if (!error && data) {
          setPopularTags(data)
        }
      } catch (error) {
        console.error('Failed to load tags:', error)
      }
    }

    loadTags()
  }, [])

  // Perform search when tags change
  useEffect(() => {
    if (selectedTags.length > 0) {
      performSearch()
    }
  }, [selectedTags])

  const performSearch = async () => {
    if (selectedTags.length === 0 && !query.trim() && searchFilter === 'all') {
      setResults([])
      setHasSearched(false)
      return
    }

    setLoading(true)
    setHasSearched(true)

    try {
      if (searchFilter === 'liked' && isAuthenticated && user?.id) {
        // Get user's liked post IDs first
        const { data: likedData, error: likedError } = await supabase.rpc('get_user_liked_posts_ext', {
          external_id_param: user.id
        })
        if (likedError) throw likedError
        
        if (likedData && likedData.length > 0) {
          // Get full post data for liked posts
          const likedPostIds = likedData.map((like: any) => like.post_id)
          const { data: postsData, error: postsError } = await supabase.rpc('search_posts_enhanced', {
            search_query: '', // Empty to get all
            page_size: 100,
            page_offset: 0
          })
          
          if (postsError) throw postsError
          
          // Filter to only liked posts
          let filteredResults = (postsData || []).filter((post: any) => 
            likedPostIds.includes(post.id)
          )
          
          if (query.trim()) {
            // Further filter by search query
            filteredResults = filteredResults.filter((post: any) => 
              post.title?.toLowerCase().includes(query.toLowerCase()) ||
              post.description?.toLowerCase().includes(query.toLowerCase()) ||
              post.creator_username?.toLowerCase().includes(query.toLowerCase())
            )
          }
          setResults(filteredResults)
        } else {
          setResults([])
        }
      } else if (searchFilter === 'viewed' && isAuthenticated && user?.id) {
        // Get recently viewed posts (this would need view_events table implementation)
        // For now, we'll show recent posts and filter by query if provided
        const { data, error } = await supabase
          .from('posts')
          .select(`
            id, title, description, content_type, media_url, creator_id, views, created_at,
            profiles!posts_creator_id_fkey (username),
            subgroups!posts_subgroup_id_fkey (name)
          `)
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (error) throw error
        
        let filteredResults = (data || []).map((post: any): SearchResult => ({
          id: post.id,
          title: post.title || '',
          description: post.description || '',
          content_type: post.content_type,
          media_url: post.media_url,
          creator_id: post.creator_id,
          creator_username: post.profiles?.username || '',
          subgroup_name: post.subgroups?.name || '',
          views: post.views || 0,
          like_count: 0, // Would need additional query for this
          comment_count: 0, // Would need additional query for this
          created_at: post.created_at,
          tags: [] // Would need additional query for this
        }))
        
        if (query.trim()) {
          filteredResults = filteredResults.filter((post) => 
            post.title?.toLowerCase().includes(query.toLowerCase()) ||
            post.description?.toLowerCase().includes(query.toLowerCase()) ||
            post.creator_username?.toLowerCase().includes(query.toLowerCase())
          )
        }
        setResults(filteredResults)
      } else if (selectedTags.length > 0) {
        // Search by tags
        const { data, error } = await supabase.rpc('search_posts_by_tags', {
          tag_slugs: selectedTags,
          page_size: 50,
          page_offset: 0
        })

        if (error) throw error
        setResults(data || [])
      } else if (query.trim()) {
        // Enhanced search with username support
        const { data, error } = await supabase.rpc('search_posts_enhanced', {
          search_query: query.trim(),
          page_size: 50,
          page_offset: 0
        })

        if (error) throw error
        setResults(data || [])
      }
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const toggleTag = (tagSlug: string) => {
    setSelectedTags(prev => {
      const newTags = prev.includes(tagSlug)
        ? prev.filter(t => t !== tagSlug)
        : [...prev, tagSlug]
      
      // Update URL
      if (newTags.length > 0) {
        router.push(`/search?tags=${newTags.join(',')}`)
      } else {
        router.push('/search')
      }
      
      return newTags
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch()
  }

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <main className="max-w-6xl mx-auto px-4 pb-12">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Discover</h1>
          
          {/* Search Input */}
          <form onSubmit={handleSearch} className="relative mb-6">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, description, or username..."
              className="w-full px-4 py-3 pr-24 border-2 border-gray-300 focus:border-black focus:outline-none text-lg"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors text-sm"
            >
              Search
            </button>
          </form>

          {/* Search Filters */}
          {isAuthenticated && (
            <div className="mb-6">
              <h2 className="text-sm font-bold mb-3 text-gray-700">Search in</h2>
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'All Posts' },
                  { key: 'liked', label: 'My Liked Posts' },
                  { key: 'viewed', label: 'Recently Viewed' }
                ].map(filter => (
                  <button
                    key={filter.key}
                    onClick={() => {
                      setSearchFilter(filter.key as any)
                      // Auto-search when filter changes
                      setTimeout(() => performSearch(), 100)
                    }}
                    className={`px-4 py-2 text-sm border transition-colors ${
                      searchFilter === filter.key
                        ? 'border-black bg-black text-white'
                        : 'border-gray-300 bg-white text-black hover:border-black'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Tags */}
          <div>
            <h2 className="text-sm font-bold mb-3 text-gray-700">Popular Tags</h2>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.slug)}
                  className={`px-3 py-1 text-sm border transition-colors ${
                    selectedTags.includes(tag.slug)
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 bg-white text-black hover:border-black'
                  }`}
                >
                  #{tag.name}
                  <span className="ml-1 text-xs opacity-70">({tag.usage_count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Filtering by:</span>
                {selectedTags.map((slug) => {
                  const tag = popularTags.find(t => t.slug === slug)
                  return (
                    <span
                      key={slug}
                      className="px-2 py-1 bg-black text-white text-xs flex items-center gap-1"
                    >
                      #{tag?.name || slug}
                      <button
                        onClick={() => toggleTag(slug)}
                        className="ml-1 hover:text-red-300"
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
                <button
                  onClick={() => {
                    setSelectedTags([])
                    router.push('/search')
                  }}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black"></div>
            <p className="mt-4 text-gray-600">Searching...</p>
          </div>
        )}

        {/* Results */}
        {!loading && hasSearched && (
          <div>
            <p className="text-gray-600 mb-4">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>

            {results.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.map((result) => (
                  <a
                    key={result.id}
                    href={`/feed#${result.id}`}
                    className="block border border-gray-200 hover:border-black transition-colors group overflow-hidden"
                  >
                    {result.media_url && (
                      <div className="aspect-square bg-gray-100 overflow-hidden">
                        <img
                          src={result.media_url}
                          alt={result.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <h3 className="font-bold text-sm mb-1 group-hover:underline line-clamp-2">
                        {result.title}
                      </h3>
                      <p className="text-xs text-gray-600 mb-2">
                        by {result.creator_username}
                      </p>
                      {result.tags && result.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {result.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 px-1">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <PostStats
                        postId={result.id}
                        initialViews={result.views}
                        initialLikes={result.like_count}
                        initialComments={result.comment_count}
                      />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-gray-300">
                <p className="text-2xl mb-2">🔍</p>
                <p className="text-gray-600">No results found</p>
                <p className="text-sm text-gray-500 mt-2">
                  Try different tags or browse the feed
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !hasSearched && (
          <div className="text-center py-12">
            <p className="text-4xl mb-4">🏷️</p>
            <p className="text-gray-600 mb-2">Discover content by tags</p>
            <p className="text-sm text-gray-500">
              Select tags above or search by keywords
            </p>
          </div>
        )}
      </main>
    </div>
  )
}