'use client';

import Link from 'next/link';

export default function AlgorithmPage() {
  return (
    <div className="min-h-screen bg-white font-['Space_Mono'] pt-20">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
        {/* Header */}
        <div className="border-4 border-black p-8 mb-8 bg-white">
          <h1 className="text-4xl font-bold mb-4">How Our Algorithm Works</h1>
          <p className="text-lg">
            Decro uses a <strong>Fair Exposure Algorithm</strong> designed to give every artist a chance, 
            not just those with existing followings.
          </p>
        </div>

        {/* Core Principles */}
        <div className="border-2 border-black p-6 mb-6 bg-white">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-black pb-2">
            Core Principles
          </h2>
          
          <div className="space-y-4">
            <div className="border-2 border-black p-4">
              <h3 className="text-xl font-bold mb-2">1. Logarithmic Popularity</h3>
              <p className="text-sm mb-2">
                Instead of giving massive advantages to accounts with millions of followers, 
                we use logarithmic scaling. This means:
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• 100 followers → 0.69 boost</li>
                <li>• 1,000 followers → 1.04 boost</li>
                <li>• 10,000 followers → 1.38 boost</li>
                <li>• 100,000 followers → 1.73 boost</li>
              </ul>
              <p className="text-xs mt-2 text-gray-600">
                A creator with 100K followers only gets 2.5x the boost of someone with 100 followers, 
                not 1000x. This levels the playing field.
              </p>
            </div>

            <div className="border-2 border-black p-4">
              <h3 className="text-xl font-bold mb-2">2. New Artist Boost</h3>
              <p className="text-sm mb-2">
                We actively support new creators:
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Accounts &lt; 30 days old: <strong>1.5x boost</strong></li>
                <li>• Accounts 30-90 days: <strong>1.25x boost</strong></li>
                <li>• Accounts 90-180 days: <strong>1.1x boost</strong></li>
              </ul>
              <p className="text-xs mt-2 text-gray-600">
                This gives new artists a fighting chance to build their audience.
              </p>
            </div>

            <div className="border-2 border-black p-4">
              <h3 className="text-xl font-bold mb-2">3. Quality Over Vanity Metrics</h3>
              <p className="text-sm mb-2">
                We measure <strong>engagement quality</strong>, not just raw numbers:
              </p>
              <div className="text-sm space-y-1 ml-4 mb-2">
                <p><strong>Quality Score =</strong></p>
                <p className="ml-4">(Comments × 3 + Saves × 2 + Likes × 1) ÷ Views</p>
              </div>
              <p className="text-xs mt-2 text-gray-600">
                A post with 100 views and 20 thoughtful comments ranks higher than 
                a post with 10,000 views and 50 passive likes.
              </p>
            </div>

            <div className="border-2 border-black p-4">
              <h3 className="text-xl font-bold mb-2">4. Recency Matters</h3>
              <p className="text-sm">
                Fresh content gets prioritized using exponential decay. Posts lose ranking 
                over time, ensuring the feed stays current.
              </p>
            </div>
          </div>
        </div>

        {/* The Formula */}
        <div className="border-2 border-black p-6 mb-6 bg-gray-50">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-black pb-2">
            The Formula
          </h2>
          <div className="bg-white border-2 border-black p-4 font-mono text-sm overflow-x-auto">
            <p className="mb-4"><strong>Fairness Score =</strong></p>
            <p className="ml-4 mb-2">
              (log(followers + 1) × 0.15) × newbie_boost
            </p>
            <p className="ml-4 mb-2">
              + quality_score
            </p>
            <p className="ml-4 mb-2">
              + (recency_score × 2.0)
            </p>
          </div>
          <p className="text-xs mt-4 text-gray-600">
            Posts are ranked by this score, with ties broken by creation time (newest first).
          </p>
        </div>

        {/* What We DON'T Do */}
        <div className="border-2 border-black p-6 mb-6 bg-white">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-black pb-2 text-red-600">
            What We DON&apos;T Do
          </h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">×</span>
              <div>
                <strong>No Paid Promotion</strong>
                <p className="text-gray-600">
                  Your ranking cannot be bought. We don&apos;t accept money for visibility.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">×</span>
              <div>
                <strong>No Shadowbanning</strong>
                <p className="text-gray-600">
                  If your content is legal, it&apos;s shown. We don&apos;t hide accounts without telling you.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">×</span>
              <div>
                <strong>No Exploitation of Addiction</strong>
                <p className="text-gray-600">
                  We don&apos;t optimize for &ldquo;engagement at all costs&rdquo; or manipulate your feed to keep you scrolling.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">×</span>
              <div>
                <strong>No Black Box</strong>
                <p className="text-gray-600">
                  This page exists. You know how it works. No hidden variables.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">×</span>
              <div>
                <strong>No Training AI on Your Work (Unless You Opt In)</strong>
                <p className="text-gray-600">
                  By default, we block AI scrapers. You control if your work is used for training.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Fair Feed */}
        <div className="border-4 border-black p-6 bg-white">
          <h2 className="text-xl font-bold mb-4">Try It Yourself</h2>
          <p className="text-sm mb-4">
            On the <Link href="/feed" className="underline font-bold">Feed page</Link>, 
            toggle between &ldquo;Chronological&rdquo; and &ldquo;Fair Algorithm&rdquo; to see the difference.
          </p>
          <p className="text-xs text-gray-600">
            The Fair Algorithm is always improving. We&apos;re committed to transparency and 
            will update this page as we refine the system.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Questions? <Link href="/feedback" className="underline">Send us feedback</Link></p>
        </div>
      </main>
    </div>
  );
}
