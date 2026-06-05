# Interaction Feedback System

## Overview
This document outlines the consistent interaction feedback patterns across IntellectX UI components. Every interactive element responds predictably and intentionally to user actions.

---

## Core Interaction Principles

### Responsive & Intentional
- Every interactive element provides immediate visual feedback
- Feedback is consistent across the entire application
- No interaction feels accidental or without purpose

### Predictable Patterns
- **Hover** - Element becomes more prominent/brighter
- **Press/Active** - Element becomes compressed or more saturated
- **Focus** - Element shows a focus ring for accessibility
- **Disabled** - Element appears faded and unresponsive

### Timing Standards
All interactions use **200ms ease-out** for entering states, matching the motion system tokens.

---

## Interaction Patterns by Component

### Buttons
**Hover State:**
- Brightness increases to 110% (lightens button)
- Scale increases to 102% (subtle grow)
- Duration: 200ms | Easing: ease-out

**Press State:**
- Brightness decreases to 90% (darkens button)
- Scale decreases to 98% (subtle shrink)
- Duration: 200ms | Easing: ease-out

**Disabled State:**
- Opacity set to 50%
- Hover and press states removed
- No scale or brightness changes

**CSS:**
```html
hover:brightness-110       <!-- Brightens on hover -->
active:brightness-90       <!-- Darkens on press -->
hover:scale-[1.02]        <!-- Grows on hover -->
active:scale-[0.98]       <!-- Shrinks on press -->
transition-[transform,background-color,color,box-shadow,filter] 
duration-200 ease-out
```

### Cards
**Hover State:**
- Translates up 2px (subtle lift off page)
- Shadow increases to `shadow-lg` (emphasizes lift)
- Duration: 200ms | Easing: ease-out

**CSS:**
```html
hover:-translate-y-[2px]   <!-- Lifts up -->
hover:shadow-lg            <!-- Shadow expands -->
transition-[transform,box-shadow] duration-200 ease-out
```

### Inputs & Form Fields
**Focus State:**
- Border color changes to ring color
- Ring appears around element (3px width)
- Smooth transition to focused appearance
- Duration: 200ms | Easing: ease-out

**Transitions:**
```html
focus-visible:border-ring  <!-- Focus border color -->
focus-visible:ring-ring/50 <!-- Focus ring color -->
focus-visible:ring-[3px]   <!-- Focus ring size -->
transition-[color,border-color,box-shadow] duration-200 ease-out
```

### Checkboxes & Radio Buttons
**State Change:**
- Color and border smooth transition when checked
- Focus ring appears on keyboard focus
- Duration: 200ms | Easing: ease-out

**CSS:**
```html
data-[state=checked]:bg-primary     <!-- Color when checked -->
data-[state=checked]:border-primary <!-- Border when checked -->
focus-visible:ring-ring/50          <!-- Focus ring -->
transition-[color,border-color,box-shadow] duration-200 ease-out
```

### Switch Toggle
**State Change:**
- Background color transitions smoothly when toggled
- Thumb (circle) slides smoothly to new position
- Both container and thumb use 200ms ease-out

**Thumb Animation:**
```html
data-[state=checked]:translate-x-[calc(100%-2px)]
transition-transform duration-200 ease-out
```

**Container Animation:**
```html
transition-[background-color,border-color,box-shadow] 
duration-200 ease-out
```

### Tabs
**Active State:**
- Background color changes smoothly
- Underline indicator slides and expands smoothly
- Indicator bar: scale-x from 0 to 100%
- Duration: 200ms | Easing: ease-out

**CSS:**
```html
after:transition-transform after:duration-200 after:ease-out
after:scale-x-0                    <!-- Starts collapsed -->
data-[state=active]:after:scale-x-100  <!-- Expands when active -->
```

### Select Dropdowns
**Focus State:**
- Border and ring transition smoothly
- Duration: 200ms | Easing: ease-out

**CSS:**
```html
transition-[color,border-color,box-shadow] duration-200 ease-out
focus-visible:border-ring
focus-visible:ring-ring/50
```

### Slider (Range Input)
**Hover & Focus:**
- Ring appears and scales up on hover/focus
- Smooth transition between states
- Duration: 200ms | Easing: ease-out

**CSS:**
```html
hover:ring-4              <!-- Ring on hover -->
focus-visible:ring-4      <!-- Ring on focus -->
transition-[color,box-shadow] duration-200 ease-out
```

### Breadcrumb Links
**Hover State:**
- Text color transitions to foreground
- Duration: 200ms | Easing: ease-out

**CSS:**
```html
hover:text-foreground
transition-colors duration-200 ease-out
```

### Progress Bar
**Fill Animation:**
- Width/fill animates smoothly as progress changes
- Slightly slower (300ms) than other interactions for emphasis
- Duration: 300ms | Easing: ease-out

**CSS:**
```html
transition-all duration-300 ease-out
```

### Toggles (Toggle Buttons)
**State Change:**
- Background and text color transition smoothly
- Focus ring appears on keyboard focus
- Duration: 200ms | Easing: ease-out

**CSS:**
```html
data-[state=on]:bg-accent
data-[state=on]:text-accent-foreground
transition-[color,background-color,box-shadow] duration-200 ease-out
```

---

## Accessibility Considerations

### Focus Indicators
All interactive elements have visible focus indicators for keyboard navigation:
```html
focus-visible:border-ring
focus-visible:ring-ring/50
focus-visible:ring-[3px]
```

### Reduced Motion Support
All transitions respect user motion preferences:
```html
motion-reduce:transition-none
motion-reduce:hover:scale-100
motion-reduce:active:scale-100
```

Example in button:
```html
motion-reduce:transition-none 
motion-reduce:hover:scale-100 
motion-reduce:active:scale-100
```

---

## Timing Hierarchy

| Component | Duration | Use Case |
|-----------|----------|----------|
| Buttons, Cards, Tabs, Inputs | **200ms** | Standard interactive elements |
| Switches, Checkboxes, Radio | **200ms** | Form state changes |
| Progress Bar | **300ms** | Slower for visual emphasis |

All use **ease-out** for entering/forward states to feel responsive and immediate.

---

## Updated Components Summary

| Component | Type | Feedback | Timing |
|-----------|------|----------|--------|
| **Button** | Click | Scale + Brightness | 200ms ease-out |
| **Card** | Hover | Lift + Shadow | 200ms ease-out |
| **Input** | Focus | Ring + Border | 200ms ease-out |
| **Checkbox** | State | Color + Border | 200ms ease-out |
| **Radio** | State | Color + Border | 200ms ease-out |
| **Switch** | State | Background + Thumb | 200ms ease-out |
| **Tabs** | State | Color + Underline | 200ms ease-out |
| **Select** | Focus | Border + Ring | 200ms ease-out |
| **Slider** | Focus | Ring Scale | 200ms ease-out |
| **Breadcrumb** | Hover | Text Color | 200ms ease-out |
| **Progress** | Change | Width/Fill | 300ms ease-out |
| **Toggle** | State | Background + Color | 200ms ease-out |

---

## Code Pattern Examples

### Adding Interaction Feedback to New Components

**Standard Hover/Active Pattern:**
```html
<button class="
  transition-[transform,background-color] 
  duration-200 
  ease-out
  hover:scale-[1.02]
  active:scale-[0.98]
">
  Interactive Button
</button>
```

**Focus Ring Pattern:**
```html
<input class="
  transition-[border-color,box-shadow]
  duration-200
  ease-out
  focus-visible:border-ring
  focus-visible:ring-ring/50
  focus-visible:ring-[3px]
" />
```

**State Change Pattern:**
```html
<div class="
  transition-[background-color,color]
  duration-200
  ease-out
  data-[active=true]:bg-primary
  data-[active=true]:text-white
">
  State Container
</div>
```

---

## Best Practices

1. **Consistency** - Use 200ms ease-out for all interactive elements (except progress bars)
2. **Feedback** - Every interaction should have visible feedback
3. **Accessibility** - Always include focus indicators and respect motion preferences
4. **Performance** - Use `will-change` when animating frequently (e.g., sliders)
5. **Intent** - Match animation timing to interaction importance
   - Micro-interactions: faster (~150ms)
   - Standard interactions: default (200ms)
   - Emphasis animations: slower (300ms)

---

## Testing Interaction Feedback

### Manual Testing Checklist

- [ ] Hover over buttons - see brightness increase + scale
- [ ] Click/press buttons - see brightness decrease + scale down
- [ ] Hover over cards - see lift and shadow change
- [ ] Focus on inputs - see ring and border transition smoothly
- [ ] Toggle checkboxes - see smooth state transition
- [ ] Toggle switches - see thumb slide smoothly
- [ ] Click tabs - see color and underline transition
- [ ] All transitions use 200ms timing
- [ ] All animations respect prefers-reduced-motion

### Device Testing

- [ ] Desktop with fast CPU
- [ ] Laptop with moderate CPU
- [ ] Mobile device with slower CPU
- [ ] At 60fps consistently across devices

---

## Files Modified

- `src/app/components/ui/button.tsx` - Brightness and scale feedback
- `src/app/components/ui/card.tsx` - Lift and shadow feedback
- `src/app/components/ui/input.tsx` - Smooth focus transitions
- `src/app/components/ui/checkbox.tsx` - Smooth state transitions
- `src/app/components/ui/switch.tsx` - Smooth state/thumb transitions
- `src/app/components/ui/radio-group.tsx` - Smooth state transitions
- `src/app/components/ui/tabs.tsx` - Smooth active state transitions
- `src/app/components/ui/select.tsx` - Smooth focus transitions
- `src/app/components/ui/slider.tsx` - Smooth focus/hover transitions
- `src/app/components/ui/breadcrumb.tsx` - Smooth hover transitions
- `src/app/components/ui/progress.tsx` - Smooth fill transitions
- `src/app/components/ui/toggle.tsx` - Smooth state transitions

---

## Related Documentation

- Motion System: [src/styles/MOTION_SYSTEM.md](../styles/MOTION_SYSTEM.md)
- Color System: Check theme.css for color tokens
