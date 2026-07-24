'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import supabase from '@/lib/supabase-client';
import { callRpc } from '@/lib/rpc';
import { useRouter } from 'next/navigation';

interface Spotlight {
  id: string;
  title: string;
  item_count: number;
  cover_image_url?: string | null;
}

interface AddToSpotlightButtonProps {
  postId: string;
}

export default function AddToSpotlightButton({ postId }: AddToSpotlightButtonProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const loadSpotlights = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Get user profile id first
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('external_id', user.id)
        .single();

      if (!profile) return;

      // Load user's spotlights with item counts
      const { data, error } = await supabase
        .from('spotlight_collections')
        .select(`
          id,
          title,
          cover_image_url,
          spotlight_items(count)
        `)
        .eq('creator_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Spotlight[] = (data || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        cover_image_url: s.cover_image_url,
        item_count: s.spotlight_items?.[0]?.count ?? 0,
      }));

      setSpotlights(mapped);

      // Check which spotlights already contain this post
      if (mapped.length > 0) {
        const { data: existing } = await supabase
          .from('spotlight_items')
          .select('collection_id')
          .in('collection_id', mapped.map(s => s.id))
          .eq('post_id', postId);

        if (existing) {
          setAddedIds(new Set(existing.map((r: any) => r.collection_id)));
        }
      }
    } catch (err) {
      console.error('Failed to load spotlights:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    setOpen(prev => {
      if (!prev) loadSpotlights();
      return !prev;
    });
  };

  const handleAddToSpotlight = async (spotlightId: string) => {
    if (!user?.id || saving) return;
    setSaving(spotlightId);
    try {
      const { data, error } = await callRpc<any>('add_post_to_spotlight_ext', {
        collection_id_param: spotlightId,
        post_id_param: postId,
      });

      if (error) throw error;

      if (data?.success) {
        setAddedIds(prev => new Set(Array.from(prev).concat(spotlightId)));
      } else {
        console.warn('Add to spotlight result:', data?.error);
      }
    } catch (err) {
      console.error('Failed to add to spotlight:', err);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button - bookmark icon, brutalist style */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 hover:bg-gray-100 border-0 transition-all duration-200"
        title="Add to Spotlight"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={open ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
        <span className="font-['Space_Mono'] text-sm">Save</span>
      </button>

      {/* Picker dropdown */}
      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 w-72 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black">
            <span className="font-['Space_Mono'] text-sm font-bold">Add to Spotlight</span>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-black transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Spotlight list */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center font-['Space_Mono'] text-xs text-gray-500">
                Loading...
              </div>
            ) : spotlights.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="font-['Space_Mono'] text-xs text-gray-500 mb-3">No spotlights yet.</p>
              </div>
            ) : (
              spotlights.map(s => {
                const isAdded = addedIds.has(s.id);
                const isSaving = saving === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => !isAdded && handleAddToSpotlight(s.id)}
                    disabled={isAdded || isSaving}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 transition-colors text-left
                      ${isAdded
                        ? 'bg-gray-50 cursor-default'
                        : 'hover:bg-gray-50 cursor-pointer'
                      }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 bg-gray-100 border border-gray-200 flex-shrink-0 overflow-hidden">
                      {s.cover_image_url ? (
                        <img src={s.cover_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-['Space_Mono'] text-xs font-bold truncate">{s.title}</p>
                      <p className="font-['Space_Mono'] text-[10px] text-gray-500">{s.item_count} posts</p>
                    </div>

                    {/* State indicator */}
                    <div className="flex-shrink-0">
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : isAdded ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-black">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <path d="M12 5v14M5 12h14"/>
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer: New Spotlight */}
          <div className="border-t-2 border-black">
            <button
              onClick={() => {
                setOpen(false);
                router.push(`/spotlight/create`);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black hover:text-white transition-colors group"
            >
              <div className="w-10 h-10 border-2 border-black group-hover:border-white flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </div>
              <span className="font-['Space_Mono'] text-xs font-bold">New Spotlight</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
