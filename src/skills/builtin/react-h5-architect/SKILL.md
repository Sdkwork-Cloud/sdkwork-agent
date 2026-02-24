---
name: react-h5-architect
description: |
  React mobile web (H5) application architect for architecture design, creation, and refactoring.
  Specializes in mobile-first design, PWA, touch interactions, and responsive layouts.
  
  Capabilities:
  - Architecture Design: Design mobile-first React application architecture
  - Project Creation: Create H5 apps with PWA support
  - Code Refactoring: Refactor for mobile optimization
  - PWA Implementation: Progressive Web App features
  - Touch Interactions: Gesture handling, swipe actions
  - Responsive Design: Multi-device adaptive layouts
  
  Use when:
  - User wants to design mobile web application architecture
  - User needs to create a new H5/PWA project
  - User wants to refactor existing mobile web app
  - User needs to implement PWA (Progressive Web App) features
  - User wants to optimize for mobile performance
  - User needs to implement touch gesture interactions
  - User wants to create responsive mobile layouts
---

# React H5 Architect

Professional React mobile web (H5) application architect for architecture design, creation, and refactoring.

## Language & Framework

- **Language**: TypeScript / JavaScript
- **Framework**: React 18+
- **Mobile UI**: Ant Design Mobile, React Mobile

## Target Applications

- Mobile Web Apps (H5)
- Progressive Web Apps (PWA)
- Hybrid Apps (React in WebView)
- Mobile-First Websites
- WeChat H5 Pages

## Core Capabilities

| Capability | Description |
|------------|-------------|
| **Design** | Mobile architecture, PWA strategy |
| **Create** | H5 scaffolding, PWA setup |
| **Refactor** | Mobile optimization, performance tuning |
| **Enhance** | Touch gestures, offline support |

## Key Features

### 1. PWA Support

```typescript
// Service Worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// Manifest configuration
{
  "name": "My App",
  "short_name": "App",
  "start_url": "/",
  "display": "standalone",
  "icons": [...]
}
```

### 2. Touch Interactions

```typescript
// Gesture hooks
const { onTouchStart, onTouchMove, onTouchEnd } = useGesture({
  onSwipeLeft: () => navigate('/next'),
  onSwipeRight: () => navigate('/prev'),
  onPinch: (scale) => setZoom(scale),
});
```

### 3. Mobile Navigation Patterns

- Bottom Navigation
- Tab Bar
- Drawer Menu
- Stack Navigation
- Modal Sheets

## Quick Start

1. Read `references/input-guidelines.md` to understand user intent
2. Read `references/core-workflow.md` for the complete refactoring process
3. Read `references/pwa-implementation.md` for PWA setup
4. Load specific reference files based on needs (see Progressive Loading)
5. Use templates from `assets/templates/` for code generation

---

## Progressive Loading Strategy

| User Input Contains | Load These Files |
|---------------------|------------------|
| PWA/Offline | `pwa-implementation.md` |
| Touch/Gestures | `touch-interactions.md` |
| Navigation | `mobile-navigation.md` |
| Performance | `mobile-performance.md` |
| Responsive | `responsive-design.md` |
| Mini Program | `mini-program-guide.md` |
| WebView | `webview-integration.md` |

---

## Architecture Patterns

### Mobile-First Structure

```
src/
├── pages/               # Page components
│   ├── home/
│   ├── profile/
│   └── settings/
├── components/          # Mobile components
│   ├── BottomNav/
│   ├── PullToRefresh/
│   ├── InfiniteScroll/
│   └── ModalSheet/
├── hooks/               # Mobile hooks
│   ├── useGesture.ts
│   ├── useViewport.ts
│   └── useNetwork.ts
├── utils/               # Utilities
│   ├── device.ts
│   └── storage.ts
└── styles/              # Mobile styles
    ├── variables.css
    └── reset.css
```

---

## Core Components

### Bottom Navigation

```tsx
<BottomNav items={[
  { icon: 'home', label: 'Home', path: '/' },
  { icon: 'user', label: 'Profile', path: '/profile' },
]} />
```

### Pull to Refresh

```tsx
<PullToRefresh onRefresh={handleRefresh}>
  <Content />
</PullToRefresh>
```

### Infinite Scroll

```tsx
<InfiniteScroll
  onLoadMore={loadMore}
  hasMore={hasMore}
  loader={<Spinner />}
>
  {items.map(item => <Item key={item.id} />)}
</InfiniteScroll>
```

---

## Performance Optimization

### Critical Metrics

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive | < 3.5s |
| Cumulative Layout Shift | < 0.1 |

### Optimization Techniques

1. **Code Splitting**
   ```typescript
   const Home = lazy(() => import('./pages/Home'));
   ```

2. **Image Optimization**
   ```tsx
   <img 
     src={src}
     loading="lazy"
     srcSet={`${src}?w=400 400w, ${src}?w=800 800w`}
   />
   ```

3. **Preloading**
   ```tsx
   <link rel="preload" href="/fonts/main.woff2" as="font" />
   ```

---

## Responsive Breakpoints

```css
:root {
  --breakpoint-xs: 320px;
  --breakpoint-sm: 375px;
  --breakpoint-md: 414px;
  --breakpoint-lg: 768px;
  --breakpoint-xl: 1024px;
}
```

---

## Output Format

```json
{
  "analysis": {
    "currentIssues": ["Not mobile-optimized", "No PWA support"],
    "recommendations": ["Add viewport meta", "Implement service worker"]
  },
  "pwa": {
    "manifest": {...},
    "serviceWorker": "// code"
  },
  "components": {
    "toCreate": ["BottomNav", "PullToRefresh"],
    "toRefactor": ["Header", "List"]
  },
  "performance": {
    "optimizations": ["lazy loading", "code splitting"]
  },
  "codeExamples": {
    "gesture": "// code",
    "navigation": "// code"
  }
}
```

---

## References

- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [Mobile Web Best Practices](https://web.dev/mobile/)
- [Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
