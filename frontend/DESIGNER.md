# EcoTribe Design System v2.0

## Brand Philosophy

**Vision:** Premium B2B SaaS platform for enterprise IT asset lifecycle management. The design should convey trust, efficiency, and environmental responsibility while maintaining a sophisticated, corporate aesthetic.

**Design Principles:**
1. **Clean & Minimal** - Remove visual clutter, focus on content
2. **High Contrast** - Crystal clear readability in all lighting conditions
3. **Refined Accents** - Sophisticated use of color, not childish blocks
4. **Premium Glassmorphism** - Elegant blur effects with proper opacity
5. **Brand Cohesion** - Green accent threading through the experience
6. **Subtle Motion** - Purposeful animations, never distracting

---

## Color System

### Primary Brand Palette

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `brand` | `#65A30D` (lime-600) | `#84CC16` (lime-500) | Primary actions, accent borders |
| `brand-soft` | `#84CC16/15` | `#84CC16/10` | Subtle brand tints |
| `brand-hover` | `#4D7C0F` (lime-700) | `#A3E635` (lime-400) | Hover states |
| `brand-glow` | `0 0 20px #84CC16/30` | `0 0 30px #84CC16/20` | Focus/active glow |

### Surface Palette

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `surface-base` | `#F8FAFC` (slate-50) | `#09090B` (zinc-950) | Page backgrounds |
| `surface-card` | `#FFFFFF` | `#18181B` (zinc-900) | Card backgrounds |
| `surface-elevated` | `#FFFFFF` | `#27272A` (zinc-800) | Modals, dropdowns |
| `surface-glass` | `rgba(255,255,255,0.7)` | `rgba(24,24,27,0.8)` | Glassmorphism |

### Text Colors (HIGH CONTRAST)

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `text-primary` | `#0F172A` (slate-900) | `#FAFAFA` (zinc-50) | Headlines, primary |
| `text-secondary` | `#475569` (slate-600) | `#A1A1AA` (zinc-400) | Body, descriptions |
| `text-muted` | `#64748B` (slate-500) | `#71717A` (zinc-500) | Captions, meta |
| `text-on-brand` | `#FFFFFF` | `#000000` | Text on brand bg |

### Border System

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `border-default` | `#E2E8F0` (slate-200) | `#27272A` (zinc-800) | Standard borders |
| `border-brand` | `#84CC16/40` | `#84CC16/30` | Brand accent borders |
| `border-brand-strong` | `#65A30D` | `#84CC16` | Active/selected |
| `border-glass` | `rgba(132,204,22,0.2)` | `rgba(132,204,22,0.15)` | Glass borders |

### Semantic Accent Colors (Refined)

These are for stat boxes, status indicators, and success metrics:

| Status | Light BG | Light Border | Light Text | Dark BG | Dark Border | Dark Text |
|--------|----------|--------------|------------|---------|-------------|-----------|
| Success | `#ECFDF5` | `#10B981/30` | `#047857` | `#10B981/8` | `#10B981/25` | `#34D399` |
| Warning | `#FFFBEB` | `#F59E0B/30` | `#B45309` | `#F59E0B/8` | `#F59E0B/25` | `#FBBF24` |
| Danger | `#FEF2F2` | `#EF4444/30` | `#B91C1C` | `#EF4444/8` | `#EF4444/25` | `#F87171` |
| Info | `#EFF6FF` | `#3B82F6/30` | `#1D4ED8` | `#3B82F6/8` | `#3B82F6/25` | `#60A5FA` |
| Neutral | `#F8FAFC` | `#64748B/20` | `#334155` | `#27272A/50` | `#52525B/30` | `#A1A1AA` |
| Brand | `#F7FEE7` | `#84CC16/30` | `#4D7C0F` | `#84CC16/8` | `#84CC16/25` | `#A3E635` |

**Key:** Backgrounds are very subtle (8-15% opacity), borders provide the accent color, text is high contrast.

---

## Glassmorphism System

### Opacity Guidelines (REFINED FOR VISIBILITY)

```css
/* Light Mode Glass */
.glass-light {
  background: rgba(255, 255, 255, 0.75);      /* Increased from 0.6 */
  backdrop-filter: blur(16px);
  border: 1px solid rgba(132, 204, 22, 0.15); /* Brand-tinted border */
}

/* Dark Mode Glass */
.glass-dark {
  background: rgba(24, 24, 27, 0.85);         /* Higher opacity for readability */
  backdrop-filter: blur(20px);
  border: 1px solid rgba(132, 204, 22, 0.12); /* Subtle brand border */
}
```

### Glass Variants

| Variant | Light BG Opacity | Dark BG Opacity | Blur | Use Case |
|---------|------------------|-----------------|------|----------|
| `glass-subtle` | 0.6 | 0.7 | 12px | Secondary surfaces |
| `glass-default` | 0.75 | 0.85 | 16px | Cards, panels |
| `glass-elevated` | 0.85 | 0.9 | 20px | Modals, dropdowns |
| `glass-solid` | 0.95 | 0.95 | 24px | Overlays, tooltips |

### Glass Border Options

```css
/* Option 1: Brand Green Border (Recommended) */
border: 1px solid rgba(132, 204, 22, 0.2);

/* Option 2: Neutral with Brand Inner Glow */
border: 1px solid rgba(226, 232, 240, 0.8);
box-shadow: inset 0 0 0 1px rgba(132, 204, 22, 0.1);

/* Option 3: Gradient Border Effect */
border: 1px solid transparent;
background: linear-gradient(glass-bg, glass-bg) padding-box,
            linear-gradient(135deg, rgba(132,204,22,0.3), rgba(132,204,22,0.1)) border-box;
```

---

## Typography

### Font Stack
```css
--font-brand: 'Chakra Petch', sans-serif;  /* Headlines, numbers, stats */
--font-display: 'Rajdhani', sans-serif;     /* Subheadings */
--font-body: 'Inter', sans-serif;           /* Body text */
--font-mono: 'JetBrains Mono', monospace;   /* Code, IDs, labels */
```

### Type Scale

| Level | Size | Weight | Font | Usage |
|-------|------|--------|------|-------|
| `display-lg` | 48px | 700 | brand | Hero headlines |
| `display` | 36px | 700 | brand | Page titles |
| `heading-1` | 28px | 700 | brand | Section headers |
| `heading-2` | 22px | 600 | display | Card titles |
| `heading-3` | 18px | 600 | display | Subsection headers |
| `body-lg` | 16px | 400 | body | Primary content |
| `body` | 14px | 400 | body | Standard text |
| `body-sm` | 13px | 400 | body | Secondary content |
| `caption` | 12px | 500 | mono | Labels, metadata |
| `overline` | 11px | 600 | mono | Category labels |

---

## Component Specifications

### Stat Boxes (Success Metrics)

**Design Philosophy:** Stat boxes should have visual distinction using sophisticated accent colors - but through LEFT BORDER ACCENTS and SUBTLE TINTS, not garish colored blocks.

**Premium Pattern:**
```html
<!-- Success Stat (e.g., Completed, Approved) -->
<div class="
  bg-white/75 dark:bg-zinc-900/85
  backdrop-blur-md
  border border-emerald-500/20 dark:border-emerald-400/15
  border-l-4 border-l-emerald-500
  p-6
">
  <p class="text-slate-500 dark:text-zinc-400 text-xs font-mono uppercase tracking-wider mb-2">
    Completed
  </p>
  <p class="text-slate-900 dark:text-zinc-50 text-4xl font-brand font-bold">
    24
  </p>
  <p class="text-emerald-600 dark:text-emerald-400 text-xs font-medium mt-1">
    +12% this week
  </p>
</div>

<!-- Warning Stat (e.g., Pending, In Progress) -->
<div class="
  bg-white/75 dark:bg-zinc-900/85
  backdrop-blur-md
  border border-amber-500/20 dark:border-amber-400/15
  border-l-4 border-l-amber-500
  p-6
">
  <p class="text-slate-500 dark:text-zinc-400 text-xs font-mono uppercase tracking-wider mb-2">
    Pending Review
  </p>
  <p class="text-slate-900 dark:text-zinc-50 text-4xl font-brand font-bold">
    8
  </p>
</div>

<!-- Brand Stat (Primary metric) -->
<div class="
  bg-lime-50/80 dark:bg-lime-500/8
  backdrop-blur-md
  border border-lime-500/25 dark:border-lime-400/20
  border-l-4 border-l-lime-500
  p-6
">
  <p class="text-lime-700 dark:text-lime-300 text-xs font-mono uppercase tracking-wider mb-2">
    Total Assets
  </p>
  <p class="text-slate-900 dark:text-zinc-50 text-4xl font-brand font-bold">
    156
  </p>
</div>
```

**Stat Box Variations:**

| Type | Left Border | Background | Use Case |
|------|-------------|------------|----------|
| Brand/Primary | lime-500 | lime-50/80 or glass | Main KPIs |
| Success | emerald-500 | emerald-50/50 or glass | Completed, approved |
| Warning | amber-500 | amber-50/50 or glass | Pending, in progress |
| Danger | red-500 | red-50/50 or glass | Rejected, overdue |
| Info | blue-500 | blue-50/50 or glass | Informational |
| Neutral | slate-300 | glass | Secondary stats |

### Cards

**Default Card (with brand-tinted glass)**
```css
/* Light */
background: rgba(255, 255, 255, 0.75);
backdrop-filter: blur(16px);
border: 1px solid rgba(132, 204, 22, 0.12);
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

/* Dark */
background: rgba(24, 24, 27, 0.85);
backdrop-filter: blur(16px);
border: 1px solid rgba(132, 204, 22, 0.1);
```

**Card Variants:**
- `card-glass` - Primary glassmorphism card
- `card-elevated` - Higher blur, stronger opacity for modals
- `card-interactive` - Hover: brand border glow
- `card-selected` - Full brand border

**Card Hover State:**
```css
/* Subtle brand glow on hover */
transition: all 0.2s ease;
&:hover {
  border-color: rgba(132, 204, 22, 0.3);
  box-shadow: 0 0 0 1px rgba(132, 204, 22, 0.1);
}
```

### Buttons

**Primary Button**
```css
/* Both modes */
background: #84CC16;
color: #000000;
font-weight: 600;
border: none;

&:hover {
  background: #A3E635;
  box-shadow: 0 0 20px rgba(132, 204, 22, 0.3);
}

&:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(132, 204, 22, 0.4);
}
```

**Secondary Button (Glass)**
```css
/* Light */
background: rgba(255, 255, 255, 0.7);
backdrop-filter: blur(8px);
border: 1px solid rgba(132, 204, 22, 0.2);
color: #0F172A;

/* Dark */
background: rgba(39, 39, 42, 0.7);
backdrop-filter: blur(8px);
border: 1px solid rgba(132, 204, 22, 0.15);
color: #FAFAFA;

&:hover {
  border-color: rgba(132, 204, 22, 0.4);
  background: rgba(132, 204, 22, 0.1);
}
```

**Ghost Button**
```css
background: transparent;
border: 1px solid transparent;
color: #475569 (light) / #A1A1AA (dark);

&:hover {
  background: rgba(132, 204, 22, 0.08);
  color: #65A30D (light) / #84CC16 (dark);
}
```

### Status Badges

**Premium Left-Border Pattern:**
```html
<div class="flex items-center gap-2 pl-3 py-1.5 border-l-2 border-emerald-500 bg-emerald-500/5">
  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
  <span class="text-emerald-700 dark:text-emerald-300 text-sm font-medium">Active</span>
</div>
```

**Pill Badge:**
```html
<span class="
  px-3 py-1
  bg-white/60 dark:bg-zinc-800/60
  backdrop-blur-sm
  border border-slate-200/50 dark:border-zinc-700/50
  text-slate-700 dark:text-zinc-300
  text-xs font-medium rounded-full
">
  Processing
</span>
```

### Tables

**Light Mode:**
- Header: `bg-slate-50/80 backdrop-blur-sm` with `text-slate-600`
- Rows: `bg-white/60 backdrop-blur-sm` with `hover:bg-lime-50/30`
- Borders: `border-slate-200/60`
- Selected row: `bg-lime-50/50 border-l-2 border-l-lime-500`

**Dark Mode:**
- Header: `bg-zinc-900/80 backdrop-blur-sm` with `text-zinc-400`
- Rows: `bg-zinc-900/60` with `hover:bg-lime-500/5`
- Borders: `border-zinc-800/60`
- Selected row: `bg-lime-500/10 border-l-2 border-l-lime-400`

### Form Inputs

```css
/* Light */
background: rgba(255, 255, 255, 0.8);
backdrop-filter: blur(8px);
border: 1px solid #E2E8F0;
color: #0F172A;

/* Dark */
background: rgba(39, 39, 42, 0.8);
backdrop-filter: blur(8px);
border: 1px solid #3F3F46;
color: #FAFAFA;

/* Focus (Both) */
border-color: #84CC16;
box-shadow: 0 0 0 3px rgba(132, 204, 22, 0.15);
```

---

## My Creative Suggestions

### 1. Brand Threading
Run a subtle lime-500 accent through the entire UI:
- Left borders on active nav items
- Focus rings on all interactive elements
- Subtle border tint on all glass surfaces
- Loading states use brand color

### 2. Depth Hierarchy with Glass
```
Level 0: Page background (solid)
Level 1: Cards (glass-default)
Level 2: Nested elements (glass-subtle)
Level 3: Modals/Dropdowns (glass-elevated)
Level 4: Tooltips (glass-solid)
```

### 3. Micro-Interactions
- Stat boxes: Subtle scale(1.01) on hover
- Buttons: Soft glow appears on hover
- Cards: Border brightens to brand color
- Navigation: Sliding underline indicator

### 4. Status Color Logic
Instead of random colors, use consistent semantic meaning:
- **Lime/Green** - Success, approved, completed
- **Amber/Yellow** - Pending, warning, needs attention
- **Red** - Error, rejected, overdue
- **Blue** - Information, in progress, neutral action
- **Purple** - Special states (e.g., premium features)

### 5. Progressive Disclosure
- Important metrics get the brand accent treatment
- Secondary stats use neutral glass
- Create visual hierarchy through color intensity

### 6. Dark Mode Excellence
- Slightly brighter surfaces for elevated elements
- Brand color appears more vibrant (lime-400 instead of lime-500)
- Subtle brand glow effects are more visible
- Glass effects have higher contrast borders

---

## Layout Patterns

### Dashboard Grid
```
┌─────────────────────────────────────────────────────┐
│ Page Header (brand label, title, subtitle, actions) │
├─────────────────────────────────────────────────────┤
│ Stat Grid (4 cols, left-border accents)             │
├───────────────────────────┬─────────────────────────┤
│ Primary Content           │ Side Panel              │
│ (glass cards)             │ (glass cards)           │
│                           │                         │
└───────────────────────────┴─────────────────────────┘
```

### Stat Box Grid
```css
/* Container with gap for clean borders */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: rgba(226, 232, 240, 0.5); /* Creates border lines */
  border: 1px solid rgba(226, 232, 240, 0.5);
}

.stat-box {
  background: glass-bg;
  /* Each box has its left-border accent */
}
```

---

## Animation & Motion

### Timing
| Name | Duration | Easing | Usage |
|------|----------|--------|-------|
| `instant` | 100ms | ease-out | Micro-interactions |
| `fast` | 150ms | ease-out | Hover states |
| `normal` | 200ms | ease-out | Standard transitions |
| `slow` | 300ms | ease-out | Page transitions |

### Hover Effects
```css
/* Card hover */
transition: all 0.2s ease;
&:hover {
  transform: translateY(-2px);
  border-color: rgba(132, 204, 22, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Stat box hover */
&:hover {
  transform: scale(1.01);
  border-left-color: (brighter version of accent);
}
```

---

## Icon Guidelines

### Sizes
| Name | Size | Usage |
|------|------|-------|
| `xs` | 14px | Inline with small text |
| `sm` | 16px | Buttons, inputs |
| `md` | 20px | Navigation, cards |
| `lg` | 24px | Feature icons |
| `xl` | 32px | Empty states |

### Styling
- Stroke width: 1.5px
- Color: Match adjacent text color OR brand color for emphasis
- Active nav icons: lime-500

---

## Implementation Classes (Tailwind)

### Quick Reference

```html
<!-- Glass Card -->
<div class="bg-white/75 dark:bg-zinc-900/85 backdrop-blur-md border border-lime-500/15 dark:border-lime-400/10">

<!-- Brand Stat Box -->
<div class="bg-lime-50/80 dark:bg-lime-500/8 border border-lime-500/25 border-l-4 border-l-lime-500">

<!-- Primary Button -->
<button class="bg-lime-500 hover:bg-lime-400 text-black font-semibold hover:shadow-[0_0_20px_rgba(132,204,22,0.3)]">

<!-- Secondary Glass Button -->
<button class="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm border border-lime-500/20 hover:border-lime-500/40">

<!-- Text Hierarchy -->
<h1 class="text-slate-900 dark:text-zinc-50">  <!-- Primary -->
<p class="text-slate-600 dark:text-zinc-400">   <!-- Secondary -->
<span class="text-slate-500 dark:text-zinc-500"> <!-- Muted -->

<!-- Focus Ring -->
<element class="focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/40 focus-visible:ring-offset-2">
```

---

## Color Quick Reference

### Light Mode
```
Page BG:        #F8FAFC (slate-50)
Card BG:        rgba(255,255,255,0.75) + blur
Card Border:    rgba(132,204,22,0.12)
Text Primary:   #0F172A (slate-900)
Text Secondary: #475569 (slate-600)
Text Muted:     #64748B (slate-500)
Brand:          #65A30D (lime-600) / #84CC16 (lime-500)
```

### Dark Mode
```
Page BG:        #09090B (zinc-950)
Card BG:        rgba(24,24,27,0.85) + blur
Card Border:    rgba(132,204,22,0.1)
Text Primary:   #FAFAFA (zinc-50)
Text Secondary: #A1A1AA (zinc-400)
Text Muted:     #71717A (zinc-500)
Brand:          #84CC16 (lime-500) / #A3E635 (lime-400)
```

---

## Summary of Key Differences from v1

| Aspect | Before (v1/Current) | After (v2) |
|--------|---------------------|------------|
| Stat Boxes | Bright colored backgrounds | Left-border accents + subtle tints |
| Glass Opacity | Too transparent | Increased for readability |
| Borders | Neutral gray | Brand green tinted |
| Text Contrast | Often too low | High contrast enforced |
| Visual Hierarchy | Flat | Depth via accent intensity |
| Hover States | Inconsistent | Brand glow throughout |
| Color System | Random accent colors | Semantic + brand threading |

---

*This design system creates a premium, corporate aesthetic while maintaining the distinctive EcoTribe brand identity through sophisticated use of lime green accents and refined glassmorphism.*
