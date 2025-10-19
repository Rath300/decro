'use client'

import { useState } from 'react'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'

export default function FeedbackPage() {
  const { isAuthenticated, user } = useAuth()
  const [expandedBox, setExpandedBox] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({
    technical: '',
    report: '',
    moderation: '',
    suggestion: '',
    other: ''
  })

  const feedbackCategories = [
    {
      id: 'technical',
      title: 'Technical Issues',
      description: 'Report bugs, performance issues, or technical problems',
      icon: '🔧'
    },
    {
      id: 'report',
      title: 'Report User',
      description: 'Report inappropriate behavior or content',
      icon: '🚨'
    },
    {
      id: 'moderation',
      title: 'Moderation Issues',
      description: 'Request content review or moderation assistance',
      icon: '👮'
    },
    {
      id: 'suggestion',
      title: 'Feature Suggestions',
      description: 'Suggest new features or improvements',
      icon: '💡'
    },
    {
      id: 'other',
      title: 'Other Feedback',
      description: 'General feedback, questions, or other concerns',
      icon: '💬'
    }
  ]

  const handleBoxClick = (categoryId: string) => {
    setExpandedBox(expandedBox === categoryId ? null : categoryId)
  }

  const handleSubmit = async (categoryId: string) => {
    if (!isAuthenticated || !user?.id) {
      alert('Please sign in to submit feedback')
      return
    }

    const content = feedbackText[categoryId]?.trim()
    if (!content) {
      alert('Please enter your feedback before submitting')
      return
    }

    setSubmitting(categoryId)
    
    try {
      const { error } = await supabase
        .from('feedback')
        .insert([
          {
            user_id: user.id,
            category: categoryId,
            content: content
          }
        ])

      if (error) throw error

      alert('Thank you for your feedback!')
      setFeedbackText(prev => ({ ...prev, [categoryId]: '' }))
      setExpandedBox(null)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-['Space_Mono'] font-bold text-black mb-4">
          Feedback & Support
        </h1>
        <p className="text-gray-600 font-['Space_Mono']">
          Help us improve by sharing your feedback or reporting issues.
        </p>
      </div>

      <div className="space-y-4">
        {feedbackCategories.map((category) => (
          <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden transition-all duration-300">
            <button
              onClick={() => handleBoxClick(category.id)}
              className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <h3 className="text-lg font-['Space_Mono'] font-bold text-black">
                      {category.title}
                    </h3>
                    <p className="text-gray-600 font-['Space_Mono'] text-sm">
                      {category.description}
                    </p>
                  </div>
                </div>
                <div className={`transform transition-transform duration-200 ${
                  expandedBox === category.id ? 'rotate-180' : ''
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Expandable content */}
            <div className={`transition-all duration-300 overflow-hidden ${
              expandedBox === category.id ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                {!isAuthenticated ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 font-['Space_Mono'] mb-4">
                      Please sign in to submit feedback
                    </p>
                    <button className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 font-['Space_Mono']">
                      Sign In
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea
                      value={feedbackText[category.id]}
                      onChange={(e) => setFeedbackText(prev => ({
                        ...prev,
                        [category.id]: e.target.value
                      }))}
                      placeholder={`Describe your ${category.title.toLowerCase()}...`}
                      className="w-full p-4 border border-gray-300 rounded-lg resize-none font-['Space_Mono']"
                      rows={4}
                    />
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => handleBoxClick(category.id)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 font-['Space_Mono']"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSubmit(category.id)}
                        disabled={submitting === category.id || !feedbackText[category.id]?.trim()}
                        className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-['Space_Mono']"
                      >
                        {submitting === category.id ? 'Submitting...' : 'Submit'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  )
}
