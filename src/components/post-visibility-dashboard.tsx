'use client';

import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase-client';

interface VisibilityStats {
  actual_views: number;
  expected_views: number;
  fairness_score: number;
  score_explanation: string;
  is_boosted: boolean;
  boost_reason: string | null;
}

interface PostVisibilityDashboardProps {
  postId: string;
  creatorId: string;
}

export default function PostVisibilityDashboard({ 
  postId, 
  creatorId 
}: PostVisibilityDashboardProps) {
  const [stats, setStats] = useState<VisibilityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch the post's fairness score from get_fair_feed
        const { data: fairData, error: fairError } = await supabase
          .rpc('get_fair_feed', {
            viewer_id_param: null,
            page_size_param: 100,
            page_offset_param: 0
          });

        if (fairError) throw fairError;

        // Find this specific post in the results
        const postData = fairData?.find((p: any) => p.id === postId);

        if (postData) {
          // Fetch creator account age for boost detection
          const { data: profileData } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('id', creatorId)
            .single();

          const accountAgeDays = profileData 
            ? Math.floor((Date.now() - new Date(profileData.created_at).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          const isBoosted = accountAgeDays < 180;
          let boostReason = null;
          if (accountAgeDays < 30) boostReason = 'New account (1.5x boost)';
          else if (accountAgeDays < 90) boostReason = 'Growing account (1.25x boost)';
          else if (accountAgeDays < 180) boostReason = 'Emerging creator (1.1x boost)';

          setStats({
            actual_views: postData.views_count || 0,
            expected_views: Math.floor((postData.creator_follower_count || 0) * 0.05), // ~5% reach
            fairness_score: postData.fairness_score || 0,
            score_explanation: postData.score_explanation || '',
            is_boosted: isBoosted,
            boost_reason: boostReason,
          });
        }
      } catch (err) {
        console.error('Failed to fetch visibility stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [postId, creatorId]);

  if (loading) {
    return (
      <div className="border-2 border-black p-3 bg-gray-50">
        <p className="font-['Space_Mono'] text-xs">Loading visibility stats...</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const performanceIndicator = stats.actual_views >= stats.expected_views ? '↑' : '↓';
  const performanceColor = stats.actual_views >= stats.expected_views 
    ? 'text-green-600' 
    : 'text-gray-500';

  return (
    <div className="border-2 border-black bg-white">
      {/* Header */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-['Space_Mono'] text-xs font-bold">
            VISIBILITY REPORT
          </span>
          {stats.is_boosted && (
            <span className="px-2 py-0.5 bg-black text-white text-[10px] font-['Space_Mono'] font-bold">
              BOOSTED
            </span>
          )}
        </div>
        <span className="font-['Space_Mono'] text-xl">
          {showDetails ? '−' : '+'}
        </span>
      </button>

      {/* Details */}
      {showDetails && (
        <div className="border-t-2 border-black p-3 space-y-3">
          {/* Performance */}
          <div className="border-2 border-black p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="font-['Space_Mono'] text-xs font-bold">
                Performance
              </span>
              <span className={`font-['Space_Mono'] text-lg font-bold ${performanceColor}`}>
                {performanceIndicator}
              </span>
            </div>
            <div className="text-[10px] font-['Space_Mono'] space-y-0.5">
              <p>Actual Views: <strong>{stats.actual_views}</strong></p>
              <p>Expected: <strong>{stats.expected_views}</strong></p>
            </div>
          </div>

          {/* Fairness Score */}
          <div className="border-2 border-black p-2">
            <p className="font-['Space_Mono'] text-xs font-bold mb-1">
              Fairness Score
            </p>
            <p className="font-['Space_Mono'] text-2xl font-bold mb-2">
              {stats.fairness_score.toFixed(2)}
            </p>
            <div className="text-[10px] font-['Space_Mono'] text-gray-600">
              {stats.score_explanation}
            </div>
          </div>

          {/* Boost Info */}
          {stats.is_boosted && stats.boost_reason && (
            <div className="border-2 border-black p-2 bg-black text-white">
              <p className="font-['Space_Mono'] text-xs font-bold mb-1">
                Active Boost
              </p>
              <p className="font-['Space_Mono'] text-[10px]">
                {stats.boost_reason}
              </p>
            </div>
          )}

          {/* Learn More */}
          <div className="pt-2 border-t-2 border-black">
            <a
              href="/algorithm"
              className="font-['Space_Mono'] text-[10px] underline hover:text-gray-600"
            >
              How does this work? →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
