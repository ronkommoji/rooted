# Testing Guide for Rooted

This guide explains the testing infrastructure for the Rooted React Native app, including what was set up, how it works, the benefits, and how to expand it as the codebase grows.

## Table of Contents

- [Overview](#overview)
- [What Was Set Up](#what-was-set-up)
- [How It Works](#how-it-works)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Writing New Tests](#writing-new-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Benefits](#benefits)
- [Future Improvements](#future-improvements)

---

## Overview

The Rooted app now has a complete testing infrastructure using:
- **Jest** - Test runner and framework
- **React Testing Library** - React Native component testing
- **React Test Renderer** - Rendering React components in tests
- **Jest Expo** - Expo-specific Jest preset

### Current Test Coverage

✅ **25 passing tests** for `asyncUtils.ts` (100% coverage)
- `withTimeout` - 7 tests
- `withRetry` - 6 tests
- `allSettledWithTimeout` - 6 tests
- `debounce` - 6 tests

🔧 **Example tests created** for:
- `AuthContext.tsx` - Authentication logic patterns
- `useAppStore.ts` - Zustand store state management patterns

---

## What Was Set Up

### 1. Dependencies Installed

```json
{
  "devDependencies": {
    "jest": "^30.2.0",
    "jest-expo": "^54.0.16",
    "@testing-library/react-native": "^13.3.3",
    "@testing-library/jest-native": "^5.4.3",
    "@types/jest": "^30.0.0",
    "react-test-renderer": "^19.1.0"
  }
}
```

### 2. Configuration Files

#### `jest.config.js`
The Jest configuration file that:
- Uses `jest-expo` preset for React Native/Expo compatibility
- Sets up path aliases (`@/` maps to `src/`)
- Configures coverage thresholds (50% for all metrics)
- Ignores iOS/Android native code
- Transforms node_modules that need transpiling

#### `jest.setup.js`
Global test setup that runs before all tests:
- Mocks Expo modules (fonts, splash screen, notifications, etc.)
- Mocks AsyncStorage for local storage
- Mocks React Navigation
- Mocks Supabase client
- Mocks React Native components (SafeAreaView, etc.)
- Silences console warnings during tests

#### `__mocks__/fileMock.js`
Mock for static assets (images, fonts) in tests.

### 3. Test Scripts in package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:verbose": "jest --verbose",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

### 4. Example Test Files

#### ✅ `src/lib/__tests__/asyncUtils.test.ts` (COMPLETE)
- Comprehensive tests for all async utility functions
- 25 passing tests with 100% code coverage
- Tests timeouts, retries, debouncing, and parallel operations

#### 🔧 `src/context/__tests__/AuthContext.test.tsx` (TEMPLATE)
- Example patterns for testing React Context
- Shows how to test authentication flows
- Demonstrates renderHook usage
- **Note:** Requires mock refinement for production use

#### 🔧 `src/store/__tests__/useAppStore.test.ts` (TEMPLATE)
- Example patterns for testing Zustand stores
- Shows how to test state management
- Demonstrates async actions testing
- **Note:** Requires mock refinement for production use

---

## How It Works

### Test Execution Flow

1. **Jest** reads `jest.config.js` for configuration
2. **jest.setup.js** runs first, setting up global mocks
3. Jest finds all `*.test.ts` and `*.test.tsx` files
4. Each test file runs in isolation
5. Mocks ensure tests don't make real API calls or use real storage
6. Results are displayed in the terminal

### Mocking Strategy

The testing infrastructure uses **comprehensive mocking** to:
- Prevent real network calls (Supabase API)
- Avoid real storage writes (AsyncStorage)
- Skip platform-specific code (Expo modules)
- Isolate code under test

Example from `jest.setup.js`:
```javascript
jest.mock('@supabase/supabase-js', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signIn: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      // ... more mocks
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      // ... chainable query builder mocks
    }))
  }
}));
```

### Test Structure

Tests follow the **AAA pattern** (Arrange, Act, Assert):

```typescript
it('should resolve successfully when promise completes within timeout', async () => {
  // ARRANGE - Set up test data
  const promise = delay(100, 'success');

  // ACT - Execute the code under test
  const result = await withTimeout(promise, 200);

  // ASSERT - Verify the result
  expect(result).toBe('success');
});
```

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
Automatically reruns tests when files change:
```bash
npm run test:watch
```

### Run Tests with Coverage Report
Shows which lines of code are tested:
```bash
npm run test:coverage
```

Example coverage output:
```
----------------------|---------|----------|---------|---------|
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files             |   85.23 |    78.45 |   91.12 |   84.67 |
 asyncUtils.ts        |     100 |      100 |     100 |     100 |
 AuthContext.tsx      |   65.43 |    54.32 |   70.12 |   64.89 |
----------------------|---------|----------|---------|---------|
```

### Run Specific Test File
```bash
npm test -- src/lib/__tests__/asyncUtils.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="withTimeout"
```

### Run Tests in CI/CD
Optimized for continuous integration:
```bash
npm run test:ci
```

---

## Test Coverage

### Coverage Thresholds

Current thresholds in `jest.config.js`:
```javascript
coverageThreshold: {
  global: {
    branches: 50,    // 50% of if/else branches tested
    functions: 50,   // 50% of functions tested
    lines: 50,       // 50% of code lines tested
    statements: 50   // 50% of statements tested
  }
}
```

### Coverage Reports

After running `npm run test:coverage`:
- **Terminal**: Summary table
- **HTML Report**: `coverage/lcov-report/index.html` (open in browser)
- **LCOV File**: `coverage/lcov.info` (for CI tools)

### Files Excluded from Coverage

Per `jest.config.js`:
```javascript
collectCoverageFrom: [
  'src/**/*.{ts,tsx}',
  '!src/**/*.d.ts',           // Type definitions
  '!src/types/**',            // Type files
  '!src/**/*.styles.ts',      // Style files
  '!src/navigation/**',       // Navigation config
]
```

---

## Writing New Tests

### Step 1: Create Test File

Place tests next to the code they test:
```
src/
  lib/
    asyncUtils.ts
    __tests__/
      asyncUtils.test.ts    ← Test file here
```

Or co-locate in the same directory:
```
src/
  components/
    Button.tsx
    Button.test.tsx         ← Test file here
```

### Step 2: Import Testing Utilities

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { render, fireEvent } from '@testing-library/react-native';
```

### Step 3: Write Tests

#### Testing Pure Functions (Utilities)

```typescript
import { formatDate } from '../dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const result = formatDate('2024-01-15');
      expect(result).toBe('Jan 15, 2024');
    });

    it('should handle invalid dates', () => {
      expect(() => formatDate('invalid')).toThrow();
    });
  });
});
```

#### Testing React Components

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('should render correctly', () => {
    const { getByText } = render(<Button title="Click Me" onPress={() => {}} />);
    expect(getByText('Click Me')).toBeTruthy();
  });

  it('should call onPress when clicked', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(<Button title="Click" onPress={onPressMock} />);

    fireEvent.press(getByText('Click'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    const { getByText } = render(
      <Button title="Disabled" onPress={() => {}} disabled />
    );

    const button = getByText('Disabled');
    expect(button).toBeDisabled();
  });
});
```

#### Testing React Hooks

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useCounter } from '../useCounter';

describe('useCounter', () => {
  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter(0));

    expect(result.current.count).toBe(0);

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

#### Testing Context

```typescript
import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../ThemeContext';

describe('ThemeContext', () => {
  it('should provide theme to children', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('light');
  });
});
```

#### Testing Async Operations

```typescript
import { waitFor } from '@testing-library/react-native';

it('should fetch data successfully', async () => {
  const { result } = renderHook(() => useFetchData());

  expect(result.current.loading).toBe(true);

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.data).toBeDefined();
});
```

### Step 4: Mock Dependencies

#### Mock Supabase Queries

```typescript
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');

beforeEach(() => {
  (supabase.from as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { id: '123', name: 'Test' },
      error: null
    })
  });
});
```

#### Mock Navigation

```typescript
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn()
  })
}));

it('should navigate to details screen', () => {
  // ... test code that navigates
  expect(mockNavigate).toHaveBeenCalledWith('Details', { id: '123' });
});
```

#### Mock AsyncStorage

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

beforeEach(() => {
  AsyncStorage.clear();
});

it('should save to storage', async () => {
  await savePreference('theme', 'dark');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
});
```

---

## Best Practices

### 1. Test Behavior, Not Implementation

❌ **Bad** - Testing implementation details:
```typescript
it('should call setState with correct value', () => {
  const { result } = renderHook(() => useCounter());
  const setStateSpy = jest.spyOn(result.current, 'setState');
  result.current.increment();
  expect(setStateSpy).toHaveBeenCalled();
});
```

✅ **Good** - Testing behavior:
```typescript
it('should increment counter when increment is called', () => {
  const { result } = renderHook(() => useCounter());
  act(() => result.current.increment());
  expect(result.current.count).toBe(1);
});
```

### 2. Use Descriptive Test Names

❌ **Bad**:
```typescript
it('works', () => { /* ... */ });
it('test 1', () => { /* ... */ });
```

✅ **Good**:
```typescript
it('should display error message when email is invalid', () => { /* ... */ });
it('should disable submit button while loading', () => { /* ... */ });
```

### 3. Keep Tests Independent

Each test should work in isolation:

```typescript
describe('PrayerList', () => {
  beforeEach(() => {
    // Reset state before each test
    jest.clearAllMocks();
  });

  it('test 1', () => { /* ... */ });
  it('test 2', () => { /* ... */ }); // Should not depend on test 1
});
```

### 4. Test Edge Cases

```typescript
describe('validateEmail', () => {
  it('should accept valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  // Edge cases
  it('should reject empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('should reject email without @', () => {
    expect(validateEmail('invalid.email')).toBe(false);
  });

  it('should reject email with spaces', () => {
    expect(validateEmail('user @example.com')).toBe(false);
  });
});
```

### 5. Use Test Data Builders

Create reusable test data:

```typescript
// testUtils/builders.ts
export const buildMockPrayer = (overrides = {}) => ({
  id: 'prayer-123',
  title: 'Test Prayer',
  description: 'Test Description',
  is_answered: false,
  created_at: '2024-01-01',
  ...overrides
});

// In tests
it('should display prayer title', () => {
  const prayer = buildMockPrayer({ title: 'Custom Title' });
  // ... test with prayer
});
```

### 6. Group Related Tests

```typescript
describe('SignInScreen', () => {
  describe('Form Validation', () => {
    it('should show error for invalid email', () => { /* ... */ });
    it('should show error for short password', () => { /* ... */ });
  });

  describe('Sign In Process', () => {
    it('should sign in successfully with valid credentials', () => { /* ... */ });
    it('should show error for invalid credentials', () => { /* ... */ });
  });
});
```

---

## Troubleshooting

### Issue: Tests Timeout

**Problem:** Test hangs and times out
```
Timeout - Async callback was not invoked within the 5000 ms timeout
```

**Solution:** Wrap async operations in `act()` and use `waitFor()`:
```typescript
await waitFor(() => {
  expect(result.current.loading).toBe(false);
}, { timeout: 3000 });
```

### Issue: "Cannot Read Property of Undefined"

**Problem:** Mock not set up correctly

**Solution:** Ensure mocks return the expected structure:
```typescript
(supabase.auth.signIn as jest.Mock).mockResolvedValue({
  data: { user: { id: '123' }, session: {} },
  error: null
});
```

### Issue: "Act Warning"

**Problem:**
```
Warning: An update to Component inside a test was not wrapped in act(...)
```

**Solution:** Wrap state updates in `act()`:
```typescript
await act(async () => {
  await result.current.fetchData();
});
```

### Issue: Tests Pass Locally but Fail in CI

**Problem:** Environment differences

**Solution:** Use `npm run test:ci` which:
- Runs in CI mode (`--ci` flag)
- Uses deterministic behavior
- Limits workers for stability

### Issue: Import Path Not Found

**Problem:**
```
Cannot find module '@/components/Button'
```

**Solution:** Check `jest.config.js` has the path alias:
```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
}
```

---

## Benefits

### 1. **Catch Bugs Early** 🐛
- Find issues before they reach production
- Catch regressions immediately after code changes
- Verify edge cases are handled

### 2. **Confidence in Refactoring** 🔧
- Refactor code without fear of breaking things
- Tests verify behavior remains correct
- Safe to optimize and improve code

### 3. **Documentation** 📚
- Tests show how code should be used
- Examples of expected behavior
- Living documentation that stays up-to-date

### 4. **Faster Development** ⚡
- Catch issues without manual testing
- No need to click through the app repeatedly
- Test edge cases that are hard to reproduce manually

### 5. **Better Code Design** 🎨
- Testable code is often better designed
- Encourages separation of concerns
- Forces you to think about interfaces

### 6. **CI/CD Integration** 🚀
- Automated testing in pull requests
- Prevents bad code from being merged
- Continuous quality assurance

---

## Future Improvements

### Short Term (Next Sprint)

1. **Complete Mock Refinement**
   - Fix Supabase mocks in AuthContext tests
   - Fix store mocks in useAppStore tests
   - Achieve 80%+ test pass rate

2. **Add Tests for Critical Paths**
   - Prayer creation flow
   - Devotional submission
   - Event RSVP logic
   - Group joining/creation

3. **Increase Coverage Thresholds**
   ```javascript
   coverageThreshold: {
     global: {
       branches: 60,  // Increase from 50%
       functions: 60,
       lines: 60,
       statements: 60
     }
   }
   ```

### Medium Term (This Quarter)

4. **Add Integration Tests**
   - Test multiple components working together
   - Test complete user flows (sign up → onboard → join group)

5. **Add Visual Regression Tests**
   - Use snapshot testing for UI components
   - Catch unintended visual changes

6. **Set Up Pre-Commit Hooks**
   ```bash
   npm install --save-dev husky lint-staged
   ```

   Run tests before committing:
   ```json
   {
     "husky": {
       "hooks": {
         "pre-commit": "lint-staged"
       }
     },
     "lint-staged": {
       "*.{ts,tsx}": [
         "npm test -- --bail --findRelatedTests"
       ]
     }
   }
   ```

7. **Add GitHub Actions CI**
   ```yaml
   # .github/workflows/test.yml
   name: Tests
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - uses: actions/setup-node@v2
         - run: npm ci
         - run: npm run test:ci
   ```

### Long Term (This Year)

8. **Add E2E Tests**
   - Use Detox or Appium
   - Test real device interactions
   - Test on actual iOS/Android builds

9. **Add Performance Tests**
   - Test render performance
   - Memory leak detection
   - Bundle size monitoring

10. **Add Mutation Testing**
    - Use Stryker
    - Verify tests actually catch bugs
    - Improve test quality

---

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing React Native Apps](https://reactnative.dev/docs/testing-overview)

### Learning
- [Testing JavaScript (Kent C. Dodds)](https://testingjavascript.com/)
- [React Testing Examples](https://react-testing-examples.com/)

### Tools
- [Jest VSCode Extension](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest)
- [Wallaby.js](https://wallabyjs.com/) - Real-time test runner

---

## Quick Reference

### Common Jest Matchers
```typescript
expect(value).toBe(expected);              // ===
expect(value).toEqual(expected);           // Deep equality
expect(value).toBeTruthy();                // Truthy value
expect(value).toBeFalsy();                 // Falsy value
expect(value).toBeDefined();               // Not undefined
expect(value).toBeNull();                  // Null
expect(array).toContain(item);             // Array contains
expect(string).toMatch(/regex/);           // String matches
expect(fn).toThrow();                      // Function throws
expect(fn).toHaveBeenCalled();             // Mock was called
expect(fn).toHaveBeenCalledWith(arg);      // Called with args
```

### Common React Testing Library Queries
```typescript
const { getByText } = render(<Component />);

getByText('text');                         // Throws if not found
queryByText('text');                       // Returns null if not found
findByText('text');                        // Async, waits for element

getByTestId('test-id');                    // By data-testid
getByRole('button');                       // By ARIA role
getByPlaceholderText('Enter email');       // By placeholder
```

### Test File Template
```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render correctly', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Expected Text')).toBeTruthy();
  });

  it('should handle user interaction', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(<MyComponent onPress={onPressMock} />);

    fireEvent.press(getByText('Button'));

    expect(onPressMock).toHaveBeenCalledTimes(1);
  });
});
```

---

## Summary

You now have a **complete testing infrastructure** for the Rooted app. The setup includes:

✅ Jest test runner configured for Expo/React Native
✅ React Testing Library for component testing
✅ Comprehensive mocks for all external dependencies
✅ 25 passing tests demonstrating best practices
✅ npm scripts for running tests in different modes
✅ Coverage reporting configured
✅ Example tests for utilities, contexts, and stores

**Next Steps:**
1. Fix remaining mocks in AuthContext and useAppStore tests
2. Add tests for critical user flows (prayers, devotionals, events)
3. Aim for 70%+ code coverage on business logic
4. Set up CI/CD to run tests on every commit
5. Add pre-commit hooks to prevent untested code

Happy testing! 🎉
