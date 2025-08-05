# Frontend Bundle Optimization Guide

This document outlines the bundle optimization strategies implemented for the SoundTrace frontend.

## Bundle Size Improvements

### Before Optimization:
- **Three.js libraries**: ~500KB+ loaded eagerly
- **Server-side dependencies**: jsonwebtoken, node-fetch, validator included in frontend bundle
- **No code splitting**: All JavaScript loaded upfront

### After Optimization:
- **Lazy-loaded Three.js**: Only loads when 3D charts are actually used
- **Removed server-side deps**: Reduced bundle by ~50KB
- **Optimized chunk splitting**: Better caching and loading performance

## Implemented Optimizations

### 1. Lazy Loading Three.js Components

**File**: `LazyRetro3DBarChart.tsx`
- Three.js libraries are only loaded when 3D charts are rendered
- Provides loading fallback UI
- Reduces initial bundle size by ~500KB

**Usage:**
```typescript
import LazyRetro3DBarChart from './LazyRetro3DBarChart';

// Component only loads Three.js when actually used
<LazyRetro3DBarChart data={chartData} height={400} />
```

### 2. Removed Unused Server-Side Dependencies

**Removed from frontend:**
- `jsonwebtoken` - JWT handling should be server-side only
- `node-fetch` - Use browser's native fetch or axios
- `validator` - Server-side validation only

**Impact**: ~50KB bundle size reduction

### 3. Optimized Three.js Imports

**Before:**
```typescript
import * as THREE from 'three'; // Imports entire library
```

**After:**
```typescript
import { Mesh } from 'three'; // Only imports what's needed
```

### 4. Vite Bundle Optimization Configuration

**File**: `vite.config.bundle-optimized.ts`

**Features:**
- **Manual chunk splitting**: Separates vendor libraries for better caching
- **Three.js exclusion**: Prevents pre-bundling to enable lazy loading
- **Bundle analysis**: Run `npm run build:analyze` to see chunk sizes
- **ES2020 target**: Modern JavaScript for smaller bundles

**Chunk Strategy:**
```typescript
manualChunks: {
  'three-js': ['three', '@react-three/fiber', '@react-three/drei'],
  'react-vendor': ['react', 'react-dom'],
  'charts': ['recharts'],
  'utils': ['axios']
}
```

## Build Commands

### Standard Build
```bash
npm run build
```

### Optimized Build
```bash
npm run build:optimized
```

### Bundle Analysis
```bash
npm run build:analyze
```

## Performance Impact

### Bundle Size Reduction:
- **Initial bundle**: ~50KB smaller (removed server deps)
- **Three.js lazy loading**: ~500KB saved from initial load
- **Better caching**: Vendor chunks cached separately

### Loading Performance:
- **Faster initial page load**: Less JavaScript to parse upfront
- **On-demand loading**: 3D features load only when needed
- **Better caching**: Vendor libraries cached separately from app code

## Future Optimizations

### 1. Route-Based Code Splitting
Split components by route for even better loading performance:
```typescript
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ScanPage = lazy(() => import('./pages/ScanPage'));
```

### 2. Preload Critical Routes
Preload likely-to-be-visited routes on user interaction:
```typescript
const preloadRoute = () => import('./pages/NextPage');
<Link onMouseEnter={preloadRoute}>Navigate</Link>
```

### 3. Service Worker Caching
Implement service worker for aggressive caching of chunks:
- Cache vendor chunks long-term
- Cache app chunks with versioning
- Prefetch likely routes

### 4. Tree Shaking Optimization
Further optimize by checking for unused exports:
```bash
npm run build:analyze
# Review unused exports and remove them
```

## Monitoring Bundle Size

### Development
Use `npm run build:analyze` regularly to monitor bundle growth.

### Production
Monitor Core Web Vitals:
- **LCP (Largest Contentful Paint)**: Should improve with smaller bundles
- **FCP (First Contentful Paint)**: Better with lazy loading
- **TTI (Time to Interactive)**: Less JavaScript to parse

## Maintenance

### Regular Audits
1. **Monthly**: Run bundle analysis to check for size increases
2. **Before releases**: Verify no unnecessary dependencies added
3. **After updates**: Check if new dependencies can be optimized

### Dependency Guidelines
- ✅ Keep server-side libraries in backend only
- ✅ Use lazy loading for heavy visual components
- ✅ Prefer native browser APIs over polyfills when possible
- ✅ Use tree-shakable imports from large libraries

### Bundle Size Targets
- **Initial bundle**: < 200KB gzipped
- **Three.js chunk**: Load only when needed
- **Vendor chunks**: Cache for 1 year
- **App chunks**: Version with content hash
