'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePosts } from '@/context/post-context';
import type { MediaCard } from '@/context/post-context';
import { useAuth } from '@/context/auth-context';
import AuthModal from './auth-modal';

interface WebNode {
  id: string;
  label: string;
  x: number;
  y: number;
  connections: string[];
  postCount: number;
  isSelected: boolean;
}

const webNodes: WebNode[] = [
  // Creative Arts Cluster
  { id: 'physical-art', label: 'Physical Art', x: 200, y: 150, connections: ['graphic-design', 'photography', 'digital'], postCount: 45, isSelected: false },
  { id: 'graphic-design', label: 'Graphic Design', x: 350, y: 200, connections: ['physical-art', 'digital', 'edits'], postCount: 32, isSelected: false },
  { id: 'photography', label: 'Photography', x: 150, y: 300, connections: ['physical-art', 'nature', 'urban'], postCount: 67, isSelected: false },
  { id: 'digital', label: 'Digital', x: 400, y: 100, connections: ['physical-art', 'graphic-design', 'tech'], postCount: 28, isSelected: false },
  
  // Media & Content Cluster
  { id: 'edits', label: 'Edits', x: 500, y: 300, connections: ['graphic-design', 'video', 'film'], postCount: 42, isSelected: false },
  { id: 'video', label: 'Video', x: 600, y: 200, connections: ['edits', 'film', 'tech'], postCount: 58, isSelected: false },
  { id: 'film', label: 'Film', x: 700, y: 150, connections: ['edits', 'video', 'culture'], postCount: 35, isSelected: false },
  
  // Nature & Urban Cluster
  { id: 'nature', label: 'Nature', x: 100, y: 400, connections: ['photography', 'urban', 'outdoors'], postCount: 53, isSelected: false },
  { id: 'urban', label: 'Urban', x: 300, y: 350, connections: ['photography', 'nature', 'street'], postCount: 41, isSelected: false },
  { id: 'outdoors', label: 'Outdoors', x: 50, y: 250, connections: ['nature', 'adventure'], postCount: 29, isSelected: false },
  
  // Lifestyle Cluster
  { id: 'fashion', label: 'Fashion', x: 450, y: 250, connections: ['graphic-design', 'lifestyle', 'street'], postCount: 38, isSelected: false },
  { id: 'lifestyle', label: 'Lifestyle', x: 500, y: 150, connections: ['fashion', 'food', 'travel'], postCount: 62, isSelected: false },
  { id: 'food', label: 'Food', x: 550, y: 300, connections: ['lifestyle', 'culture'], postCount: 34, isSelected: false },
  
  // Culture & Tech Cluster
  { id: 'culture', label: 'Culture', x: 600, y: 200, connections: ['food', 'music', 'travel'], postCount: 47, isSelected: false },
  { id: 'music', label: 'Music', x: 400, y: 400, connections: ['culture', 'tech', 'physical-art'], postCount: 73, isSelected: false },
  { id: 'tech', label: 'Tech', x: 350, y: 50, connections: ['digital', 'music', 'innovation'], postCount: 25, isSelected: false },
  
  // Adventure & Street Cluster
  { id: 'adventure', label: 'Adventure', x: 200, y: 450, connections: ['outdoors', 'travel'], postCount: 31, isSelected: false },
  { id: 'travel', label: 'Travel', x: 650, y: 100, connections: ['lifestyle', 'culture', 'adventure'], postCount: 56, isSelected: false },
  { id: 'street', label: 'Street', x: 250, y: 500, connections: ['urban', 'fashion'], postCount: 39, isSelected: false },
  { id: 'innovation', label: 'Innovation', x: 500, y: 50, connections: ['tech'], postCount: 18, isSelected: false }
];



export default function WebPage() {
  const router = useRouter();
  const { posts, likedCards, toggleLike } = usePosts();
  const { signOut, isAuthenticated } = useAuth();
  const [nodes, setNodes] = useState<WebNode[]>(webNodes);
  const [selectedNode, setSelectedNode] = useState<WebNode | null>(null);
  const [showPosts, setShowPosts] = useState(false);
  const [filteredPosts, setFilteredPosts] = useState<MediaCard[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalAction, setAuthModalAction] = useState('');

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const handleLikeClick = (postId: string) => {
    if (!isAuthenticated) {
      setAuthModalAction('like posts');
      setShowAuthModal(true);
      return;
    }
    toggleLike(postId);
  };

  const handleNodeClick = (node: WebNode) => {
    // Toggle selection
    const updatedNodes = nodes.map(n => ({
      ...n,
      isSelected: n.id === node.id ? !n.isSelected : false
    }));
    setNodes(updatedNodes);
    
    if (node.isSelected) {
      // Deselect
      setSelectedNode(null);
      setShowPosts(false);
    } else {
      // Select
      setSelectedNode(node);
      setShowPosts(true);
      
      // Filter posts based on node (in real app, this would be an API call)
      // For now, just show some posts from the shared context
      setFilteredPosts(posts.slice(0, 3));
    }
  };

  const handlePostClick = (post: MediaCard) => {
    // Navigate to post detail or open modal
    console.log('Opening post:', post);
  };

  const handleBackToWeb = () => {
    setSelectedNode(null);
    setShowPosts(false);
    setNodes(nodes.map(n => ({ ...n, isSelected: false })));
  };



  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-black">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between h-16">
            {/* Left side - Back button and title */}
            <div className="flex items-center space-x-8 pb-1">
              <button
                onClick={() => router.push('/feed')}
                className="text-sm font-['Space_Mono'] font-medium text-black hover:text-gray-600 transition-colors"
              >
                ← Back to Feed
              </button>
              <h1 className="text-xl font-['Space_Mono'] font-semibold">The Web</h1>
            </div>

            {/* Center - Navigation buttons */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-end space-x-8 pb-0">
              {[
                { id: 'feed', label: 'Feed', active: false },
                { id: 'web', label: 'Web', active: true },
                { id: 'portfolios', label: 'Portfolios', active: false },
                { id: 'profile', label: 'Profile', active: false }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'feed') router.push('/feed');
                    if (tab.id === 'web') router.push('/web');
                    if (tab.id === 'portfolios') router.push('/portfolios');
                    if (tab.id === 'profile') router.push('/profile');
                  }}
                  className={`w-40 h-8 text-sm font-['Space_Mono'] font-medium border border-black transition-all duration-150 active:transform active:scale-95 flex items-center justify-center ${
                    tab.active
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right side - Create post, feedback link, and auth status */}
            <div className="flex items-center space-x-4 pb-1">
              <button
                onClick={() => router.push('/create')}
                className="px-3 py-1 bg-black text-white font-['Space_Mono'] text-xs hover:bg-gray-800 transition-colors"
              >
                Create Post
              </button>
              
              <button
                onClick={() => router.push('/feedback')}
                className="text-xs font-['Space_Mono'] text-gray-500 hover:text-black transition-colors"
              >
                Feedback
              </button>
              
              {/* Auth Status */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-['Space_Mono'] text-green-600">
                    {user?.name || user?.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm font-['Space_Mono'] font-medium text-black hover:text-gray-600 transition-colors"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => router.push('/')}
                  className="text-xs font-['Space_Mono'] text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative h-[calc(100vh-4rem)] overflow-hidden">
        {!showPosts ? (
          /* Web Visualization */
          <div className="relative w-full h-full">
            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {nodes.map((node) =>
                node.connections.map((connectionId) => {
                  const targetNode = nodes.find(n => n.id === connectionId);
                  if (!targetNode) return null;
                  
                  return (
                    <line
                      key={`${node.id}-${connectionId}`}
                      x1={node.x}
                      y1={node.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke="black"
                      strokeWidth="1"
                      opacity="0.3"
                    />
                  );
                })
              )}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => (
              <div
                key={node.id}
                onClick={() => handleNodeClick(node)}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 ${
                  node.isSelected ? 'scale-110' : 'hover:scale-105'
                }`}
                style={{ left: node.x, top: node.y }}
              >
                <div className={`px-4 py-2 border-2 font-['Space_Mono'] text-sm text-center transition-all duration-300 ${
                  node.isSelected
                    ? 'border-black bg-black text-white'
                    : 'border-black bg-white text-black hover:bg-gray-50'
                }`}>
                  <div className="font-medium">{node.label}</div>
                  <div className="text-xs opacity-70">{node.postCount} posts</div>
                </div>
              </div>
            ))}

            {/* Instructions */}
            <div className="absolute bottom-8 left-8 bg-white border border-black p-4 max-w-sm">
              <h3 className="font-['Space_Mono'] font-medium text-black mb-2">How to use The Web</h3>
              <p className="text-sm font-['Space_Mono'] text-gray-600">
                Click on any node to explore posts in that category. 
                Connected nodes represent related content areas.
              </p>
            </div>
          </div>
        ) : (
          /* Posts View */
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <button
                  onClick={handleBackToWeb}
                  className="text-sm font-['Space_Mono'] font-medium text-black hover:text-gray-600 transition-colors mb-2"
                >
                  ← Back to Web
                </button>
                <h2 className="text-2xl font-['Space_Mono'] font-bold text-black">
                  {selectedNode?.label}
                </h2>
                <p className="text-sm font-['Space_Mono'] text-gray-600">
                  {selectedNode?.postCount} posts in this category
                </p>
              </div>
            </div>

            {/* Posts - Same masonry layout as feed */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="break-inside-avoid mb-4 group cursor-pointer"
                  >
                    {/* Floating Media Card - Same as feed */}
                    <div 
                      className="relative aspect-square overflow-hidden cursor-pointer"
                      onClick={() => handlePostClick(post)}
                    >
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      
                      {/* Audio waveform overlay for music cards */}
                      {post.type === 'music' && post.audioUrl && (
                        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                          <div className="flex items-end space-x-1 h-12">
                            {[...Array(8)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-white rounded-full opacity-60"
                                style={{
                                  height: '40%'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Play button indicator for music */}
                      {post.type === 'music' && post.audioUrl && (
                        <div className="absolute top-2 right-2 w-8 h-8 bg-black bg-opacity-70 rounded-full flex items-center justify-center">
                          <div className="w-0 h-0 border-l-4 border-l-white border-t-2 border-t-transparent border-b-2 border-b-transparent ml-1" />
                        </div>
                      )}
                    </div>

                    {/* Card Info - Same as feed */}
                    <div className="mt-2 space-y-1">
                      {post.title && (
                        <p className="text-sm font-['Space_Mono'] text-black">
                          {post.title}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Navigate to creator profile
                            console.log('Navigate to profile:', post.creator);
                          }}
                          className="font-['Space_Mono'] text-blue-600 hover:text-blue-800 transition-colors line-clamp-1"
                          title={post.creator}
                        >
                          {post.creator}
                        </button>
                        <div className="flex items-center space-x-2">
                          <span className="font-['Space_Mono']">{new Date(post.date).toLocaleDateString()}</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLikeClick(post.id);
                            }}
                            className={`p-1 rounded-full transition-all duration-200 ${
                              likedCards.has(post.id)
                                ? 'bg-red-50 text-red-500'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <svg 
                              width="12" 
                              height="12" 
                              viewBox="0 0 24 24" 
                              fill={likedCards.has(post.id) ? "currentColor" : "none"}
                              stroke="currentColor" 
                              strokeWidth="2"
                              className="transition-all duration-200"
                            >
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 font-['Space_Mono']">
                        {post.views} views
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        action={authModalAction}
      />
    </div>
  );
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLikeClick(post.id);
                            }}
                            className={`p-1 rounded-full transition-all duration-200 ${
                              likedCards.has(post.id)
                                ? 'bg-red-50 text-red-500'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <svg 
                              width="12" 
                              height="12" 
                              viewBox="0 0 24 24" 
                              fill={likedCards.has(post.id) ? "currentColor" : "none"}
                              stroke="currentColor" 
                              strokeWidth="2"
                              className="transition-all duration-200"
                            >
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 font-['Space_Mono']">
                        {post.views} views
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        action={authModalAction}
      />
    </div>
  );