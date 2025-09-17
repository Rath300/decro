'use client'

type Props = {
  isOpen: boolean
  onClose: () => void
  action?: string
}

export default function AuthModal({ isOpen, onClose, action }: Props) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-sm border border-black p-5">
        <div className="flex items-center gap-3 mb-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-black"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <h2 className="text-lg font-['Space_Mono'] text-black">Sign in required</h2>
        </div>
        <p className="text-sm font-['Space_Mono'] text-black mb-4">You need an account to {action || 'continue'}.</p>
        <div className="flex items-center justify-between gap-2">
          <a href="/" className="flex-1 text-center px-3 py-2 border border-black text-black hover:bg-black hover:text-white text-sm">Sign In</a>
          <a href="/signup" className="flex-1 text-center px-3 py-2 border border-black bg-black text-white hover:bg-black/80 text-sm">Create Account</a>
        </div>
        <div className="mt-3 text-right">
          <button onClick={onClose} className="px-3 py-1 border border-black text-black hover:bg-black hover:text-white text-sm">Close</button>
        </div>
      </div>
    </div>
  )
}


