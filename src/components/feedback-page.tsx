'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SiteHeader from './SiteHeader'

export default function FeedbackPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [feedback, setFeedback] = useState('');

  const handleLogout = () => {
    router.push('/');
  };

  const handleSubmit = () => {
    // Handle feedback submission here
    console.log('Feedback submitted:', { selectedCategory, feedback });
    // For now, just go back to feed
    router.push('/feed');
  };

  const feedbackCategories = [
    'Bugs',
    'Design/Accessibility',
    'Report abuse',
    'Other'
  ];

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <SiteHeader active="feed" />

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-['Space_Mono'] font-bold text-black mb-4">
            Feedback
          </h2>
          <p className="text-sm font-['Space_Mono'] text-gray-600">
            We are still in development and would greatly appreciate any and all feedback. Thanks!
          </p>
        </div>

        {/* Feedback Form */}
        <div className="space-y-6">
          {/* Feedback Categories */}
          <div>
            <label className="block text-sm font-['Space_Mono'] font-medium text-black mb-3">
              Select Feedback Type
            </label>
            <div className="space-y-3">
              {feedbackCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full p-4 text-left border border-black font-['Space_Mono'] text-sm transition-colors ${
                    selectedCategory === category
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-gray-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Feedback (if category selected) */}
          {selectedCategory && (
            <div>
              <label className="block text-sm font-['Space_Mono'] font-medium text-black mb-2">
                {selectedCategory}
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={`Tell us about ${selectedCategory.toLowerCase()}...`}
                className="w-full h-24 p-4 border border-black rounded-none bg-white font-['Space_Mono'] text-sm resize-none focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <button
              onClick={handleSubmit}
              className="w-full py-3 bg-black text-white font-['Space_Mono'] text-sm font-medium border border-black transition-all duration-150 active:transform active:scale-95 hover:bg-gray-800"
            >
              Submit Feedback
            </button>
          </div>
        </div>
      </main>
    </div>
  );
} 