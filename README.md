# 🎨 Decro - Creative Social Platform

<div align="center">

![Decro Logo](public/decky.png)

**A social media platform for creators, artists, musicians, and photographers.**

[![Next.js](https://img.shields.io/badge/Next.js-13+-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=flat&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📖 About

**Decro** is a modern, production-ready social media platform designed for creative communities. Built with the "old internet" aesthetic in mind, Decro combines brutalist design with cutting-edge technology to provide a unique, authentic social experience.

### 🎯 Philosophy

- **No algorithm** - Chronological feeds for authentic content discovery
- **Creator-first** - Built for artists, musicians, and visual creators
- **Offline-first** - Works without internet connection
- **Real-time** - Live updates for likes, comments, and notifications
- **Privacy-focused** - Row-level security and transparent data practices

---

## ✨ Features

### 🎨 Content Creation
- 📷 **Multi-format posts** - Images, videos, audio, text, and more
- 🏷️ **Tag system** - Organize and discover content with tags
- 📁 **File uploads** - Robust upload system with compression
- 🎬 **Video thumbnails** - Auto-generated from video uploads
- 🎵 **Audio player** - Built-in player for music posts

### 🤝 Social Features
- 👥 **Follow system** - Connect with other creators
- ❤️ **Likes & comments** - Engage with content
- 🔔 **Real-time notifications** - Never miss an interaction
- 💬 **Direct messages** - Private conversations (placeholder, see [DM Guide](DM_IMPLEMENTATION_GUIDE.md))
- 👤 **User profiles** - Customizable with avatar, bio, and links

### 🔍 Discovery
- 📊 **Trending algorithm** - Discover popular content
- 🎯 **Subgroups** - Topic-based communities
- 🔎 **Search** - Find users and content
- 🏷️ **Tag filtering** - Browse posts by tag
- ⭐ **Spotlight** - Curated content showcase

### ⚡ Technical Features
- 🌐 **Offline-first** - IndexedDB caching with Dexie.js
- 🚀 **Real-time updates** - Supabase subscriptions
- 🔒 **Secure** - Row-level security (RLS)
- 📱 **Responsive** - Works on all devices
- 🎭 **Animations** - Smooth transitions with Framer Motion
- 🌍 **SEO optimized** - Meta tags, sitemap, robots.txt

---

## 🚀 Demo

**Live Demo:** [https://decro.vercel.app](https://decro.vercel.app) *(Update with your URL)*

### Screenshots

*Coming soon - Add screenshots here*

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** [Next.js 13+](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/), [GSAP](https://greensock.com/gsap/)
- **State Management:** React Context + [Zustand](https://github.com/pmndrs/zustand)
- **Offline Storage:** [Dexie.js](https://dexie.org/) (IndexedDB)

### Backend
- **Database:** [PostgreSQL](https://www.postgresql.org/) via [Supabase](https://supabase.com/)
- **Authentication:** [NextAuth.js](https://next-auth.js.org/)
- **Real-time:** Supabase Realtime
- **Storage:** Supabase Storage
- **Security:** Row-Level Security (RLS)

### Deployment
- **Hosting:** [Vercel](https://vercel.com/)
- **CDN:** Vercel Edge Network
- **Cron Jobs:** Vercel Cron (for trending refresh)

---

## 📦 Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Vercel account (for deployment)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/decro.git
cd decro
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the database migrations (see `supabase/migrations/` or use Supabase SQL Editor)
3. Configure Row-Level Security policies (see [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md))
4. Set up Supabase Storage bucket named `decro-uploads` (public access)

### 4. Configure Environment Variables

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Site URL (for SEO)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Cron Security
CRON_SECRET=your_cron_secret
```

Generate secrets:
```bash
# For NEXTAUTH_SECRET and CRON_SECRET
openssl rand -base64 32
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📚 Documentation

- **[Implementation Complete Guide](IMPLEMENTATION_COMPLETE.md)** - Full feature documentation
- **[DM Implementation Guide](DM_IMPLEMENTATION_GUIDE.md)** - Direct messaging setup
- **[Database Schema](docs/database-schema.md)** - *(Create this if needed)*
- **[API Reference](docs/api-reference.md)** - *(Create this if needed)*

---

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

```bash
# Or use Vercel CLI
npm i -g vercel
vercel
```

### Post-Deployment

- [ ] Update `NEXT_PUBLIC_SITE_URL` in environment variables
- [ ] Configure custom domain
- [ ] Test cron job: `https://yourdomain.com/api/cron/refresh-trending`
- [ ] Submit sitemap to Google Search Console
- [ ] Test on multiple devices

---

## 🗂️ Project Structure

```
decro/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── feed/              # Feed page
│   │   ├── trending/          # Trending page
│   │   ├── profile/           # Profile pages
│   │   ├── create/            # Post creation
│   │   ├── messages/          # DM page (placeholder)
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── feed-page.tsx     # Feed component
│   │   ├── AppHeader.tsx     # Navigation header
│   │   ├── DetailModal.tsx   # Post detail modal
│   │   └── ...
│   ├── context/               # React contexts
│   │   ├── auth-context.tsx  # Authentication
│   │   ├── post-context.tsx  # Post state
│   │   └── ...
│   ├── hooks/                 # Custom hooks
│   │   ├── use-notifications.ts
│   │   └── ...
│   ├── lib/                   # Utilities
│   │   ├── supabase-client.ts
│   │   ├── db.ts             # Dexie (IndexedDB)
│   │   ├── upload.ts         # File upload utils
│   │   └── ...
│   └── types/                 # TypeScript types
├── public/                    # Static assets
├── vercel.json               # Vercel config (cron jobs)
├── IMPLEMENTATION_COMPLETE.md # Documentation
├── DM_IMPLEMENTATION_GUIDE.md # DM setup guide
└── README.md                 # This file
```

---

## 🧪 Testing

### Manual Testing

```bash
# Run development server
npm run dev

# Test features:
# - Sign up / Sign in
# - Create post with image/video/audio
# - Like and comment
# - Follow users
# - Check notifications
# - Browse trending
# - Search and filter
```

### Automated Testing (Future)

```bash
# Unit tests (not yet implemented)
npm run test

# E2E tests (not yet implemented)
npm run test:e2e
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use TypeScript for all new code
- Follow the existing code style
- Add comments for complex logic
- Test thoroughly before submitting PR
- Update documentation if needed

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Design Inspiration:** Old internet aesthetics, brutalist web design
- **Font:** [Space Mono](https://fonts.google.com/specimen/Space+Mono) by Colophon Foundry
- **Icons:** Custom SVGs and emojis

---

## 📞 Support

- **Documentation:** [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)
- **Issues:** [GitHub Issues](https://github.com/yourusername/decro/issues)
- **Email:** your-email@example.com

---

## 🗺️ Roadmap

### ✅ Completed (v1.0)
- User authentication and profiles
- Post creation and management
- Social features (likes, comments, follows)
- Real-time notifications
- Tag system
- Trending algorithm
- Subgroups
- SEO optimization

### 🚧 In Progress
- Direct messaging system
- Advanced search
- User settings page

### 🔮 Future
- Mobile app (not planned)
- Email notifications (optional)
- Analytics dashboard (optional)
- Content moderation tools (optional)
- Admin dashboard (optional)

---

## 📊 Stats

- **Lines of Code:** ~15,000+
- **Components:** 30+
- **Database Tables:** 12
- **RPC Functions:** 15+
- **API Routes:** 5+

---

## 🎨 Design System

### Typography
- **Font:** Space Mono (monospace)
- **Weights:** Regular (400), Bold (700)

### Colors
- **Primary:** Black (`#000000`)
- **Background:** White (`#FFFFFF`)
- **Gray Scale:** 50, 100, 200, 300, 400, 500, 600, 700, 800, 900
- **Accent:** Blue (links), Red (likes), Green (success), Yellow (warnings)

### Spacing
- **Base Unit:** 4px
- **Scale:** 4, 8, 12, 16, 24, 32, 48, 64

### Borders
- **Width:** 2px
- **Style:** Solid
- **Color:** Black
- **Radius:** 0px (square corners)

---

<div align="center">

**Built with ❤️ by creators, for creators**

[⬆ Back to Top](#-decro---creative-social-platform)

</div>

