# Motion System Documentation

## Overview
This document outlines the unified motion system for IntellectX, ensuring consistent and intentional animations across the premium React + Tailwind application.

---

## Motion Tokens

### Duration Tokens
Motion timing is standardized into three tiers:

| Token | Duration | Use Case |
|-------|----------|----------|
| **fast** | 150ms | Quick micro-interactions: hover effects, focus states, icon rotations |
| **normal** | 200ms | Standard transitions: buttons, cards, tabs, dialogs, page navigation |
| **slow** | 300ms | Deliberate transitions: modals, sheets, navigation dropdowns |

**CSS Variables:**
```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
```

### Easing Tokens
Easing is standardized based on animation direction:

| Token | Value | Use Case |
|-------|-------|----------|
| **ease-out** | `cubic-bezier(0.16, 1, 0.3, 1)` | **Entering elements** - Feels responsive and immediate |
| **ease-in** | `cubic-bezier(0.7, 0, 0.84, 0)` | **Exiting elements** - Feels intentional and composed |
| **ease-smooth** | `cubic-bezier(0.4, 0, 0.2, 1)` | General purpose smooth transitions |
| **ease-linear** | `linear` | Mechanical transitions (width, height, position) |

**CSS Variables:**
```css
--easing-out: cubic-bezier(0.16, 1, 0.3, 1);
--easing-in: cubic-bezier(0.7, 0, 0.84, 0);
--easing-smooth: cubic-bezier(0.4, 0, 0.2, 1);
--easing-linear: linear;
```

---

## Component Motion Standards

### UI Components

#### Buttons
- **Duration:** `duration-200` (normal)
- **Easing:** `ease-out` (entering)
- **Properties:** transform, background-color, color, box-shadow, filter
- **Example:** `transition-[transform,background-color,color,box-shadow,filter] duration-200 ease-out`

#### Cards
- **Duration:** `duration-200` (normal)
- **Easing:** `ease-out` (entering)
- **Properties:** transform (elevation), box-shadow
- **Example:** `transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-[2px]`

#### Tabs
- **List:** `transition-colors duration-200 ease-out`
- **Trigger:** `transition-[color,background-color,box-shadow] duration-200 ease-out`
- **Indicator bar:** `after:transition-transform after:duration-200 after:ease-out`

#### Modals / Dialogs / Alert Dialogs
- **Duration:** `duration-200` (normal) for content
- **Easing:** `ease-out` (entering)
- **With animate-in/out:** `data-[state=open]:animate-in data-[state=closed]:animate-out duration-200 ease-out`

#### Sheets (Slide-out Panels)
- **Duration:** `duration-300` (slow) - both opening and closing
- **Easing:** `ease-in-out` (smooth for both directions)
- **Pattern:** `transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-300`

#### Accordions
- **Chevron icon:** `transition-transform duration-200 ease-out`

#### Navigation Menu
- **Dropdown chevron:** `transition-transform duration-300 ease-out group-data-[state=open]:rotate-180`

#### Sidebar
- **Width animation:** `transition-[width] duration-200 ease-linear`
- **Position animation:** `transition-[left,right,width] duration-200 ease-linear`

---

## Page Transitions

Page navigation uses the motion system for smooth route changes:

- **Duration:** `duration-200` (normal)
- **Easing:** `ease-out` (entering)
- **JavaScript:** `TRANSITION_DURATION_MS = 200`
- **CSS:** `transition-[opacity,transform] duration-200 ease-out`
- **Motion reduced:** `motion-reduce:transition-none`

---

## CSS Variables Reference

### Motion Tokens
All tokens are defined in `src/styles/motion.css`:

```css
/* Individual tokens */
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;

--easing-out: cubic-bezier(0.16, 1, 0.3, 1);
--easing-in: cubic-bezier(0.7, 0, 0.84, 0);
--easing-smooth: cubic-bezier(0.4, 0, 0.2, 1);
--easing-linear: linear;

/* Component-specific shortcuts */
--motion-button: var(--duration-normal) var(--easing-out);
--motion-card: var(--duration-normal) var(--easing-out);
--motion-tabs: var(--duration-normal) var(--easing-out);
--motion-modal-enter: var(--duration-slow) var(--easing-out);
--motion-modal-exit: var(--duration-slow) var(--easing-in);
--motion-sidebar: var(--duration-normal) var(--easing-linear);
--motion-page: var(--duration-normal) var(--easing-out);
--motion-dropdown: var(--duration-fast) var(--easing-out);
--motion-tooltip: var(--duration-fast) var(--easing-out);
```

---

## Accessibility Considerations

### Motion Preferences
All animations respect user motion preferences:

```css
@media (prefers-reduce-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-normal: 0ms;
    --duration-slow: 0ms;
  }
}
```

All animated components include `motion-reduce:transition-none` to properly handle reduced motion settings.

---

## Implementation Guide

### When Adding New Animations

1. **Choose the appropriate duration:**
   - Quick micro-interactions → `duration-200` or `duration-150`
   - Standard UI elements → `duration-200`
   - Modals/overlays → `duration-300`

2. **Choose the appropriate easing:**
   - Entering/appearing elements → `ease-out`
   - Exiting/disappearing elements → `ease-in`
   - Mechanical/layout changes → `ease-linear`

3. **Include motion-reduce support:**
   ```html
   <div class="transition duration-200 ease-out motion-reduce:transition-none">
     {/* content */}
   </div>
   ```

### Tailwind Classes Used

```
/* Durations */
duration-200  /* normal: 200ms */
duration-300  /* slow: 300ms */

/* Easing */
ease-out      /* cubic-bezier(0.16, 1, 0.3, 1) */
ease-in       /* cubic-bezier(0.7, 0, 0.84, 0) */
ease-linear   /* linear */

/* Properties */
transition-all
transition-[property-name]
transition-[prop1,prop2,prop3]
```

---

## Updated Components Summary

| Component | Before | After | Notes |
|-----------|--------|-------|-------|
| Button | `duration-200 ease-out` | ✓ Standardized | Normal entering |
| Card | `duration-200 ease-out` | ✓ Standardized | Normal entering with elevation |
| Tabs (List) | `duration-200` | `duration-200 ease-out` | Added easing for consistency |
| Tabs (Trigger) | `duration-200 ease-out` | ✓ Standardized | Trigger and underline aligned |
| Dialog | `duration-200` | `duration-200 ease-out` | Added easing |
| Alert Dialog | `duration-200` | `duration-200 ease-out` | Added easing |
| Sheet | `duration-300/500` | `duration-300` | Normalized both directions |
| Navigation Menu | `duration-300` | `duration-300 ease-out` | Added easing |
| Accordion | `duration-200` | `duration-200 ease-out` | Added easing |
| Sidebar | `duration-200 ease-linear` | ✓ Standardized | Linear for width changes |
| Page Transition | `duration-[220ms] ease-out` | `duration-200 ease-out` | Aligned with normal duration |

---

## Testing Motion Consistency

### Visual Verification Checklist

- [ ] Buttons respond quickly and feel reactive
- [ ] Cards smoothly elevate on hover
- [ ] Tabs underline transition feels smooth
- [ ] Modals appear and disappear intentionally
- [ ] Sheets slide smoothly in both directions
- [ ] Page transitions feel natural and don't distract
- [ ] All animations respect prefers-reduced-motion
- [ ] No animation lags or stutters at 60fps

### Device Testing

Test on:
- Desktop (high refresh rate)
- Tablet
- Mobile (lower-end devices)
- With throttled CPU/network

---

## Files Modified

- `src/styles/motion.css` - Motion tokens and easing definitions
- `src/styles/index.css` - Imported motion.css
- `src/app/components/ui/button.tsx` - Documented motion token
- `src/app/components/ui/card.tsx` - Documented motion token
- `src/app/components/ui/tabs.tsx` - Standardized easing
- `src/app/components/ui/accordion.tsx` - Added easing
- `src/app/components/ui/navigation-menu.tsx` - Improved easing
- `src/app/components/ui/sheet.tsx` - Normalized durations
- `src/app/components/ui/dialog.tsx` - Added easing
- `src/app/components/ui/alert-dialog.tsx` - Added easing
- `src/app/components/PageTransitionOutlet.tsx` - Aligned duration
