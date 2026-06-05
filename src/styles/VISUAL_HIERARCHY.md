# Visual Hierarchy System
## IntellectX Type Scale & Emphasis Framework

**Goal:** Users instantly know where to look. Key elements (headings, CTAs) stand out clearly. Secondary elements (labels, helpers) recede visually.

---

## 1. Typography Scale

### Defined in `theme.css` with CSS Custom Properties

#### Size Hierarchy
```css
--type-h1: 3rem;           /* 48px - Page titles */
--type-h2: 2rem;           /* 32px - Section headings */
--type-h3: 1.25rem;        /* 20px - Subsection headings */
--type-body: 1rem;         /* 16px - Body text (default) */
--type-small: 0.875rem;    /* 14px - Secondary text */
--type-xs: 0.75rem;        /* 12px - Tertiary text/labels */
```

#### Weight Hierarchy
```css
--type-h1-weight: 700;     /* BOLD - Maximum emphasis */
--type-h2-weight: 600;     /* SEMIBOLD - Strong emphasis */
--type-h3-weight: 600;     /* SEMIBOLD - Section emphasis */
--type-body-weight: 400;   /* NORMAL - Default body */
--type-body-weight-medium: 500;  /* Medium - Slightly elevated */
--type-small-weight: 400;  /* NORMAL - Secondary */
--type-xs-weight: 500;     /* MEDIUM - Small but visible (labels) */
```

#### Line Height Hierarchy
```css
--type-h1-lh: 1.2;  /* Tight - Compact headings */
--type-h2-lh: 1.3;
--type-h3-lh: 1.4;
--type-body-lh: 1.5;  /* Loose - Readable body text */
--type-small-lh: 1.5;
--type-xs-lh: 1.4;
```

---

## 2. Color Hierarchy

### Text Color Scale (Light Mode)
```css
--text-primary: #1a1a1a;      /* Headings - Darkest */
--text-secondary: #404040;    /* Body text - Dark gray */
--text-tertiary: #717171;     /* Secondary text - Medium gray */
--text-quaternary: #a3a3a3;   /* Labels, hints - Light gray */
```

### Text Color Scale (Dark Mode)
```css
--text-primary: #f5f5f5;      /* Headings - Lightest */
--text-secondary: #d1d5db;    /* Body text - Light gray */
--text-tertiary: #9ca3af;     /* Secondary text - Medium gray */
--text-quaternary: #6b7280;   /* Labels, hints - Dark gray */
```

---

## 3. Implementation Across Pages

### Page Title Pattern
**Goal:** Highest visual priority. Users see this first.

```tsx
/* Before (all same weight) */
<h1 className="text-4xl font-semibold mb-2">Welcome back, Sarah!</h1>
<p className="text-lg text-gray-700">Ready to continue?</p>

/* After (clear hierarchy) */
<h1 className="text-5xl font-bold mb-3 text-gray-900">Welcome back, Sarah!</h1>
<p className="text-sm text-gray-500">Ready to continue your learning journey?</p>
```

**Changes:**
- Size: `text-4xl` → `text-5xl` (+25% larger)
- Weight: `font-semibold` → `font-bold` (700 vs 600)
- Color: `text-gray-900` (maintained - primary)
- Spacing: `mb-2` → `mb-3` (better separation)
- Subtitle: `text-lg text-gray-700` → `text-sm text-gray-500` (de-emphasized)

---

### Section Heading Pattern
**Goal:** Guide attention to major content sections.

```tsx
/* Before */
<h2 className="text-2xl font-semibold text-gray-900">Continue Learning</h2>

/* After */
<h2 className="text-3xl font-semibold text-gray-900 mb-8">Continue Learning</h2>
```

**Changes:**
- Size: `text-2xl` → `text-3xl` (+33% larger)
- Spacing: Better visual separation below
- Weight: Maintained semibold (appropriate for secondary headings)

---

### Subsection & Item Label Pattern
**Goal:** Hierarchically subordinate but still scannable.

```tsx
/* Before */
<h3 className="font-semibold text-gray-900 mb-1">{course.title}</h3>
<p className="text-sm text-gray-600">{course.lesson}</p>

/* After */
<h3 className="font-semibold text-base text-gray-900 mb-1">{course.title}</h3>
<p className="text-xs text-gray-500">{course.lesson}</p>
```

**Changes:**
- Title size: Explicit `text-base` for clarity
- Subtitle color: `text-gray-600` → `text-gray-500` (lighter, recedes)
- Subtitle size: `text-sm` → `text-xs` (less emphasis)

---

### Stat Value Pattern
**Goal:** Make key metrics INSTANTLY visible.

```tsx
/* Before */
<p className="text-sm text-gray-600">{stat.label}</p>
<p className="text-3xl font-semibold text-gray-900">{stat.value}</p>

/* After */
<p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
<p className="text-4xl font-bold text-gray-900 mt-1">{stat.value}</p>
```

**Changes:**
- **Label:** Smaller (text-xs), lighter gray (500 vs 600), uppercase, letter-spacing
  - Creates "quiet" label that doesn't compete
- **Value:** Much larger (text-4xl vs text-3xl), bolder (font-bold)
  - Draws immediate attention

---

### Primary CTA Pattern
**Goal:** Users MUST see the action button.

```tsx
/* Before */
<Button className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white">
  Continue
</Button>

/* After */
<Button className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white font-bold">
  Continue
</Button>
```

**Changes:**
- Added `font-bold` for stronger visual weight
- Maintains blue color for brand consistency
- Larger padding & size for touchability

---

### Secondary/Tertiary Text Pattern
**Goal:** Reduce emphasis on supporting information.

```tsx
/* Before */
<span className="text-gray-600 font-medium">{duration}</span>

/* After */
<span className="text-xs text-gray-500 font-normal">{duration}</span>
```

**Changes:**
- Size: `text-sm` → `text-xs` (22% smaller)
- Color: `text-gray-600` → `text-gray-500` (lighter)
- Weight: `font-medium` → `font-normal` (less prominent)

---

## 4. Pages Updated

### StudentDashboard
| Element | Before | After | Impact |
|---------|--------|-------|--------|
| Page title | text-4xl font-semibold | text-5xl font-bold | **+25% size, bolder** |
| Tagline | text-lg text-gray-700 | text-sm text-gray-500 | **De-emphasized** |
| Stat labels | text-sm text-gray-600 | text-xs text-gray-500 uppercase | **Quiet, scannable** |
| Stat values | text-3xl font-semibold | text-4xl font-bold | **+33% size, bolder** |
| Section headings | text-2xl font-semibold | text-3xl font-semibold | **+50% size** |
| Course titles | none specified | text-base font-semibold | **Explicit hierarchy** |
| Course subtitles | text-sm text-gray-600 | text-xs text-gray-500 | **More recessed** |
| Sidebar headings | text-xl font-semibold | text-2xl font-semibold | **+25% size** |

**Result:** Users instantly see page title → stats → sections → items. Clear visual flow.

---

### CoursesPage
| Element | Before | After | Impact |
|---------|--------|-------|--------|
| Page title | text-4xl font-semibold | text-5xl font-bold | **+25% size, bolder** |
| Tagline | text-lg text-gray-700 | text-sm text-gray-500 | **De-emphasized** |
| Category buttons | font-medium | font-semibold (active: with shadow) | **Active state bolder** |
| Spacing | mb-8 | mb-12 | **More breathing room** |

**Result:** Header commands attention. Clear separation between filters and content.

---

### CourseDetailsPage
| Element | Before | After | Impact |
|---------|--------|-------|--------|
| Course title | text-4xl font-semibold | text-5xl font-bold | **+25% size, bolder** |
| Course description | text-lg text-gray-700 | text-base text-gray-600 | **Normalized size, lighter** |
| Instructor name | text-sm font-medium | text-sm font-semibold | **Slightly more emphasis** |
| Instructor role | text-xs text-gray-600 | text-xs text-gray-500 | **More subtle** |
| Rating count | text-sm text-gray-600 | text-xs text-gray-500 | **Smaller, recessed** |
| Module headings | text-xl font-semibold | text-2xl font-semibold | **+25% size** |
| Lesson titles | font-medium | font-semibold | **Slightly more emphasis** |
| Lesson duration | text-sm text-gray-600 | text-xs text-gray-500 | **More subtle** |
| Resource headings | text-xl font-semibold | text-2xl font-semibold | **+25% size** |
| Resource names | font-medium | font-semibold | **More emphasis** |
| Resource sizes | text-sm text-gray-600 | text-xs text-gray-500 | **More subtle** |

**Result:** Title & structure immediately clear. Supporting details don't clutter.

---

### CommunityPage
| Element | Before | After | Impact |
|---------|--------|-------|--------|
| Page title | text-4xl font-semibold | text-5xl font-bold | **+25% size, bolder** |
| Tagline | text-lg text-gray-700 | text-sm text-gray-500 | **De-emphasized** |
| "New Discussion" button | none specified | font-semibold | **More prominent CTA** |
| Section headings | text-xl font-semibold | text-2xl font-semibold | **+25% size** |
| Study group names | font-medium | font-semibold | **More emphasis** |
| Member count | text-xs text-gray-600 | text-xs text-gray-500 | **Lighter color** |
| Topic buttons | text-sm | text-xs font-semibold | **Smaller, tighter** |

**Result:** Navigation clear. Groups and topics are scannable, not overwhelming.

---

### LandingPage
| Element | Before | After | Impact |
|---------|--------|-------|--------|
| Hero title | text-5xl font-semibold | text-5xl font-bold | **Bolder** |
| Hero subtitle | text-xl text-gray-700 | text-base text-gray-600 | **Normalized, lighter** |
| CTA buttons | none specified | font-bold | **Maximum emphasis** |
| Section headings | text-4xl font-semibold | text-4xl font-semibold | **Maintained** |
| Section subtitles | text-lg text-gray-700 | text-base text-gray-500 | **More subtle** |
| Feature titles | text-xl font-semibold | text-lg font-semibold | **-20% size** |
| Feature descriptions | text-gray-700 | text-sm text-gray-600 | **Normalized** |

**Result:** Hero message DOMINATES. Supporting features don't distract.

---

### PricingPage
| Element | Before | After | Impact |
|---------|--------|-------|--------|
| Page title | text-5xl font-semibold | text-5xl font-bold | **Bolder** |
| Tagline | text-xl text-gray-700 | text-base text-gray-600 | **Normalized** |
| "Most Popular" badge | text-sm font-medium | text-xs font-bold uppercase | **More prominent** |
| Plan names | text-2xl font-semibold | text-2xl font-semibold | **Maintained** |
| Plan descriptions | text-gray-600 | text-sm text-gray-600 | **Normalized** |
| Prices | text-5xl font-semibold | text-5xl font-bold | **Bolder** |
| Price periods | text-gray-600 | text-sm text-gray-500 | **Smaller, lighter** |
| Features | text-gray-700 | text-sm text-gray-700 | **Normalized** |
| CTA buttons | none specified | font-semibold | **More prominent** |
| FAQ headings | text-lg font-semibold | text-lg font-semibold | **Maintained** |
| FAQ answers | text-gray-700 | text-sm text-gray-600 | **Smaller, lighter** |

**Result:** Prices POP. Features are readable but don't overshadow plans. FAQ is reference, not focus.

---

### LoginPage & SignUpPage
| Element | Before | After | Impact |
|---------|--------|-------|--------|
| Page title | text-3xl font-semibold | text-4xl font-bold | **+33% size, bolder** |
| Tagline | text-gray-700 | text-sm text-gray-500 | **Smaller, lighter** |
| Form labels | none specified | font-semibold text-gray-900 | **More visible** |
| Link text | text-sm | text-xs font-semibold | **Smaller, bolder** |
| Submit button | none specified | font-semibold | **More prominent** |

**Result:** Focus clearly on the form. No visual competition.

---

## 5. Design Principles Applied

### 1. **Contrast = Hierarchy**
Make primary elements 20-50% larger and 1-2 weights heavier than secondary elements.

### 2. **Color Receding**
Use text-gray-600/700 for primary content, text-gray-500 for secondary, text-gray-400/500 for tertiary.

### 3. **Spacing as Signal**
Increase margins (mb-8 → mb-12) below primary elements to create visual "breathing room."

### 4. **Uppercase + Letter-Spacing**
Use `uppercase tracking-wide` on labels to make them "quiet" (visible but not competing).

### 5. **Weight > Size**
Sometimes heavier weight signals importance more than size. Use `font-bold` sparingly for maximum impact.

### 6. **Consistent Proportions**
- Page titles: 48px (3rem)
- Section headings: 32px (2rem)
- Body: 16px (1rem)
- Ratios: 3:2 between levels

---

## 6. Quick Reference: When to Use Each Level

| Level | Use For | Example |
|-------|---------|---------|
| **H1 (48px, bold)** | Page titles | "Welcome back, Sarah!" |
| **H2 (32px, semibold)** | Major sections | "Continue Learning" |
| **H3 (20px, semibold)** | Items/cards | Individual course titles |
| **Body (16px, normal)** | Reading content | Course descriptions |
| **Small (14px, normal)** | Supporting info | "Lesson: 45 minutes" |
| **XS (12px, medium)** | Labels/metadata | "MATH • DUE TODAY" |

---

## 7. Before/After Examples

### StudentDashboard Stats
**Before:** All elements same visual weight
```
Study Time (gray-600) ← Hard to differentiate
87 hours (gray-900, text-3xl)
```

**After:** Clear master/detail relationship
```
STUDY TIME (gray-500, text-xs, uppercase, tracking) ← Quiet label
87 hours (gray-900, text-4xl, bold) ← Shouts attention
```

---

### Course Card
**Before:** Ambiguous hierarchy
```
Advanced Biology (font-semibold)
Cell membrane structure (text-sm, gray-600)
```

**After:** Scannable, clear structure
```
Advanced Biology (text-base, font-semibold, gray-900)
Cell membrane structure (text-xs, gray-500)
```

---

### CTA Buttons
**Before:** Doesn't stand out enough
```
<Button className="bg-blue-500 text-white">Start Learning</Button>
```

**After:** Commands attention
```
<Button className="bg-blue-500 text-white font-bold px-8">Start Learning</Button>
```

---

## 8. CSS Variables Usage

Instead of hardcoding font sizes and weights, use CSS custom properties:

```tsx
// Future enhancement: Apply vars to styled components
style={{
  fontSize: 'var(--type-h2)',
  fontWeight: 'var(--type-h2-weight)',
  lineHeight: 'var(--type-h2-lh)',
  color: 'var(--text-primary)',
}}
```

This enables:
- Easy global tweaks (one change affects all h2s)
- Dark mode support
- Responsive sizing (adjust vars per breakpoint)

---

## 9. Testing Checklist

- [ ] Can you identify the page title immediately?
- [ ] Are major sections separated visually?
- [ ] Do CTAs (buttons) stand out clearly from content?
- [ ] Are secondary labels less prominent than primary content?
- [ ] Does the eye naturally flow from heading → section → items?
- [ ] Are text sizes readable (not too small)?
- [ ] Works with light AND dark mode?
- [ ] Works at mobile AND desktop?
- [ ] Respects `prefers-reduced-motion` media query?

---

## 10. Maintenance Notes

### When Adding New Content
1. Use existing heading sizes (h1-h3)
2. Don't create new font sizes inline; use theme variables
3. Follow color hierarchy: primary text for emphasis, tertiary for context
4. Space major sections with `mb-12` or `mb-16`

### When Refactoring
1. Check current page patterns
2. Maintain consistency with established hierarchy
3. Test both light and dark modes
4. Verify mobile responsiveness

### Future Enhancements
- [ ] Responsive font sizes (smaller on mobile)
- [ ] Animation for typography transitions
- [ ] CSS custom properties integration with Tailwind
- [ ] A/B test hierarchy adjustments with users

---

## 11. Files Modified

- `src/styles/theme.css` - Added typography token definitions
- `src/app/pages/StudentDashboard.tsx` - Updated all heading sizes & colors
- `src/app/pages/CoursesPage.tsx` - Updated h1, spacing, button emphasis
- `src/app/pages/CourseDetailsPage.tsx` - Updated course title & sections
- `src/app/pages/CommunityPage.tsx` - Updated headings & secondary text
- `src/app/pages/LandingPage.tsx` - Updated hero & section hierarchy
- `src/app/pages/PricingPage.tsx` - Updated plan emphasis & pricing
- `src/app/pages/LoginPage.tsx` - Updated form title
- `src/app/pages/SignUpPage.tsx` - Updated form title

---

## Summary

**Primary Change:** Increased visual hierarchy by:
1. **+25-50% larger** page and section headings
2. **Bolder fonts** (600 → 700 weight) for key elements
3. **Reduced emphasis** on secondary text (smaller size, lighter color)
4. **Better spacing** between hierarchy levels
5. **Consistent sizing** across all pages

**Result:** Users instantly know where to look. CTAs stand out. Content is scannable. Secondary info doesn't clutter.
