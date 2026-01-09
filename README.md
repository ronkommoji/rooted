# 🌱 Rooted

**Stay grounded in faith. Grow together in community.**

Rooted is a faith-centered mobile app designed to help Christian small groups stay spiritually connected throughout the week. The app brings together daily devotionals, prayer requests, and event planning — all in one peaceful, community-oriented space.

---

## ✨ Features

### 🏠 Home
- **Weekly Scripture & Challenge** — A gentle invitation with scripture and a simple faith practice, rotating through 52 unique challenges yearly
- **Recent Prayer Requests** — Quick access to your group's latest prayer needs
- **Recent Devotionals** — See what your group members are sharing

### 🙏 Prayer Wall
- Share prayer requests with your group
- Track prayers with "Prayed" counts
- Mark prayers as answered
- Toggle between active requests and answered prayers

### 📖 Devotionals
- Daily devotional sharing with your group
- Week-at-a-glance calendar view
- Streak tracking for consistent posting
- Like and comment on devotionals
- Gentle reminders for group members

### 📅 Events
- Create and manage group events
- "I Have a Time" — Set a specific date/time
- "Find a Time" — Poll-based scheduling (coming soon)
- AI-generated study insights for Bible chapters
- RSVP tracking (Yes / No / Maybe)

### ⚙️ Settings
- Profile management
- Shareable invite codes for your group
- Notification preferences
- Light/Dark theme toggle

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator, or Expo Go app on your device

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Rooted
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (required)
   
   Create a `.env` file in the root directory (copy from `.env.example`):
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   
   **Important:** Get these values from your Supabase project settings:
   - Go to https://app.supabase.com/project/_/settings/api
   - Copy the "Project URL" for `EXPO_PUBLIC_SUPABASE_URL`
   - Copy the "anon public" key for `EXPO_PUBLIC_SUPABASE_ANON_KEY`

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run the app**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Press `w` for Web
   - Scan the QR code with Expo Go on your device

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React Native with Expo |
| Language | TypeScript |
| Backend | Supabase (PostgreSQL, Auth, Realtime) |
| State Management | Zustand |
| Navigation | React Navigation |
| Icons | @expo/vector-icons (Ionicons, MaterialCommunityIcons) |
| Date Handling | date-fns |

---

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Avatar.tsx
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── EmptyState.tsx
│   ├── Header.tsx
│   ├── Icon.tsx
│   ├── Input.tsx
│   └── PillToggle.tsx
├── context/             # React contexts
│   └── AuthContext.tsx
├── data/                # Static data
│   └── weeklyChallenge.ts  # 52 weekly challenges
├── lib/                 # External service configs
│   └── supabase.ts
├── navigation/          # App navigation
│   ├── AuthNavigator.tsx
│   ├── MainNavigator.tsx
│   └── RootNavigator.tsx
├── screens/             # App screens
│   ├── auth/
│   ├── devotionals/
│   ├── events/
│   ├── home/
│   ├── onboarding/
│   ├── prayers/
│   └── settings/
├── store/               # Zustand store
│   └── useAppStore.ts
├── theme/               # Theme configuration
│   ├── colors.ts
│   └── ThemeContext.tsx
└── types/               # TypeScript types
    └── database.ts
```

---

## 🎨 Design System

### Color Palette

**Light Theme**
| Purpose | Color | Hex |
|---------|-------|-----|
| Primary | Deep Sage | `#3D5A50` |
| Accent | Golden Wheat | `#E6C68B` |
| Secondary | Mist Blue | `#B9D6D2` |
| Background | Soft Linen | `#F5F4EF` |
| Text | Charcoal | `#2B2B2B` |

**Dark Theme**
| Purpose | Color | Hex |
|---------|-------|-----|
| Background | Charcoal Black | `#1E1E1E` |
| Cards | Slate Grey | `#2C3A37` |
| Text | Warm White | `#FDFBF7` |
| Accent | Golden Wheat | `#E6C68B` |
| Primary | Deep Sage | `#3D5A50` |

### Design Principles
- Rounded cards with soft shadows
- No gradients — clean, professional aesthetic
- Faith-forward, peaceful typography
- Gentle animations and transitions

---

## 📱 User Flows

### New User
1. Sign up with email and password
2. Choose to **Create a Group** or **Join a Group**
3. If creating: Name your group → Get invite code
4. If joining: Enter 6-character invite code
5. Land on Home with weekly challenge

### Returning User
1. Sign in
2. View weekly scripture and challenge
3. Check prayer requests and devotionals
4. Post your own content or plan events

---

## 🔐 Authentication

Rooted uses Supabase Auth with email/password authentication. Features include:
- Secure session management
- Automatic token refresh
- Cross-platform storage (SecureStore for native, AsyncStorage for web)

---

## 📊 Database Schema

Key tables:
- `profiles` — User profiles
- `groups` — Small groups with invite codes
- `group_members` — Group membership
- `prayers` — Prayer requests (includes prayer_count field)
- `devotionals` — Daily devotional posts
- `events` — Group events
- `user_streaks` — Devotional streak tracking

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is private and proprietary.

---

## 🙏 Acknowledgments

Built with love for Christian communities everywhere. May this app help small groups stay connected in faith throughout the week.

> *"For where two or three gather in my name, there am I with them."*  
> — Matthew 18:20

