# Rooted - Product Requirements Document (PRD)

## 📋 Overview

**Product Name:** Rooted  
**Version:** 2.0  
**Last Updated:** 2024  
**Status:** Active Development

Rooted is a faith-centered mobile app designed to help Christian small groups stay spiritually connected throughout the week. The app brings together daily devotionals, prayer requests, event planning, and Bible study — all in one peaceful, community-oriented space.

---

## 🎯 Product Vision

**Mission Statement:**  
"Stay grounded in faith. Grow together in community."

**Core Values:**
- Faith-forward design
- Community connection
- Peaceful, non-distracting experience
- Encouraging spiritual growth

---

## 👥 Target Users

### Primary Users
- **Small Group Leaders** — Organize and facilitate group activities
- **Small Group Members** — Participate in group activities and stay connected

### User Personas
1. **Sarah, 35, Small Group Leader**
   - Wants to keep her group engaged throughout the week
   - Needs tools to organize events and track participation
   - Values simplicity and ease of use

2. **Michael, 28, Group Member**
   - Wants to stay connected with his group
   - Appreciates daily spiritual content
   - Prefers quick, accessible features

---

## ✨ Core Features

### 1. 🏠 Home Screen

**Purpose:** Central hub for daily spiritual engagement

**Features:**
- **Daily Devotional Card**
  - Displays today's devotional with scripture, devotional content, and prayer
  - Completion tracking for all three components
  - Visual indicators for completion status
  - Direct navigation to detailed views
  
- **Weekly Scripture & Challenge**
  - Rotating 52-week challenge system
  - Scripture-based encouragement
  - Simple, actionable faith practices
  
- **Recent Prayer Requests**
  - Quick access to latest prayer needs
  - Visual prayer count indicators
  
- **Recent Devotionals**
  - Preview of group member submissions
  - Story-style viewing experience

**User Stories:**
- As a user, I want to see my daily devotional on the home screen so I can start my day with spiritual content
- As a user, I want to track my completion of daily devotional components so I can maintain my streak
- As a user, I want quick access to prayer requests so I can pray for my group members

---

### 2. 📖 Devotionals

**Purpose:** Share and engage with daily spiritual content

**Features:**
- **Daily Devotional System**
  - Scripture reading with verse-by-verse navigation
  - Devotional content reading
  - Prayer request integration
  - Completion tracking and streak system
  
- **Devotional Sharing**
  - Post daily devotionals with images
  - Week-at-a-glance calendar view
  - Like and comment functionality
  - Story-style viewing for member submissions
  
- **Streak Tracking**
  - Visual streak indicators
  - Encouragement for consistency
  - Group-wide streak visibility

**User Stories:**
- As a user, I want to read daily scripture verse-by-verse so I can reflect on each verse
- As a user, I want to track my daily devotional completion so I can build a consistent habit
- As a user, I want to share my devotional reflections so my group can see my journey
- As a user, I want to see my streak so I'm motivated to continue

---

### 3. 🙏 Prayer Wall

**Purpose:** Share and track prayer requests

**Features:**
- Create prayer requests
- "Prayed" count tracking
- Mark prayers as answered
- Filter between active and answered prayers
- Prayer detail view with comments

**User Stories:**
- As a user, I want to share prayer requests so my group can pray for me
- As a user, I want to see who has prayed so I know my group is supporting me
- As a user, I want to mark prayers as answered so I can celebrate God's faithfulness

---

### 4. 📅 Events

**Purpose:** Plan and coordinate group activities

**Features:**
- Create events with details (title, date, time, location, notes)
- RSVP tracking (Yes / No / Maybe)
- Attendee list with avatars
- Filter between upcoming and past events
- Event notifications

**User Stories:**
- As a leader, I want to create events so my group knows when we're meeting
- As a member, I want to RSVP so the leader knows who's coming
- As a user, I want to see event details so I can plan accordingly

---

### 5. 📚 Bible

**Purpose:** Read and engage with Scripture

**Features:**
- Full Bible access (Old and New Testament)
- Verse-by-verse reading
- Comment system on verses
- Comment count indicators
- Chapter navigation
- Search functionality

**User Stories:**
- As a user, I want to read the Bible so I can study Scripture
- As a user, I want to comment on verses so I can share insights with my group
- As a user, I want to see which verses have comments so I can engage with group discussions

---

### 6. ⚙️ Settings

**Purpose:** Manage account and preferences

**Features:**
- Profile management
- Group invite code sharing
- Notification preferences
- Theme toggle (Light/Dark)
- Sign out

**User Stories:**
- As a user, I want to manage my profile so my information is accurate
- As a leader, I want to share invite codes so new members can join
- As a user, I want to control notifications so I'm not overwhelmed

---

## 🚀 Performance Requirements

### Caching Strategy
- **2-minute cache** for devotionals, daily devotional data, and comment counts
- **10-minute cache** for Bible chapters
- **30-second cache** for completion status
- Background refresh for stale data
- Instant loading when navigating to cached pages

### Performance Metrics
- **Target:** < 100ms load time for cached pages
- **Target:** < 2s load time for fresh data
- **Target:** 80% reduction in API calls through caching
- **Target:** Smooth 60fps navigation

---

## 🎨 Design Requirements

### Visual Design
- **Color Palette:**
  - Primary: Deep Sage (#3D5A50)
  - Accent: Golden Wheat (#E6C68B)
  - Background: Soft Linen (#F5F4EF) / Charcoal Black (#1E1E1E)
  
- **Typography:**
  - Playfair Display for headings
  - System fonts for body text
  
- **Components:**
  - Rounded cards with soft shadows
  - No gradients — clean, professional aesthetic
  - Gentle animations and transitions

### UX Principles
- **Simplicity:** Clean, uncluttered interfaces
- **Accessibility:** Clear contrast, readable fonts
- **Feedback:** Visual indicators for all actions
- **Consistency:** Unified design language throughout

---

## 🔐 Security & Privacy

### Authentication
- Email/password authentication via Supabase
- Secure session management
- Automatic token refresh
- Cross-platform secure storage

### Data Privacy
- User data stored securely in Supabase
- Row-level security policies
- No third-party data sharing
- User control over profile visibility

---

## 📱 Technical Requirements

### Platform Support
- iOS (13+)
- Android (API 21+)
- Web (responsive)

### Technology Stack
- **Framework:** React Native with Expo
- **Language:** TypeScript
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **State Management:** Zustand
- **Navigation:** React Navigation

### API Requirements
- Daily Devotional API integration
- Supabase for data persistence
- Real-time updates for comments and likes

---

## 📊 Success Metrics

### Engagement Metrics
- Daily active users (DAU)
- Weekly active users (WAU)
- Average session duration
- Daily devotional completion rate
- Streak maintenance rate

### Performance Metrics
- App load time
- Screen navigation speed
- API response times
- Cache hit rate

### User Satisfaction
- App store ratings
- User feedback
- Feature adoption rates
- Retention rates

---

## 🗺️ Roadmap

### ✅ Completed (v2.0)
- Daily Devotional feature
- Performance optimizations with caching
- Navigation bug fixes
- Bible reading with comments
- Prayer wall enhancements

### 🔄 In Progress
- Notification system improvements
- Event scheduling enhancements

### 📅 Planned
- "Find a Time" event scheduling
- Group analytics dashboard
- Enhanced Bible study tools
- Offline mode support

---

## 🐛 Known Issues & Limitations

### Current Limitations
- No offline mode (requires internet connection)
- Limited to English language
- No video/audio content support

### Technical Debt
- Some legacy code needs refactoring
- Test coverage could be improved
- Documentation needs expansion

---

## 📝 Change Log

### Version 2.0 (Current)
- ✨ Added Daily Devotional feature
- ⚡ Implemented intelligent caching system
- 🐛 Fixed navigation flash issues
- 🚀 Improved performance across all screens
- 📖 Enhanced Bible reading experience

### Version 1.0
- Initial release
- Core features: Home, Prayer Wall, Devotionals, Events
- Basic authentication and group management

---

## 🤝 Contributing

See [README.md](./README.md) for contribution guidelines.

---

## 📄 License

This project is private and proprietary.

---

## 🙏 Acknowledgments

Built with love for Christian communities everywhere. May this app help small groups stay connected in faith throughout the week.

> *"For where two or three gather in my name, there am I with them."*  
> — Matthew 18:20
