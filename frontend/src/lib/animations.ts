/**
 * EcoTribe Animation Presets
 * Standardized Framer Motion animation configurations
 */

import type { Variants, Transition } from 'framer-motion';
import { duration, easing, stagger, spring } from './design-tokens';

// =============================================================================
// PAGE TRANSITIONS
// =============================================================================

/** Standard page entrance animation (fade + slide up) */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const pageTransition: Transition = {
  duration: duration.slow,
  ease: easing.easeOut,
};

// =============================================================================
// FADE ANIMATIONS
// =============================================================================

/** Simple fade in/out */
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeTransition: Transition = {
  duration: duration.fast,
};

/** Fade with slight scale (for subtle emphasis) */
export const fadeScaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

// =============================================================================
// SCALE ANIMATIONS (Modals, Dropdowns, Popovers)
// =============================================================================

/** Modal/dropdown entrance with scale and slide */
export const scaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 8 },
};

export const scaleTransition: Transition = {
  duration: duration.fast,
  ease: easing.smooth,
};

/** Dropdown-specific (slides from top) */
export const dropdownVariants: Variants = {
  initial: { opacity: 0, y: -4, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
};

/** Popover (appears from trigger) */
export const popoverVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// =============================================================================
// SLIDE ANIMATIONS
// =============================================================================

/** Slide in from right (sidebars, drawers) */
export const slideFromRightVariants: Variants = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
};

/** Slide in from left */
export const slideFromLeftVariants: Variants = {
  initial: { x: '-100%' },
  animate: { x: 0 },
  exit: { x: '-100%' },
};

/** Slide in from bottom (mobile sheets) */
export const slideFromBottomVariants: Variants = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
};

/** Slide in from top (notifications) */
export const slideFromTopVariants: Variants = {
  initial: { y: '-100%', opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: '-100%', opacity: 0 },
};

export const slideTransition: Transition = {
  type: 'tween',
  duration: duration.normal,
  ease: easing.easeOut,
};

// =============================================================================
// LIST ITEM ANIMATIONS (Staggered)
// =============================================================================

/** Container for staggered children */
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: stagger.normal,
      delayChildren: 0.1,
    },
  },
};

/** Fast stagger container (for tables) */
export const fastStaggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: stagger.fast,
    },
  },
};

/** List item (fade + slide from left) */
export const listItemVariants: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
};

/** List item (fade + slide from bottom) */
export const listItemFromBottomVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

/** Table row animation */
export const tableRowVariants: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
};

/** Card grid item */
export const cardItemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const listItemTransition: Transition = {
  duration: duration.fast,
  ease: easing.easeOut,
};

/** Helper to create staggered transition with custom index */
export const createStaggerTransition = (index: number, delay: number = stagger.normal): Transition => ({
  delay: index * delay,
  duration: duration.fast,
  ease: easing.easeOut,
});

// =============================================================================
// BUTTON & INTERACTIVE ANIMATIONS
// =============================================================================

/** Button tap/press effect */
export const buttonTapVariants = {
  tap: { scale: 0.98 },
};

export const buttonTapTransition: Transition = {
  duration: duration.fastest,
};

/** Hover lift effect for cards */
export const hoverLiftVariants = {
  hover: { y: -2 },
};

export const hoverTransition: Transition = {
  duration: duration.fast,
  ease: easing.easeOut,
};

/** Scale on hover (for icons, small elements) */
export const hoverScaleVariants = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

// =============================================================================
// TOAST ANIMATIONS
// =============================================================================

/** Toast entrance (from right) */
export const toastVariants: Variants = {
  initial: { opacity: 0, x: 50, scale: 0.96 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 50, scale: 0.96 },
};

export const toastTransition: Transition = {
  duration: duration.normal,
  ease: easing.smooth,
};

// =============================================================================
// PROGRESS & LOADING ANIMATIONS
// =============================================================================

/** Progress bar fill animation */
export const progressVariants: Variants = {
  initial: { width: 0 },
  animate: (percentage: number) => ({
    width: `${percentage}%`,
  }),
};

export const progressTransition: Transition = {
  duration: duration.slow,
  ease: easing.smooth,
};

/** Pulse animation for loading states */
export const pulseVariants: Variants = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// =============================================================================
// SPRING-BASED ANIMATIONS
// =============================================================================

/** Spring animation for tabs indicator */
export const springIndicatorTransition = spring.default;

/** Bouncy spring for playful elements */
export const bouncySpringTransition = spring.bouncy;

/** Soft spring for gentle movements */
export const softSpringTransition = spring.soft;

// =============================================================================
// SECTION ANIMATIONS (for dashboard sections)
// =============================================================================

/** Header section (slides down) */
export const headerVariants: Variants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
};

/** Stats section (slides up) */
export const statsVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

/** Content section (slides up, slight delay) */
export const contentVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

/** Standard section transitions with delay */
export const createSectionTransition = (delay: number = 0): Transition => ({
  duration: duration.slow,
  delay,
  ease: easing.easeOut,
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Creates a staggered animation configuration for children
 * @param childDelay - Delay between each child animation
 * @param initialDelay - Initial delay before first child animates
 */
export const createStaggerConfig = (
  childDelay: number = stagger.normal,
  initialDelay: number = 0
) => ({
  staggerChildren: childDelay,
  delayChildren: initialDelay,
});

/**
 * Creates a custom transition with optional delay
 * @param baseTransition - Base transition object
 * @param delay - Additional delay
 */
export const withDelay = (baseTransition: Transition, delay: number): Transition => ({
  ...baseTransition,
  delay,
});
