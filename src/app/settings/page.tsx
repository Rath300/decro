/**
 * Settings Page
 * Account settings, password change, and account deletion
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'
import { useToast } from '@/hooks/use-toast'

export default function SettingsPage() {
  const { user, isAuthenticated, signOut } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [activeSection, setActiveSection] = useState<'password' | 'account'>('password')
  const [isChanging, setIsChanging] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Please fill in all fields')
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsChanging(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      toast.success('Password changed successfully')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      console.error('Password change failed:', error)
      toast.error(error.message || 'Failed to change password')
    } finally {
      setIsChanging(false)
    }
  }

  const handleAccountDeletion = async () => {
    const confirmation = prompt(
      'Type "DELETE" to permanently delete your account. This cannot be undone.'
    )

    if (confirmation !== 'DELETE') {
      if (confirmation !== null) {
        toast.error('Account deletion cancelled')
      }
      return
    }

    setIsDeleting(true)

    try {
      // Delete user's posts
      const { error: postsError } = await supabase
        .from('posts')
        .delete()
        .eq('creator_id', user?.id)

      if (postsError) throw postsError

      // Delete user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user?.id)

      if (profileError) throw profileError

      // Delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(user?.id || '')

      if (authError) throw authError

      toast.success('Account deleted successfully')
      await signOut()
      router.push('/')
    } catch (error: any) {
      console.error('Account deletion failed:', error)
      toast.error(error.message || 'Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-black">You must be logged in to access settings</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-black text-white"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <main className="max-w-4xl mx-auto px-4 pb-12">
        <h1 className="text-3xl font-bold mb-8 text-black">Settings</h1>

        {/* Tabs */}
        <div className="border-b border-gray-300 mb-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveSection('password')}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeSection === 'password'
                  ? 'border-black font-bold'
                  : 'border-transparent text-gray-500 hover:text-black'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => setActiveSection('account')}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeSection === 'account'
                  ? 'border-black font-bold'
                  : 'border-transparent text-gray-500 hover:text-black'
              }`}
            >
              Account
            </button>
          </div>
        </div>

        {/* Password Section */}
        {activeSection === 'password' && (
          <div className="max-w-md">
            <h2 className="text-xl font-bold mb-4 text-black">Change Password</h2>
            <p className="text-sm text-gray-600 mb-6">
              Choose a strong password that you don't use elsewhere
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="current" className="block text-sm font-medium mb-2 text-black">
                  Current Password
                </label>
                <input
                  type="password"
                  id="current"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full p-3 border-2 border-gray-300 focus:border-black focus:outline-none text-sm text-black bg-white"
                />
              </div>

              <div>
                <label htmlFor="new" className="block text-sm font-medium mb-2 text-black">
                  New Password
                </label>
                <input
                  type="password"
                  id="new"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full p-3 border-2 border-gray-300 focus:border-black focus:outline-none text-sm text-black bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium mb-2 text-black">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirm"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full p-3 border-2 border-gray-300 focus:border-black focus:outline-none text-sm text-black bg-white"
                />
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={isChanging}
                className={`w-full py-3 text-sm font-medium border-2 border-black transition-colors ${
                  isChanging
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {isChanging ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        )}

        {/* Account Section */}
        {activeSection === 'account' && (
          <div className="max-w-md">
            <h2 className="text-xl font-bold mb-4 text-black">Account Management</h2>
            
            {/* Account Info */}
            <div className="mb-8 p-4 bg-gray-50 border border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Email</p>
              <p className="font-medium text-black">{user?.email}</p>
            </div>

            {/* Delete Account */}
            <div className="border-2 border-red-200 p-6 bg-red-50">
              <h3 className="text-lg font-bold text-red-900 mb-2">Danger Zone</h3>
              <p className="text-sm text-red-700 mb-4">
                Once you delete your account, there is no going back. This will permanently delete:
              </p>
              <ul className="text-sm text-red-700 mb-4 list-disc list-inside">
                <li>Your profile</li>
                <li>All your posts</li>
                <li>All your comments</li>
                <li>All your likes</li>
                <li>Your followers and following</li>
              </ul>
              <button
                onClick={handleAccountDeletion}
                disabled={isDeleting}
                className={`w-full py-3 text-sm font-medium border-2 border-red-600 transition-colors ${
                  isDeleting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isDeleting ? 'Deleting...' : 'Delete Account Permanently'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}


