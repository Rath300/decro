# 💬 Decro Direct Messages - Complete Implementation Guide

This guide provides detailed instructions for implementing a full-featured Direct Messaging system in Decro with the "old internet" aesthetic.

---

## 📋 Overview

**Current Status:** Placeholder page exists at `/app/messages/page.tsx`

**Goal:** Implement real-time DMs with Space Mono font, brutalist design, black borders, and white backgrounds.

---

## 🎯 Option 1: SendBird (Recommended)

**Pros:**
- ✅ Battle-tested, enterprise-grade
- ✅ Real-time messaging out of the box
- ✅ File sharing built-in
- ✅ Read receipts and typing indicators
- ✅ Message history and search
- ✅ Great React SDK
- ✅ Free tier available (100 MAU)

**Cons:**
- ❌ Requires external service
- ❌ Paid for scale (after 100 MAU)

### Installation

```bash
npm install @sendbird/chat @sendbird/uikit-react
```

### Setup Steps

#### 1. Get SendBird Credentials

1. Go to https://sendbird.com/
2. Sign up for free account
3. Create new application
4. Copy App ID from dashboard
5. Generate API token from Settings > Application > API tokens

#### 2. Add Environment Variables

Add to `.env.local`:

```bash
NEXT_PUBLIC_SENDBIRD_APP_ID=your_app_id_here
SENDBIRD_API_TOKEN=your_api_token_here
```

#### 3. Create Chat Context

Create `/src/context/chat-context.tsx`:

```tsx
'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import SendbirdChat, { BaseChannel, SendbirdChatWith } from '@sendbird/chat'
import { GroupChannelModule, GroupChannel } from '@sendbird/chat/groupChannel'
import { useAuth } from './auth-context'

interface ChatContextType {
  sb: SendbirdChatWith<GroupChannelModule[]> | null
  currentChannel: GroupChannel | null
  setCurrentChannel: (channel: GroupChannel | null) => void
  unreadCount: number
}

const ChatContext = createContext<ChatContextType>({
  sb: null,
  currentChannel: null,
  setCurrentChannel: () => {},
  unreadCount: 0,
})

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [sb, setSb] = useState<SendbirdChatWith<GroupChannelModule[]> | null>(null)
  const [currentChannel, setCurrentChannel] = useState<GroupChannel | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const initSendBird = async () => {
      try {
        const sendbird = SendbirdChat.init({
          appId: process.env.NEXT_PUBLIC_SENDBIRD_APP_ID!,
          modules: [new GroupChannelModule()],
        })

        await sendbird.connect(user.id, undefined)
        
        // Update user profile
        await sendbird.updateCurrentUserInfo({
          nickname: user.name || 'User',
          profileUrl: user.image || '',
        })

        setSb(sendbird)

        // Get total unread count
        const totalUnread = await sendbird.groupChannel.getTotalUnreadMessageCount()
        setUnreadCount(totalUnread)
      } catch (error) {
        console.error('Failed to initialize SendBird:', error)
      }
    }

    initSendBird()

    return () => {
      if (sb) {
        sb.disconnect()
      }
    }
  }, [isAuthenticated, user])

  return (
    <ChatContext.Provider value={{ sb, currentChannel, setCurrentChannel, unreadCount }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => useContext(ChatContext)
```

#### 4. Create Custom Chat Components

**A. Channel List Component**

Create `/src/components/chat/ChannelList.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { GroupChannel } from '@sendbird/chat/groupChannel'
import { useChat } from '@/context/chat-context'
import { formatDistanceToNow } from 'date-fns'

export function ChannelList() {
  const { sb, currentChannel, setCurrentChannel } = useChat()
  const [channels, setChannels] = useState<GroupChannel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sb) return

    const loadChannels = async () => {
      try {
        const query = sb.groupChannel.createMyGroupChannelListQuery({
          includeEmpty: true,
          order: 'latest_last_message',
          limit: 50,
        })

        const channelList = await query.next()
        setChannels(channelList)
      } catch (error) {
        console.error('Failed to load channels:', error)
      } finally {
        setLoading(false)
      }
    }

    loadChannels()
  }, [sb])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b-2 border-black p-4 bg-white sticky top-0">
        <h2 className="font-['Space_Mono'] font-bold text-lg">Messages</h2>
      </div>

      {channels.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-600 font-['Space_Mono'] text-sm">
            No conversations yet. Start chatting!
          </p>
        </div>
      ) : (
        <div className="divide-y-2 divide-black">
          {channels.map((channel) => {
            const otherMembers = channel.members.filter((m) => m.userId !== sb?.currentUser?.userId)
            const displayName = otherMembers.map((m) => m.nickname).join(', ') || 'Unknown'
            const lastMessage = channel.lastMessage?.message || 'No messages'
            const unreadCount = channel.unreadMessageCount
            const isActive = currentChannel?.url === channel.url

            return (
              <button
                key={channel.url}
                onClick={() => setCurrentChannel(channel)}
                className={`w-full p-4 text-left transition-colors ${
                  isActive ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className={`font-['Space_Mono'] font-bold text-sm truncate ${
                    isActive ? 'text-white' : 'text-black'
                  }`}>
                    {displayName}
                  </h3>
                  {unreadCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-['Space_Mono'] rounded-none">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <p className={`font-['Space_Mono'] text-xs truncate ${
                  isActive ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {lastMessage}
                </p>
                {channel.lastMessage && (
                  <p className={`font-['Space_Mono'] text-[10px] mt-1 ${
                    isActive ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {formatDistanceToNow(channel.lastMessage.createdAt, { addSuffix: true })}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

**B. Message View Component**

Create `/src/components/chat/MessageView.tsx`:

```tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { useChat } from '@/context/chat-context'
import { BaseMessage, UserMessage, FileMessage } from '@sendbird/chat/message'
import { formatDistanceToNow } from 'date-fns'

export function MessageView() {
  const { sb, currentChannel } = useChat()
  const [messages, setMessages] = useState<BaseMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (!currentChannel) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
      setLoading(true)
      try {
        const query = currentChannel.createPreviousMessageListQuery({
          limit: 100,
          reverse: true,
        })

        const messageList = await query.load()
        setMessages(messageList)
        
        // Mark as read
        await currentChannel.markAsRead()
        
        setTimeout(scrollToBottom, 100)
      } catch (error) {
        console.error('Failed to load messages:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMessages()

    // Real-time message handler
    const channelHandler = {
      onMessageReceived: (channel: any, message: BaseMessage) => {
        if (channel.url === currentChannel.url) {
          setMessages((prev) => [...prev, message])
          currentChannel.markAsRead()
          setTimeout(scrollToBottom, 100)
        }
      },
    }

    const handlerId = `message_handler_${Date.now()}`
    sb?.groupChannel.addGroupChannelHandler(handlerId, channelHandler)

    return () => {
      if (sb) {
        sb.groupChannel.removeGroupChannelHandler(handlerId)
      }
    }
  }, [currentChannel, sb])

  const sendMessage = async () => {
    if (!currentChannel || !messageText.trim()) return

    try {
      const params = {
        message: messageText.trim(),
      }

      const message = await currentChannel.sendUserMessage(params)
      setMessages((prev) => [...prev, message])
      setMessageText('')
      setTimeout(scrollToBottom, 100)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  if (!currentChannel) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <p className="font-['Space_Mono'] text-gray-600">
            Select a conversation to start messaging
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b-2 border-black p-4 bg-white">
        <h2 className="font-['Space_Mono'] font-bold text-lg">
          {currentChannel.members
            .filter((m) => m.userId !== sb?.currentUser?.userId)
            .map((m) => m.nickname)
            .join(', ') || 'Unknown'}
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent"></div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isOwn = message.sender?.userId === sb?.currentUser?.userId
              const messageContent = (message as UserMessage).message || (message as FileMessage).name

              return (
                <div
                  key={message.messageId}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isOwn && (
                      <span className="font-['Space_Mono'] text-xs text-gray-600 mb-1">
                        {message.sender?.nickname}
                      </span>
                    )}
                    <div
                      className={`px-4 py-2 border-2 border-black font-['Space_Mono'] text-sm ${
                        isOwn ? 'bg-black text-white' : 'bg-white text-black'
                      }`}
                    >
                      {messageContent}
                    </div>
                    <span className="font-['Space_Mono'] text-[10px] text-gray-500 mt-1">
                      {formatDistanceToNow(message.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t-2 border-black p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border-2 border-black font-['Space_Mono'] text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={sendMessage}
            disabled={!messageText.trim()}
            className="px-6 py-2 bg-black text-white font-['Space_Mono'] text-sm border-2 border-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
```

#### 5. Update Messages Page

Replace `/src/app/messages/page.tsx`:

```tsx
'use client'

import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ChannelList } from '@/components/chat/ChannelList'
import { MessageView } from '@/components/chat/MessageView'

export default function MessagesPage() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="h-[calc(100vh-80px)] bg-white font-['Space_Mono'] border-2 border-black m-4">
      <div className="flex h-full">
        {/* Channel List */}
        <div className="w-1/3 border-r-2 border-black">
          <ChannelList />
        </div>

        {/* Message View */}
        <div className="w-2/3">
          <MessageView />
        </div>
      </div>
    </div>
  )
}
```

#### 6. Wrap App with ChatProvider

Update `/src/app/layout.tsx`:

```tsx
import { ChatProvider } from '@/context/chat-context'

// In the return statement:
<ClientProviders>
  <PostProvider>
    <ChatProvider>
      <RootChrome>
        {children}
      </RootChrome>
      <ToastContainer />
    </ChatProvider>
  </PostProvider>
</ClientProviders>
```

#### 7. Add Unread Badge to Navigation

Update `/src/components/AppHeader.tsx`:

```tsx
import { useChat } from '@/context/chat-context'

// In the component:
const { unreadCount } = useChat()

// Update the Messages tab:
<div className="relative">
  <Tab href="/messages" label="Messages" active={isMessages} />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-['Space_Mono'] rounded-none">
      {unreadCount}
    </span>
  )}
</div>
```

#### 8. Create DM from Profile Page

Update `/src/app/profile/[username]/page.tsx` to add a "Message" button:

```tsx
import { useChat } from '@/context/chat-context'
import { useRouter } from 'next/navigation'

// In the component:
const { sb } = useChat()
const router = useRouter()

const startConversation = async () => {
  if (!sb || !profileData?.id) return

  try {
    // Create or get existing channel
    const params = {
      isDistinct: true,
      invitedUserIds: [profileData.external_id],
      name: `Chat with ${profileData.username}`,
    }

    const channel = await sb.groupChannel.createChannel(params)
    router.push('/messages')
  } catch (error) {
    console.error('Failed to start conversation:', error)
  }
}

// Add button next to Follow button:
<button
  onClick={startConversation}
  className="px-4 py-2 border-2 border-black bg-white text-black hover:bg-gray-50 transition-colors font-['Space_Mono']"
>
  Message
</button>
```

---

## 🎯 Option 2: Stream Chat

Similar to SendBird but different API. See: https://getstream.io/chat/

**Installation:**
```bash
npm install stream-chat stream-chat-react
```

**Pros/Cons:** Same as SendBird

---

## 🎯 Option 3: Custom Supabase Implementation

**Pros:**
- ✅ No external service
- ✅ Full control
- ✅ Free (only Supabase costs)
- ✅ Data stays in your database

**Cons:**
- ❌ More work to implement
- ❌ Need to build all features yourself
- ❌ More maintenance

### Database Schema

```sql
-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

-- Indexes
CREATE INDEX messages_conversation_id_idx ON messages(conversation_id);
CREATE INDEX messages_sender_id_idx ON messages(sender_id);
CREATE INDEX conversation_participants_user_id_idx ON conversation_participants(user_id);

-- RLS Policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Users can only see messages from their conversations
CREATE POLICY "Users can view messages from their conversations"
ON messages FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- Similar policies for INSERT, UPDATE, DELETE...
```

### Real-time Setup

```tsx
// Subscribe to new messages
useEffect(() => {
  if (!conversationId) return

  const subscription = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        setMessages((prev) => [...prev, payload.new as Message])
      }
    )
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}, [conversationId])
```

**This option requires significantly more work but gives you full control.**

---

## 🎨 Design Guidelines

### Colors
- **Background:** White (`#FFFFFF`)
- **Text:** Black (`#000000`)
- **Borders:** 2px solid black
- **Accent:** Red for unread badges

### Typography
- **Font:** Space Mono (monospace)
- **Sizes:**
  - Headers: `text-lg` (18px)
  - Messages: `text-sm` (14px)
  - Meta info: `text-xs` (12px)
  - Timestamps: `text-[10px]` (10px)

### Layout
- **No rounded corners** - Square everything
- **Sharp borders** - 2px solid black
- **High contrast** - Black on white
- **Minimal padding** - Generous but consistent
- **Grid layout** - Channel list (1/3) + Messages (2/3)

---

## ✅ Testing Checklist

After implementation:

- [ ] User can see conversation list
- [ ] User can start new conversation from profile
- [ ] Messages send in real-time
- [ ] Messages receive in real-time
- [ ] Unread count updates
- [ ] Mark as read works
- [ ] Timestamps display correctly
- [ ] UI matches Decro aesthetic (Space Mono, black borders, etc.)
- [ ] Mobile responsive
- [ ] Typing indicators work (if implemented)
- [ ] File sharing works (if implemented)
- [ ] Search conversations works (if implemented)

---

## 📚 Additional Resources

- **SendBird Docs:** https://sendbird.com/docs
- **Stream Chat Docs:** https://getstream.io/chat/docs/
- **Supabase Realtime:** https://supabase.com/docs/guides/realtime

---

**Recommended:** Start with SendBird for fastest implementation. If you need full control and don't want external dependencies, go with the custom Supabase implementation (but expect 2-3x more work).

**Estimated Time:**
- SendBird: 4-6 hours
- Stream Chat: 4-6 hours
- Custom Supabase: 12-16 hours

