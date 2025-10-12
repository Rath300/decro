'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
// Header removed per request

interface PostData {
  title: string;
  description: string;
  contentType: 'image' | 'music' | 'text' | 'physical-art' | 'edits' | 'video' | 'film' | 'graphic-design';
  file: File | null;
  audioFile: File | null;
  videoFile: File | null;
  isCurated: boolean;
  tags: string[];
}

export default function CreatePostPage() {
  const router = useRouter();
  const [postData, setPostData] = useState<PostData>({
    title: '',
    description: '',
    contentType: 'image',
    file: null,
    audioFile: null,
    videoFile: null,
    isCurated: false,
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string>('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [subgroupQuery, setSubgroupQuery] = useState('')
  const [subgroupResults, setSubgroupResults] = useState<{ id: string; name: string; slug: string }[]>([])
  const [selectedSubgroup, setSelectedSubgroup] = useState<{ id: string; name: string; slug: string } | null>(null)

  // Debounced subgroup search
  const searchTimer = useRef<any>(null)
  const onSearch = (value: string) => {
    setSubgroupQuery(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      if (!value.trim()) { setSubgroupResults([]); return }
      const res = await fetch(`/api/subgroups?query=${encodeURIComponent(value.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setSubgroupResults(data.items || [])
      }
    }, 300)
  }

  const handleLogout = () => {
    router.push('/');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPostData(prev => ({ ...prev, file }));
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPostData(prev => ({ ...prev, audioFile: file }));
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setAudioPreviewUrl(url);
    }
  };

  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPostData(prev => ({ ...prev, videoFile: file }));
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
    }
  };

  const handleSubmit = async () => {
    if (!postData.title.trim()) {
      alert('Please enter a title for your post');
      return;
    }

    if (postData.contentType === 'music' && !postData.audioFile) {
      alert('Please upload an audio file for music posts');
      return;
    }

    if (['image', 'physical-art', 'edits', 'graphic-design'].includes(postData.contentType) && !postData.file) {
      alert('Please upload an image file');
      return;
    }

    if (['video', 'film'].includes(postData.contentType) && !postData.videoFile) {
      alert('Please upload a video file');
      return;
    }

    setIsSubmitting(true);

    try {
      const body = new FormData()
      body.append('title', postData.title)
      body.append('description', postData.description)
      body.append('contentType', postData.contentType)
      body.append('isCurated', String(postData.isCurated))
      if (selectedSubgroup?.id) body.append('subgroupId', selectedSubgroup.id)
      body.append('tags', JSON.stringify(postData.tags))
      if (postData.file) body.append('file', postData.file)
      if (postData.audioFile) body.append('audioFile', postData.audioFile)
      if (postData.videoFile) body.append('videoFile', postData.videoFile)

      const res = await fetch('/api/posts', { method: 'POST', body })
      if (!res.ok) throw new Error('Failed to create')

      router.push('/feed');
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFile = () => {
    setPostData(prev => ({ ...prev, file: null }));
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAudioFile = () => {
    setPostData(prev => ({ ...prev, audioFile: null }));
    setAudioPreviewUrl('');
    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
  };

  const removeVideoFile = () => {
    setPostData(prev => ({ ...prev, videoFile: null }));
    setVideoPreviewUrl('');
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Content Type Selection */}
          <div>
            <label className="block text-sm font-['Space_Mono'] font-medium text-black mb-4">
              What are you sharing?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'image', label: 'Photo', icon: '📷' },
                { id: 'music', label: 'Music', icon: '🎵' },
                { id: 'physical-art', label: 'Physical Art', icon: '🎨' },
                { id: 'edits', label: 'Edits', icon: '✂️' },
                { id: 'video', label: 'Video', icon: '🎬' },
                { id: 'film', label: 'Film', icon: '🎞️' },
                { id: 'graphic-design', label: 'Graphic Design', icon: '🎯' },
                { id: 'text', label: 'Text', icon: '📝' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setPostData(prev => ({ ...prev, contentType: type.id as any }))}
                  className={`p-4 border-2 font-['Space_Mono'] text-sm transition-all duration-200 ${
                    postData.contentType === type.id
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 bg-white text-black hover:border-black'
                  }`}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div>{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Subgroup selection */}
          <div>
            <label className="block text-sm font-['Space_Mono'] font-medium text-black mb-2">
              Subgroup (optional)
            </label>
            <input
              type="text"
              value={selectedSubgroup ? selectedSubgroup.name : subgroupQuery}
              onChange={(e) => { setSelectedSubgroup(null); onSearch(e.target.value) }}
              placeholder="Search subgroups... (optional)"
              className="w-full p-3 border border-gray-300 font-['Space_Mono'] text-sm text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
            />
            {(!selectedSubgroup && subgroupResults.length > 0) && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 divide-y bg-white">
                {subgroupResults.map(s => (
                  <button key={s.id} onClick={() => setSelectedSubgroup(s)} className="w-full text-left px-3 py-2 hover:bg-gray-50 font-['Space_Mono'] text-sm text-black">
                    {s.name}
                  </button>
                ))}
              </div>
            )}
            {selectedSubgroup && (
              <div className="mt-2 text-xs font-['Space_Mono'] text-black">Selected: {selectedSubgroup.name}</div>
            )}
          </div>

          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-sm font-['Space_Mono'] font-medium text-black mb-2">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={postData.title}
              onChange={(e) => setPostData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Give your work a title..."
              className="w-full p-3 border border-gray-300 font-['Space_Mono'] text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              maxLength={100}
            />
          </div>

          {/* File Upload Section */}
          {['image', 'physical-art', 'edits', 'graphic-design'].includes(postData.contentType) && (
            <div>
              <label className="block text-sm font-['Space_Mono'] font-medium text-black mb-2">
                Upload {postData.contentType === 'image' ? 'Photo' : postData.contentType === 'physical-art' ? 'Physical Art' : postData.contentType === 'graphic-design' ? 'Graphic Design' : postData.contentType}
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {!postData.file ? (
                  <div>
                    <div className="text-4xl mb-4">📁</div>
                    <p className="text-sm font-['Space_Mono'] text-gray-600 mb-4">
                      Drag and drop your file here, or click to browse
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-black text-white font-['Space_Mono'] text-sm hover:bg-gray-800 transition-colors"
                    >
                      Choose File
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div>
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-full max-h-64 mx-auto rounded-lg mb-4"
                    />
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-sm font-['Space_Mono'] text-gray-600">
                        {postData.file.name}
                      </span>
                      <button
                        onClick={removeFile}
                        className="text-red-500 hover:text-red-700 font-['Space_Mono'] text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audio Upload for Music */}
          {postData.contentType === 'music' && (
            <div>
              <label className="block text-sm font-['Space_Mono'] font-medium text-black mb-2">
                Upload Audio File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {!postData.audioFile ? (
                  <div>
                    <div className="text-4xl mb-4">🎵</div>
                    <p className="text-sm font-['Space_Mono'] text-gray-600 mb-4">
                      Upload your music file (MP3, WAV, etc.)
                    </p>
                    <button
                      onClick={() => audioInputRef.current?.click()}
                      className="px-4 py-2 bg-black text-white font-['Space_Mono'] text-sm hover:bg-gray-800 transition-colors"
                    >
                      Choose Audio File
                    </button>
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-4">🎵</div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-sm font-['Space_Mono'] text-gray-600">
                        {postData.audioFile.name}
                      </span>
                      <button
                        onClick={removeAudioFile}
                        className="text-red-500 hover:text-red-700 font-['Space_Mono'] text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    {audioPreviewUrl && (
                      <audio controls className="mt-4 w-full">
                        <source src={audioPreviewUrl} type={postData.audioFile.type} />
                        Your browser does not support the audio element.
                      </audio>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Video Upload for Video/Film */}
          {['video', 'film'].includes(postData.contentType) && (
            <div>
              <label className="block text-sm font-['Space_Mono'] font-medium text-black mb-2">
                Upload {postData.contentType === 'film' ? 'Film' : 'Video'} File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {!postData.videoFile ? (
                  <div>
                    <div className="text-4xl mb-4">🎬</div>
                    <p className="text-sm font-['Space_Mono'] text-gray-600 mb-4">
                      Upload your {postData.contentType} file (MP4, MOV, etc.)
                    </p>
                    <button
                      onClick={() => videoInputRef.current?.click()}
                      className="px-4 py-2 bg-black text-white font-['Space_Mono'] text-sm hover:bg-gray-800 transition-colors"
                    >
                      Choose {postData.contentType === 'film' ? 'Film' : 'Video'} File
                    </button>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoFileChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-4">🎬</div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-sm font-['Space_Mono'] text-gray-600">
                        {postData.videoFile.name}
                      </span>
                      <button
                        onClick={removeVideoFile}
                        className="text-red-500 hover:text-red-700 font-['Space_Mono'] text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    {videoPreviewUrl && (
                      <video controls className="mt-4 w-full">
                        <source src={videoPreviewUrl} type={postData.videoFile.type} />
                        Your browser does not support the video element.
                      </video>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-['Space_Mono'] font-medium text-black mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={postData.description}
              onChange={(e) => setPostData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Tell us about your work..."
              rows={4}
              className="w-full p-3 border border-gray-300 font-['Space_Mono'] text-sm text-black placeholder-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              maxLength={500}
            />
            <div className="text-xs font-['Space_Mono'] text-gray-500 mt-1 text-right">
              {postData.description.length}/500
            </div>
          </div>

          {/* Tags Input */}
          <div>
            <label className="block text-sm font-['Space_Mono'] font-medium text-black mb-2">
              Tags (press Enter to add)
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  e.preventDefault()
                  const tag = tagInput.trim().toLowerCase()
                  if (!postData.tags.includes(tag) && postData.tags.length < 5) {
                    setPostData(prev => ({ ...prev, tags: [...prev.tags, tag] }))
                    setTagInput('')
                  }
                }
              }}
              placeholder="e.g., photography, landscape, sunset..."
              className="w-full p-3 border border-gray-300 font-['Space_Mono'] text-sm text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
            />
            {postData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {postData.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-black text-white text-xs font-['Space_Mono'] flex items-center gap-1">
                    #{tag}
                    <button
                      onClick={() => setPostData(prev => ({
                        ...prev,
                        tags: prev.tags.filter((_, i) => i !== index)
                      }))}
                      className="ml-1 hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="text-xs font-['Space_Mono'] text-gray-500 mt-1">
              {postData.tags.length}/5 tags
            </div>
          </div>

          {/* Royalty Free Option */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="curated"
              checked={postData.isCurated}
              onChange={(e) => setPostData(prev => ({ ...prev, isCurated: e.target.checked }))}
              className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
            />
            <label htmlFor="curated" className="text-sm font-['Space_Mono'] text-black">
              Mark as royalty free
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full py-3 font-['Space_Mono'] text-sm font-medium border border-black transition-all duration-150 active:transform active:scale-95 ${
                isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {isSubmitting ? 'Creating Post...' : 'Create Post'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
} 