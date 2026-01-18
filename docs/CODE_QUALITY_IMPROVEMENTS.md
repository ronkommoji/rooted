# Code Quality Improvements - Phase 1: Utilities & Foundation

This document details the code quality improvements implemented to address technical debt identified in the codebase analysis.

## Overview

Phase 1 focuses on creating **reusable utilities** that eliminate duplicate code and establish patterns for future development:

1. ✅ Structured Logging System
2. ✅ Date/Time Utilities
3. ✅ File Validation Utilities
4. ✅ Modal Management Hook
5. ✅ Performance Library (FlashList)

---

## 1. Structured Logging System

### Problem
- 151 console.log/warn/error statements across 29 files
- No way to track errors in production
- Inconsistent log formatting
- No log levels or filtering

### Solution: `src/lib/logger.ts`

A comprehensive logging utility with:
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Environment Awareness**: Debug logs only in development
- **Structured Context**: Pass objects with additional data
- **Remote Logging Ready**: Integration point for Sentry/LogRocket
- **Performance Tracking**: Built-in timing utilities

### API

```typescript
import { logger } from '@/lib/logger';

// Basic logging
logger.debug('User clicked button', { buttonId: 'submit' });
logger.info('Prayer created successfully', { prayerId: prayer.id });
logger.warn('Cache miss for devotionals', { groupId });
logger.error('Failed to fetch prayers', error, { userId, groupId });

// Performance tracking
const endTimer = logger.startTimer('FetchPrayers');
await fetchPrayers();
endTimer(); // Logs: "FetchPrayers completed (duration: 245ms)"

// User action tracking
logger.logUserAction('ShareDevotional', { devotionalId });

// API call logging
logger.logApiCall('POST', '/prayers', 201, 156);
```

### Benefits
- 🔍 **Debuggable**: Searchable, structured logs
- 📊 **Observable**: Ready for production monitoring
- 🎯 **Targeted**: Filter by log level
- 🚀 **Performant**: Zero overhead in production for debug logs

### Migration Strategy
Replace console.log calls gradually:
```typescript
// Before
console.log('Fetching prayers for group:', groupId);
console.error('Error:', error);

// After
logger.info('Fetching prayers', { groupId });
logger.error('Failed to fetch prayers', error, { groupId });
```

---

## 2. Date/Time Utilities

### Problem
Duplicate date formatting code found in:
- `HomeScreen.tsx`
- `PrayerWallScreen.tsx`
- `DevotionalsScreen.tsx`
- `EventsScreen.tsx`
- Multiple other components

Each implemented their own `timeAgo` and date formatting logic.

### Solution: `src/lib/dateUtils.ts`

Centralized date/time utilities using `date-fns`:

| Function | Usage | Output |
|----------|-------|--------|
| `formatDate(date)` | Short date | "Jan 15, 2024" |
| `formatDateLong(date)` | Long date | "Monday, January 15, 2024" |
| `formatTime(date)` | Time only | "3:30 PM" |
| `formatDateTime(date)` | Date + time | "Jan 15, 2024 at 3:30 PM" |
| `timeAgo(date)` | Relative time | "2h ago", "5d ago" |
| `timeAgoLong(date)` | Relative (words) | "about 2 hours ago" |
| `formatEventDate(date)` | Smart format | "Today at 3:30 PM", "Tomorrow at 3:30 PM" |
| `isToday(date)` | Boolean check | `true` / `false` |
| `isInPast(date)` | Boolean check | `true` / `false` |
| `isInFuture(date)` | Boolean check | `true` / `false` |
| `daysUntil(date)` | Days difference | `-1` (yesterday), `0` (today), `3` (3 days from now) |

### API

```typescript
import { formatDate, timeAgo, formatEventDate } from '@/lib/dateUtils';

// Display formatted dates
<Text>{formatDate(prayer.created_at)}</Text>
<Text>{timeAgo(devotional.created_at)}</Text>
<Text>{formatEventDate(event.start_time)}</Text>

// Conditional rendering
{isToday(event.date) && <Badge>Today</Badge>}
{isInPast(event.date) && <Text>Past Event</Text>}

// Sort by date
events.sort((a, b) => daysUntil(a.date) - daysUntil(b.date));
```

### Benefits
- 🎯 **Consistent**: Same formatting across the app
- 🧹 **DRY**: No duplicate code
- 🧪 **Testable**: Easy to unit test
- 🌍 **Maintainable**: Change once, applies everywhere
- 🔄 **Reliable**: Uses battle-tested `date-fns` library

### Code Reduction
Eliminates ~50-100 lines of duplicate date formatting code across screens.

---

## 3. File Validation Utilities

### Problem
Current file upload in `useDevotionals.ts` only checks file extension:
```typescript
// ❌ BEFORE - Easily spoofed
const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
```

Security issues:
- No file size limits
- No MIME type validation
- No content validation
- Extension can be faked

### Solution: `src/lib/fileValidation.ts`

Comprehensive file validation with:
- **Size Limits**: Configurable max file sizes
- **MIME Type Validation**: Checks actual file type, not just extension
- **Content Validation**: Verifies file is what it claims to be
- **Image Dimension Validation**: Optional min/max width/height
- **Sanitization**: Filename sanitization and unique naming

### API

```typescript
import { validateImage, validateVideo, validateDocument } from '@/lib/fileValidation';

// Validate image upload
const validation = await validateImage(imageUri, {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png'],
  maxWidth: 4000,
  maxHeight: 4000,
});

if (!validation.valid) {
  Alert.alert('Invalid Image', validation.error);
  return;
}

// Validation result includes metadata
console.log(validation.fileSize); // 2048576
console.log(validation.mimeType); // "image/jpeg"
```

### Constants

```typescript
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;      // 5MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;     // 50MB
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;  // 10MB

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];
```

### Helper Functions

```typescript
// Convert bytes to readable string
getFileSizeString(2048576) // "2.0 MB"

// Sanitize filename for upload
sanitizeFilename("My Photo!@#$.jpg") // "My_Photo.jpg"

// Generate unique filename
generateUniqueFilename("photo.jpg", "user-123")
// "user-123_1705339200000_photo.jpg"
```

### Benefits
- 🔒 **Secure**: Prevents malicious file uploads
- ✅ **Validated**: Checks file size and type
- 🎯 **User-Friendly**: Clear error messages
- 📏 **Configurable**: Flexible limits and types
- 🛡️ **Production-Ready**: Handles edge cases

### Migration

Replace basic extension checks:
```typescript
// ❌ BEFORE
const fileExt = imageUri.split('.').pop()?.toLowerCase();
if (!['jpg', 'jpeg', 'png'].includes(fileExt)) {
  Alert.alert('Invalid file type');
  return;
}

// ✅ AFTER
const validation = await validateImage(imageUri);
if (!validation.valid) {
  Alert.alert('Invalid Image', validation.error);
  return;
}
```

---

## 4. Modal Management Hook

### Problem
Duplicate modal state management in every screen:
```typescript
// Found in HomeScreen, PrayerWallScreen, EventsScreen, etc.
const [isModalVisible, setIsModalVisible] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);

const openModal = (item) => {
  setSelectedItem(item);
  setIsModalVisible(true);
};

const closeModal = () => {
  setIsModalVisible(false);
  setSelectedItem(null);
};
```

### Solution: `src/hooks/useModal.ts`

Reusable modal management hook:

```typescript
import { useModal } from '@/hooks/useModal';

// Simple modal
const createModal = useModal();

<Button onPress={createModal.open} title="Create" />
<Modal visible={createModal.isOpen} onRequestClose={createModal.close}>
  <CreateForm onClose={createModal.close} />
</Modal>

// Modal with data
const editModal = useModal<Prayer>();

<Button onPress={() => editModal.open(prayer)} title="Edit" />
<Modal visible={editModal.isOpen} onRequestClose={editModal.close}>
  {editModal.data && <EditForm prayer={editModal.data} />}
</Modal>
```

### Multiple Modals

For screens with multiple modals, use `useModalGroup`:

```typescript
import { useModalGroup } from '@/hooks/useModal';

const modals = useModalGroup(['create', 'edit', 'delete']);

<Button onPress={() => modals.open('create')} />
<Modal visible={modals.isOpen('create')}>...</Modal>

<Button onPress={() => modals.open('edit', prayer)} />
<Modal visible={modals.isOpen('edit')}>
  {modals.getData('edit') && <EditForm prayer={modals.getData('edit')} />}
</Modal>

<Button onPress={() => modals.open('delete', prayer)} />
<Modal visible={modals.isOpen('delete')}>
  {modals.getData('delete') && <DeleteConfirm prayer={modals.getData('delete')} />}
</Modal>
```

### API

```typescript
const modal = useModal<DataType>();

// Properties
modal.isOpen       // boolean
modal.data         // DataType | null

// Methods
modal.open(data?)  // Open modal with optional data
modal.close()      // Close modal and clear data
modal.toggle()     // Toggle open/close
modal.setData(data) // Update data without changing open state
```

### Benefits
- 🧹 **DRY**: No duplicate modal state logic
- 🎯 **Type-Safe**: TypeScript support for modal data
- 🔄 **Consistent**: Same API across all screens
- 🎨 **Simple**: Reduces boilerplate by 10-15 lines per modal

### Code Reduction
Eliminates 10-15 lines of boilerplate per modal. With ~15 modals in the app, saves ~150-225 lines of code.

---

## 5. Performance Library: FlashList

### Problem
Long lists using `ScrollView` or `FlatList` with many items cause:
- Slow rendering
- High memory usage
- Janky scrolling
- Poor performance with 50+ items

Found in:
- `PrayerWallScreen.tsx` - Prayer list
- `DevotionalsScreen.tsx` - Devotionals feed
- `EventsScreen.tsx` - Events list
- `HomeScreen.tsx` - Multiple lists

### Solution: `@shopify/flash-list`

Installed FlashList for superior performance:
- **10x faster** than FlatList for large lists
- **Better memory usage** - only renders visible items
- **Recycling** - reuses components
- **Blank space management** - prevents white flashes

### Migration

```typescript
// ❌ BEFORE - FlatList
import { FlatList } from 'react-native';

<FlatList
  data={prayers}
  renderItem={({ item }) => <PrayerCard prayer={item} />}
  keyExtractor={(item) => item.id}
/>

// ✅ AFTER - FlashList
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={prayers}
  renderItem={({ item }) => <PrayerCard prayer={item} />}
  keyExtractor={(item) => item.id}
  estimatedItemSize={120} // Approximate height in pixels
/>
```

### Best Practices

1. **estimatedItemSize**: Provide approximate item height
2. **Key extractor**: Use stable, unique keys
3. **Item recycling**: Keep items simple and consistent
4. **Avoid dynamic heights**: Prefer fixed or estimated heights

### Benefits
- ⚡ **10x Faster**: Renders large lists instantly
- 💾 **Memory Efficient**: Uses less memory
- 🎯 **Smooth Scrolling**: 60fps even with 100s of items
- 🔄 **Drop-in Replacement**: Minimal code changes

---

## Implementation Checklist

### ✅ Phase 1: Utilities (COMPLETE)
- [x] Create structured logger
- [x] Create date/time utilities
- [x] Create file validation utilities
- [x] Create modal management hook
- [x] Install FlashList
- [x] Write documentation

### 🔄 Phase 2: Refactoring (IN PROGRESS)
- [ ] Replace console.log with logger
- [ ] Update file upload to use validation
- [ ] Migrate to FlashList in all screens
- [ ] Refactor modals to use hook
- [ ] Use date utils throughout

### 📋 Phase 3: Component Refactoring (PENDING)
- [ ] Break up EventsScreen.tsx (1,369 lines)
- [ ] Break up HomeScreen.tsx (1,157 lines)
- [ ] Break up PrayerWallScreen.tsx (969 lines)
- [ ] Break up useDevotionals.ts (717 lines)

### 🎨 Phase 4: Optimization (PENDING)
- [ ] Add React.memo to frequently rendered components
- [ ] Add useCallback for callbacks passed to children
- [ ] Add useMemo for expensive computations
- [ ] Profile and optimize re-renders

---

## File Structure

New utility files added:

```
src/
  lib/
    logger.ts              ← Structured logging
    dateUtils.ts           ← Date/time utilities
    fileValidation.ts      ← File upload validation
    asyncUtils.ts          ← (Already existed)
    rateLimiter.ts         ← (Already existed)
    supabase.ts            ← (Already existed)
  hooks/
    useModal.ts            ← Modal management hook
```

---

## Migration Guide

### 1. Update Imports

Add to commonly used files:
```typescript
import { logger } from '@/lib/logger';
import { formatDate, timeAgo } from '@/lib/dateUtils';
import { validateImage } from '@/lib/fileValidation';
import { useModal } from '@/hooks/useModal';
```

### 2. Replace console.log

Search and replace pattern:
```typescript
// Find:    console.log(
// Replace: logger.debug(

// Find:    console.info(
// Replace: logger.info(

// Find:    console.warn(
// Replace: logger.warn(

// Find:    console.error(
// Replace: logger.error(
```

### 3. Update Date Formatting

```typescript
// Before
const timeAgo = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  // ... 20 more lines
};

// After
import { timeAgo } from '@/lib/dateUtils';
// Just use it!
```

### 4. Update File Uploads

```typescript
// Before
if (!['jpg', 'jpeg', 'png'].includes(fileExt)) {
  Alert.alert('Invalid file');
  return;
}

// After
const validation = await validateImage(uri);
if (!validation.valid) {
  Alert.alert('Error', validation.error);
  return;
}
```

### 5. Update Modals

```typescript
// Before (15 lines)
const [isVisible, setIsVisible] = useState(false);
const [data, setData] = useState(null);
const open = (item) => { setData(item); setIsVisible(true); };
const close = () => { setIsVisible(false); setData(null); };

// After (1 line)
const modal = useModal();
```

---

## Performance Impact

### Code Reduction
- **Logger**: Eliminates 151 console.log statements
- **Date Utils**: Removes ~100 lines of duplicate date formatting
- **File Validation**: Adds security with better validation
- **Modal Hook**: Saves ~150 lines of modal boilerplate
- **Total**: ~400 lines of code removed/simplified

### Performance Improvements
- **Logging**: Zero overhead for debug logs in production
- **Date Utils**: Uses optimized date-fns library
- **File Validation**: Prevents invalid uploads early
- **FlashList**: 10x faster list rendering

### Developer Experience
- ✅ Less boilerplate
- ✅ Consistent APIs
- ✅ Type-safe utilities
- ✅ Better debugging
- ✅ Easier maintenance

---

## Testing

All new utilities should be unit tested:

```typescript
// src/lib/__tests__/logger.test.ts
// src/lib/__tests__/dateUtils.test.ts
// src/lib/__tests__/fileValidation.test.ts
// src/hooks/__tests__/useModal.test.ts
```

Run tests:
```bash
npm test -- src/lib/__tests__/
npm test -- src/hooks/__tests__/
```

---

## Next Steps

1. **Phase 2**: Apply these utilities throughout the codebase
2. **Phase 3**: Break up large files (EventsScreen, HomeScreen, etc.)
3. **Phase 4**: Add performance optimizations (React.memo, useCallback)
4. **Phase 5**: Add integration with Sentry for remote logging

---

## Questions?

- **Logger**: See `src/lib/logger.ts` for full API
- **Date Utils**: See `src/lib/dateUtils.ts` for all functions
- **File Validation**: See `src/lib/fileValidation.ts` for usage
- **Modal Hook**: See `src/hooks/useModal.ts` for examples

## Summary

Phase 1 creates a **strong foundation** for code quality improvements. These utilities will be used extensively in Phase 2 and 3 to refactor large files and eliminate technical debt.

**Key Achievement**: Created reusable utilities that will eliminate ~400 lines of duplicate code and establish best practices for future development.
