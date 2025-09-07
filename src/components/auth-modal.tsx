'use client';

import { useRouter } from 'next/navigation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: string;
}

export default function AuthModal({ isOpen, onClose, action = "interact with content" }: AuthModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleSignUp = () => {
    router.push('/signup');
    onClose();
  };

  const handleSignIn = () => {
    router.push('/');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="black"/>
            </svg>
          </div>

          <h3 className="text-xl font-['Space_Mono'] font-bold text-black mb-2">Sign in to continue</h3>
          <p className="text-sm font-['Space_Mono'] text-gray-600 mb-6">You need to create an account to {action}</p>

          <div className="space-y-3">
            <button onClick={handleSignUp} className="w-full bg-black text-white font-['Space_Mono'] text-sm py-3 px-4 hover:bg-gray-800 transition-colors">Create Account</button>
            <button onClick={handleSignIn} className="w-full bg-white text-black font-['Space_Mono'] text-sm py-3 px-4 border border-black hover:bg-gray-50 transition-colors">Sign In</button>
            <button onClick={onClose} className="w-full text-gray-500 font-['Space_Mono'] text-sm py-2 hover:text-black transition-colors">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
} 