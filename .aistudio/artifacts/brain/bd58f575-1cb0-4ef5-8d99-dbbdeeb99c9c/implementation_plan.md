# Performance Optimization Plan - OverraPrep AI (Low-End & Lagging Device Acceleration)

## User Goal
Ensure that no matter the grade of phone a student is using (low-end, budget, or lagging mobile devices), OverraPrep AI loads instantly, runs smoothly at 60 FPS, and never lags, freezes, or breaks during startup, dashboard navigation, or CBT practice.

## Proposed Technical Changes

### 1. Instant Startup & Bundle Optimization (`vite.config.ts` / `App.tsx`)
- **Code Splitting**: Implement lazy loading (`React.lazy` + `Suspense`) for secondary routes (admin dashboard, leaderboards, community, analytics, settings) to minimize the initial JavaScript payload size.
- **Query Cache Hydration**: Optimize React Query persistence and stale times so returning students see cached dashboard data instantly while background synchronization runs silently.

### 2. Dashboard & UI Acceleration for Low-End Phones (`Dashboard.tsx`, `SplashScreen.tsx`)
- **GPU & Blur Reduction**: Detect low-performance or mobile devices and dynamically disable heavy CSS backdrop filters (`backdrop-blur-3xl`, complex multi-layer glows) that cause GPU stuttering on budget phones.
- **Optimized Skeleton Loaders**: Replace heavy re-renders with lightweight skeleton loaders during data fetch so the UI remains interactive immediately.

### 3. Animation & Layout Thrashing Prevention
- **Framer Motion Optimization**: Simplify or conditionalize heavy spring animations for devices with reduced motion or low hardware concurrency.
- **Debounced / Throttled Handlers**: Ensure scroll and resize event handlers are heavily optimized to prevent main-thread blocking.

### 4. Verification & Testing
- Build and compile check (`compile_applet`).
- Lint check (`lint_applet`).
- Verify smooth transitions on mobile viewports.
