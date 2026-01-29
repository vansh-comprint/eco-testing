/**
 * EcoTribe Design System v2.0
 * Premium corporate aesthetic with refined glassmorphism and brand threading
 */

// =============================================================================
// Z-INDEX HIERARCHY
// =============================================================================
export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  sidebar: 40,
  header: 50,
  overlay: 60,
  modal: 70,
  popover: 80,
  tooltip: 90,
  toast: 100,
  cursor: 9000,
  grain: 9999,
} as const;

export type ZIndexLevel = keyof typeof zIndex;

// =============================================================================
// ICON SIZES
// =============================================================================
export const iconSize = {
  xs: 'w-3 h-3',        // 12px - micro icons, checkmarks
  sm: 'w-3.5 h-3.5',    // 14px - small inline icons, close buttons
  md: 'w-4 h-4',        // 16px - default icon size (buttons, inputs)
  lg: 'w-5 h-5',        // 20px - header icons, navigation
  xl: 'w-6 h-6',        // 24px - feature icons
  '2xl': 'w-8 h-8',     // 32px - empty states, large illustrations
  '3xl': 'w-10 h-10',   // 40px - hero icons
  '4xl': 'w-12 h-12',   // 48px - extra large icons
} as const;

export type IconSizeLevel = keyof typeof iconSize;

// =============================================================================
// ANIMATION DURATIONS (in seconds for Framer Motion)
// =============================================================================
export const duration = {
  instant: 0,
  fastest: 0.1,   // Button press feedback
  fast: 0.15,     // Micro-interactions (dropdowns, tooltips)
  normal: 0.2,    // Standard transitions
  slow: 0.3,      // Complex animations
  slower: 0.5,    // Page transitions, hero elements
  slowest: 0.8,   // Background effects
} as const;

export type DurationLevel = keyof typeof duration;

// =============================================================================
// STAGGER DELAYS (for list animations)
// =============================================================================
export const stagger = {
  fast: 0.02,     // Table rows
  normal: 0.05,   // List items, cards
  slow: 0.1,      // Feature sections
} as const;

// =============================================================================
// EASING FUNCTIONS
// =============================================================================
export const easing = {
  linear: 'linear',
  easeIn: 'easeIn',
  easeOut: 'easeOut',
  easeInOut: 'easeInOut',
  smooth: [0.23, 1, 0.32, 1] as const,
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
} as const;

export const spring = {
  default: { type: 'spring' as const, stiffness: 400, damping: 30 },
  soft: { type: 'spring' as const, stiffness: 300, damping: 25 },
  stiff: { type: 'spring' as const, stiffness: 500, damping: 30 },
  bouncy: { type: 'spring' as const, stiffness: 400, damping: 10 },
} as const;

// =============================================================================
// GLASSMORPHISM v2.1 - Higher opacity for light mode visibility
// =============================================================================
export const glass = {
  // Primary surfaces - cards, panels (HIGH OPACITY FOR VISIBILITY)
  default: `
    bg-white/95 dark:bg-zinc-900/85
    backdrop-blur-md
    border border-slate-200/80 dark:border-lime-400/[0.08]
    shadow-sm shadow-slate-900/[0.03] dark:shadow-none
  `.replace(/\s+/g, ' ').trim(),

  // Elevated surfaces - modals, popovers (SOLID + BLUR)
  elevated: `
    bg-white dark:bg-zinc-900/95
    backdrop-blur-xl
    border border-slate-200 dark:border-lime-400/[0.1]
    shadow-lg shadow-slate-900/[0.08] dark:shadow-none
  `.replace(/\s+/g, ' ').trim(),

  // Subtle backgrounds - tables, secondary surfaces (HIGHER CONTRAST)
  subtle: `
    bg-white/98 dark:bg-zinc-900/75
    border border-slate-200 dark:border-zinc-800
    shadow-sm shadow-slate-900/[0.02] dark:shadow-none
  `.replace(/\s+/g, ' ').trim(),

  // Overlay surfaces - modal content, dropdown panels (SOLID)
  overlay: `
    bg-white dark:bg-zinc-900/98
    backdrop-blur-xl
    border border-slate-200 dark:border-lime-400/[0.08]
  `.replace(/\s+/g, ' ').trim(),

  // Highlight/selection - brand accent (VISIBLE TINT)
  highlight: `
    bg-lime-50 dark:bg-lime-500/[0.08]
    border border-lime-500/30 dark:border-lime-400/20
  `.replace(/\s+/g, ' ').trim(),

  // Ghost (transparent)
  ghost: 'bg-transparent border-transparent',

  // Connected section - for grouping stats with related content
  section: `
    bg-white dark:bg-zinc-900/80
    border border-slate-200 dark:border-zinc-800
    shadow-sm shadow-slate-900/[0.04] dark:shadow-none
  `.replace(/\s+/g, ' ').trim(),
} as const;

export type GlassVariant = keyof typeof glass;

// =============================================================================
// BORDER SYSTEM v2.0 - Brand-tinted borders
// =============================================================================
export const borders = {
  // Default - subtle brand tint
  default: 'border border-slate-200/80 dark:border-zinc-800',

  // Brand-tinted glass border
  glass: 'border border-lime-500/[0.12] dark:border-lime-400/[0.08]',

  // Stronger brand border (hover, focus)
  brand: 'border border-lime-500/30 dark:border-lime-400/25',

  // Solid brand border (active, selected)
  brandSolid: 'border border-lime-500 dark:border-lime-400',

  // Divider lines
  divider: 'border-slate-200 dark:border-zinc-800',

  // Grid pattern for stat boxes
  grid: {
    container: 'border border-slate-200/60 dark:border-zinc-800/60',
    item: 'border-r border-b border-slate-200/60 dark:border-zinc-800/60 last:border-r-0',
  },
} as const;

// =============================================================================
// TEXT COLORS v2.0 - High contrast for readability
// =============================================================================
export const text = {
  // Primary text - headlines, important content
  primary: 'text-slate-900 dark:text-zinc-50',

  // Secondary text - body, descriptions
  secondary: 'text-slate-600 dark:text-zinc-400',

  // Muted text - captions, timestamps
  muted: 'text-slate-500 dark:text-zinc-500',

  // Disabled text
  disabled: 'text-slate-400 dark:text-zinc-600',

  // On brand background
  onBrand: 'text-black',

  // Brand colored text
  brand: 'text-lime-600 dark:text-lime-400',
} as const;

// =============================================================================
// FOCUS STATES v2.0 - Brand glow
// =============================================================================
export const focus = {
  // Primary focus ring with brand glow
  ring: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900',

  // Border-based focus for inputs
  border: 'focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20',

  // Subtle focus for secondary actions
  subtle: 'focus:outline-none focus-visible:ring-1 focus-visible:ring-lime-500/30',

  // No visible focus
  none: 'focus:outline-none',
} as const;

export type FocusVariant = keyof typeof focus;

// =============================================================================
// SEMANTIC ACCENT COLORS v2.0 - For stat boxes and status indicators
// Left-border accent pattern with subtle backgrounds
// =============================================================================
export const accent = {
  brand: {
    border: 'border-l-4 border-l-lime-500',
    bg: 'bg-lime-50 dark:bg-lime-500/[0.08]',
    bgSubtle: 'bg-white dark:bg-zinc-900/85',
    borderColor: 'border-lime-500/30 dark:border-lime-400/20',
    text: 'text-lime-700 dark:text-lime-300',
    textValue: 'text-slate-900 dark:text-zinc-50',
  },
  success: {
    border: 'border-l-4 border-l-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-500/[0.08]',
    bgSubtle: 'bg-white dark:bg-zinc-900/85',
    borderColor: 'border-emerald-500/25 dark:border-emerald-400/15',
    text: 'text-emerald-700 dark:text-emerald-300',
    textValue: 'text-slate-900 dark:text-zinc-50',
  },
  warning: {
    border: 'border-l-4 border-l-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-500/[0.08]',
    bgSubtle: 'bg-white dark:bg-zinc-900/85',
    borderColor: 'border-amber-500/25 dark:border-amber-400/15',
    text: 'text-amber-700 dark:text-amber-300',
    textValue: 'text-slate-900 dark:text-zinc-50',
  },
  danger: {
    border: 'border-l-4 border-l-red-500',
    bg: 'bg-red-50 dark:bg-red-500/[0.08]',
    bgSubtle: 'bg-white dark:bg-zinc-900/85',
    borderColor: 'border-red-500/25 dark:border-red-400/15',
    text: 'text-red-700 dark:text-red-300',
    textValue: 'text-slate-900 dark:text-zinc-50',
  },
  info: {
    border: 'border-l-4 border-l-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-500/[0.08]',
    bgSubtle: 'bg-white dark:bg-zinc-900/85',
    borderColor: 'border-blue-500/25 dark:border-blue-400/15',
    text: 'text-blue-700 dark:text-blue-300',
    textValue: 'text-slate-900 dark:text-zinc-50',
  },
  neutral: {
    border: 'border-l-4 border-l-slate-300 dark:border-l-zinc-600',
    bg: 'bg-slate-50 dark:bg-zinc-800/50',
    bgSubtle: 'bg-white dark:bg-zinc-900/85',
    borderColor: 'border-slate-200 dark:border-zinc-700/50',
    text: 'text-slate-600 dark:text-zinc-400',
    textValue: 'text-slate-900 dark:text-zinc-50',
  },
} as const;

export type AccentType = keyof typeof accent;

// Legacy statusColors for backwards compatibility
export const statusColors = {
  success: {
    bg: accent.success.bg,
    border: accent.success.borderColor,
    text: accent.success.text,
    icon: 'text-emerald-500',
  },
  warning: {
    bg: accent.warning.bg,
    border: accent.warning.borderColor,
    text: accent.warning.text,
    icon: 'text-amber-500',
  },
  error: {
    bg: accent.danger.bg,
    border: accent.danger.borderColor,
    text: accent.danger.text,
    icon: 'text-red-500',
  },
  info: {
    bg: accent.info.bg,
    border: accent.info.borderColor,
    text: accent.info.text,
    icon: 'text-blue-500',
  },
  neutral: {
    bg: accent.neutral.bg,
    border: accent.neutral.borderColor,
    text: accent.neutral.text,
    icon: 'text-slate-500 dark:text-zinc-500',
  },
} as const;

export type StatusType = keyof typeof statusColors;

// =============================================================================
// TRANSITION UTILITIES
// =============================================================================
export const transition = {
  fast: 'transition-all duration-150 ease-out',
  normal: 'transition-all duration-200 ease-out',
  slow: 'transition-all duration-300 ease-out',
  colors: 'transition-colors duration-200 ease-out',
  transform: 'transition-transform duration-200 ease-out',
  opacity: 'transition-opacity duration-200 ease-out',
} as const;

// =============================================================================
// HOVER EFFECTS v2.0 - Brand glow on hover
// =============================================================================
export const hover = {
  // Card hover - subtle lift with brand border glow
  card: `
    hover:border-lime-500/25 dark:hover:border-lime-400/20
    hover:shadow-md hover:shadow-lime-500/5 dark:hover:shadow-lime-400/5
    hover:-translate-y-0.5
    transition-all duration-200 ease-out
  `.replace(/\s+/g, ' ').trim(),

  // Button hover - brand glow
  button: 'hover:shadow-[0_0_20px_rgba(132,204,22,0.25)]',

  // Stat box hover - subtle scale
  stat: 'hover:scale-[1.01] transition-transform duration-200 ease-out',

  // Interactive row hover
  row: 'hover:bg-lime-50/30 dark:hover:bg-lime-500/5 transition-colors duration-150',
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================
export const typography = {
  fonts: {
    brand: 'font-brand',      // Chakra Petch - bold headers
    display: 'font-display',  // Rajdhani - numbers, emphasis
    body: 'font-sans',        // Inter - body text
    mono: 'font-mono',        // JetBrains Mono - labels, IDs
  },
  sizes: {
    xs: 'text-xs',            // 12px
    sm: 'text-sm',            // 14px
    base: 'text-base',        // 16px
    lg: 'text-lg',            // 18px
    xl: 'text-xl',            // 20px
    '2xl': 'text-2xl',        // 24px
    '3xl': 'text-3xl',        // 30px
    '4xl': 'text-4xl',        // 36px
    '5xl': 'text-5xl',        // 48px
  },
  tracking: {
    tighter: 'tracking-tighter',
    tight: 'tracking-tight',
    normal: 'tracking-normal',
    wide: 'tracking-wide',
    wider: 'tracking-wider',
    widest: 'tracking-widest',
    label: 'tracking-[0.2em]',
  },
} as const;

// =============================================================================
// COMPONENT SPACING
// =============================================================================
export const spacing = {
  padding: {
    xs: 'px-2 py-1',
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
    xl: 'px-8 py-6',
  },
  gap: {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  },
} as const;

// =============================================================================
// STAT BOX PRESETS - Ready-to-use class combinations
// =============================================================================
export const statBox = {
  brand: `${accent.brand.bgSubtle} backdrop-blur-md border ${accent.brand.borderColor} ${accent.brand.border} p-6`,
  success: `${accent.success.bgSubtle} backdrop-blur-md border ${accent.success.borderColor} ${accent.success.border} p-6`,
  warning: `${accent.warning.bgSubtle} backdrop-blur-md border ${accent.warning.borderColor} ${accent.warning.border} p-6`,
  danger: `${accent.danger.bgSubtle} backdrop-blur-md border ${accent.danger.borderColor} ${accent.danger.border} p-6`,
  info: `${accent.info.bgSubtle} backdrop-blur-md border ${accent.info.borderColor} ${accent.info.border} p-6`,
  neutral: `${accent.neutral.bgSubtle} backdrop-blur-md border ${accent.neutral.borderColor} ${accent.neutral.border} p-6`,
} as const;
