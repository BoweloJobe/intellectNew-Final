# Page Transition System
## Premium Seamless Transitions Without Background Flash

**Problem Fixed:** During route changes, widgets disappeared briefly before the background (DNA element) became visible — breaking the premium feel.

**Solution:** Dual-layer simultaneous crossfade ensures content ALWAYS covers the background.

---

## How It Works

### The Issue (Before)
```
Timeline:
T=0ms:     Old content visible (opacity-1)
           ↓
T=0-200ms: Old content fades out (opacity-1 → 0)
           ¡ GAP: No content visible, background shows! ✗
           ↓
T=200ms:   New content fades in (opacity-0 → 1)
           ↓
T=400ms:   New content fully visible (opacity-1)
```

### The Solution (After)
```
Timeline:
T=0ms:     Old page visible (opacity-1)
           New page rendered but invisible (opacity-0, translateY-20px)
           ↓
T=0-200ms: Old fades out (1 → 0)  AND  New fades in (0 → 1) SIMULTANEOUSLY
           ✓ ALWAYS content visible, background NEVER shows!
           ↓
T=200ms:   Old content removed from DOM
           New page fully visible (opacity-1, translateY-0)
```

---

## Implementation Details

### Updated Component: `PageTransitionOutlet.tsx`

**Key Pattern: Dual-Layer Rendering**

```tsx
{/* OLD PAGE (exiting) - Only rendered during transition */}
{previousOutlet && state === "transitioning" && (
  <div className="opacity-0"> {/* Fade out */}
    {previousOutlet}
  </div>
)}

{/* NEW PAGE (entering) */}
<div className={
  state === "idle"
    ? "opacity-100 translate-y-0"        {/* Final: visible, in place */}
    : "opacity-0 translate-y-[20px]"     {/* Starting: invisible, below */}
}>
  {currentOutlet}
</div>
```

**State Machine:**

```
ON ROUTE CHANGE:
1. Store old outlet in previousOutlet state
2. Update currentOutlet to new outlet
3. Set state to "transitioning"
   ↓
4. IMMEDIATELY both render (DOM ready instantly)
   - Old: opacity-0 (via transition, fades out over 200ms)
   - New: opacity-0 → opacity-100 (via transition, fades in over 200ms)
   ↓
5. After 200ms: Clear previousOutlet, set state to "idle"
   ↓
BACK TO NORMAL:
- New page is fully visible at opacity-100, translateY-0
- Old page removed from DOM
```

**Why This Works:**
- Old outlet doesn't get removed immediately
- New outlet renders right when it's available (from useOutlet hook)
- CSS transitions handle the animation (no JavaScript delays)
- Both layers present during 200ms → no gap, background never shows

---

## Animation Specifications

### Duration
- **200ms** (motion token: `--duration-normal`)
- Fast enough to feel premium and responsive
- Slow enough to see the transition clearly

### Easing

**Old page (exit):**
```css
ease-in: cubic-bezier(0.7, 0, 0.84, 0)
/* Starts quick, slows down at the end - feels intentional */
```

**New page (enter):**
```css
ease-out: cubic-bezier(0.16, 1, 0.3, 1)
/* Starts fast, slows at the end - feels responsive */
```

### Movement

**Old Content:**
- No transform applied
- Only opacity changes (opacity-100 → opacity-0)

**New Content:**
- Starts offset: `translateY(20px)` — slightly below normal position
- Starts invisible: `opacity-0`
- Animates to: `translateY(0), opacity-1`
- Effect: Slides up gently while fading in

---

## Layout Architecture

### File: `src/app/layout/Layout.tsx`

```tsx
<div className="relative isolate min-h-screen">
  {/* Fixed background (z-0) - stays in place, never unmounts */}
  <div className="fixed inset-0 z-0 pointer-events-none">
    {/* DNA background image */}
  </div>

  {/* Main content wrapper (z-10) - always above background */}
  <div className="relative z-10">
    <Navbar />
    <main>
      <PageTransitionOutlet /> {/* Ensures no gap below */}
    </main>
  </div>
</div>
```

**Key Points:**
- Background is `fixed` with `z-0` (stays visible but always behind)
- Content wrapper is `relative z-10` (always above)
- Layout never unmounts (content swaps inside it)
- Main element ensures proper semantic structure

---

## Preventing the Background Flash

### Safeguards in Place

**1. Dual-layer rendering**
- Both old and new content exist during transition
- Guarantees something is always over the background

**2. Immediate DOM rendering**
- New content renders to DOM as soon as route changes
- No delay waiting for transition to complete
- CSS transitions (200ms) handle animation

**3. Overlay strategy**
- Old/new layers span full viewport
- No gaps at edges or between layers
- Background fixed position can't "peek through"

**4. Min-height guarantee**
- Layout has `min-h-screen` (100vh minimum)
- Content wrappers fill available space
- No room for background to show below content

---

## File Structure

```
src/
├── app/
│   ├── layout/
│   │   └── Layout.tsx          {/* Fixed background + z-10 content */}
│   └── components/
│       └── PageTransitionOutlet.tsx {/* NEW: Dual-layer transitions */}
├── styles/
│   └── motion.css              {/* Provides duration/easing tokens */}
```

---

## Technical Stack

**Transition Method:** CSS Transitions (not Framer Motion)
- Simpler, no dependencies
- Better performance for page-level transitions
- Uses existing motion.css tokens

**Animation Timing:**
- Duration: `--duration-normal` (200ms)
- Easing (enter): `--easing-out` (responsive)
- Easing (exit): `--easing-in` (intentional)

**React Integration:**
- `useLocation()` — detects route changes
- `useOutlet()` — gets current page component
- State management — tracks transition phases
- Cleanup timers — prevents memory leaks

---

## How to Test

### Visual Test
1. Navigate between routes (click menu items)
2. Watch for smooth transitions
3. **Confirm:** No moment where only the background (DNA element) is visible
4. **Confirm:** Content always covers the background

### Inspect Test
Open DevTools → Elements panel:
1. Navigate between pages
2. Watch the DOM:
   - Should see both old and new page `<div>` rendered briefly
   - After 200ms, old one is removed
   - New one remains

### Performance Test
1. DevTools → Performance tab
2. Record navigation event
3. Check FPS (should stay at 60fps for smooth 200ms)
4. No layout thrashing or janky transitions

---

## Edge Cases Handled

### Back/Forward Navigation
- Location key changes trigger transition
- Works exactly the same as forward navigation
- No special handling needed

### Rapid Navigation
- If user navigates again before first transition completes
- Timer is cleared and reset
- New transition takes over cleanly

### Accessibility (prefers-reduced-motion)
- CSS `motion-reduce:` utilities applied
- Users with motion sensitivity see instant page changes
- No animation, no opacity/transform changes

### Component Unmounting
- Old page remains mounted during transition
- Prevents component state loss
- Removed from DOM after animation

---

## Motion System Integration

This component uses the centralized motion token system:

```css
/* From motion.css */
--duration-normal: 200ms;
--easing-out: cubic-bezier(0.16, 1, 0.3, 1);
--easing-in: cubic-bezier(0.7, 0, 0.84, 0);
```

**Why centralized tokens?**
- Consistency across all animations
- Easy to adjust site-wide timing
- One place to maintain easing curves
- Supports dark/light mode if needed

---

## Comparison: Old vs New

| Aspect | Old | New |
|--------|-----|-----|
| **Transition Strategy** | Single-layer sequential | Dual-layer simultaneous |
| **Old content removal** | After 200ms (sequential) | After 200ms (simultaneous) |
| **New content render** | Waits for old to exit | Renders immediately |
| **Background visibility** | Gap between old and new ✗ | Always covered ✓ |
| **DOM during transition** | Only old OR new visible | Both visible 0-200ms |
| **Premium feel** | Broken by flash | Seamless, polished |

---

## Best Practices

### For Page Components
- No special handling needed
- Just use normal React components
- PageTransitionOutlet handles animation

### For Heavy Content
- Component still renders during transition
- If very heavy, it may cause frame drops
- Use `React.lazy()` and `Suspense` if needed
- Profile with DevTools Performance tab

### For Custom Transitions
- Override className in PageTransitionOutlet
- Adjust translateY distance to taste
- Keep duration between 150-300ms for best feel
- Consider form inputs (don't submit during transition)

---

## Summary

**Problem:** Background flash during page transitions broke premium feel.

**Root Cause:** Gap between old content fading out and new content fading in.

**Solution:** Render both old and new simultaneously, fade out old while fading in new.

**Result:** Content ALWAYS covers background, seamless premium transitions.

**Duration:** 200ms (fast, responsive)

**Coverage:** 100% — no gap where background can show through.
