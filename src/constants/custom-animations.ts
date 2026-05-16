// ============================================
// ZOOM ANIMATIONS GROUP
// Animations that zoom/scale with bouncy motion
// ============================================

/**
 * Zoom Pulse Grow - Starts medium (1.25), shrinks to normal (1.0), then grows large (1.75)
 * Creates a "breathing in" or "expanding" effect
 */
const zoomPulseGrow = (duration: number) => {
  return {
    type: "keyframes",
    options: {
      duration: duration,
      delay: 0,
      easing: "slow",
      iterCount: 1,
      id: "keyframe_zoompulsegrow_valley",
    },
    params: {
      "0%": {
        x: 0,
        y: 0,
        angle: 0,
        scale: 2.25,
        mirror: 1,
      },
      "30%": {
        x: 0,
        y: 0,
        scale: 0.95,
        angle: 0,
        mirror: 1,
      },
      "60%": {
        x: 0,
        y: 0,
        scale: 1.05,
        angle: 0,
        mirror: 1,
      },
      "100%": {
        x: 0,
        y: 0,
        scale: 2.75,
        angle: 0,
        mirror: 1,
      },
    },
  };
};

/**
 * Zoom Rotate Bounce Mega - Complex animation with rotation, bounce, and mega zoom
 * Starts rotated (-25°) and large (1.75), unrotates and shrinks to normal (1.0),
 * bounces around, then grows to mega size (2.0)
 */
const zoomRotateBounceMega = (duration: number) => {
  return {
    type: "keyframes",
    options: {
      duration: duration,
      delay: 0,
      easing: "slow",
      iterCount: 1,
      id: "keyframe_zoomrotate_mega_valley",
    },
    params: {
      "0%": {
        x: 0,
        y: 0,
        angle: -25,
        scale: 2.75,
        mirror: 1,
      },
      "30%": {
        x: 10,
        y: -10,
        angle: -5,
        scale: 1.2,
        mirror: 1,
      },
      "60%": {
        x: -5,
        y: 5,
        angle: 0,
        scale: 1,
        mirror: 1,
      },
      "80%": {
        x: 15,
        y: -15,
        angle: 2,
        scale: 1.4,
        mirror: 1,
      },
      "100%": {
        x: 0,
        y: 0,
        scale: 3,
        angle: 0,
        mirror: 1,
      },
    },
  };
};

/**
 * Slide Left Center Bottom - Slides from left to center, then down to bottom
 * Creates a path animation: left → center → bottom with blur transitions
 */
const slideLeftCenterBottom = (duration: number) => {
  return {
    type: "keyframes",
    options: {
      duration: duration,
      delay: 0,
      easing: "slow",
      iterCount: 1,
      id: "keyframe_slide_valley",
    },
    params: {
      "0%": {
        x: -150,
        y: 0,
        blur: 30,
        scale: 2.25,
        angle: 0,
        mirror: 1,
      },
      "30%": {
        x: 0,
        y: 0,
        blur: 0,
        scale: 1.3,
        angle: 0,
        mirror: 1,
      },
      "60%": {
        x: 0,
        y: 0,
        blur: 0,
        scale: 1.15,
        angle: 0.5,
        mirror: 1,
      },
      "80%": {
        x: 0,
        y: 40,
        blur: 2,
        scale: 1.2,
        angle: 0,
        mirror: 1,
      },
      "100%": {
        x: 0,
        y: 150,
        blur: 10,
        scale: 2.25,
        angle: 0,
        mirror: 1,
      },
    },
  };
};

/**
 * Slide Right Center Bottom - Slides from right to center, then down to bottom
 * Creates a path animation: right → center → bottom with blur transitions
 */
const slideRightCenterBottom = (duration: number) => {
  return {
    type: "keyframes",
    options: {
      duration: duration,
      delay: 0,
      easing: "slow",
      iterCount: 1,
      id: "keyframe_slide_right_valley",
    },
    params: {
      "0%": {
        x: 150,
        y: 0,
        blur: 30,
        scale: 2.25,
        angle: 0,
        mirror: 1,
      },
      "30%": {
        x: 0,
        y: 0,
        blur: 0,
        scale: 1.3,
        angle: 0,
        mirror: 1,
      },
      "60%": {
        x: 0,
        y: 0,
        blur: 0,
        scale: 1.15,
        angle: -0.5,
        mirror: 1,
      },
      "80%": {
        x: 0,
        y: 40,
        blur: 2,
        scale: 1.2,
        angle: 0,
        mirror: 1,
      },
      "100%": {
        x: 0,
        y: 150,
        blur: 10,
        scale: 2.25,
        angle: 0,
        mirror: 1,
      },
    },
  };
};

/**
 * Zoom In Bounce - Starts large (1.75) and settles to normal (1.0)
 * Creates a dynamic "pop in" entrance effect
 */
const zoomInBounce = (duration: number) => {
  return {
    type: "keyframes",
    options: {
      duration: duration,
      delay: 0,
      easing: "slow",
      iterCount: 1,
      id: "keyframe_bounce_strong_valley",
    },
    params: {
      "0%": {
        x: 0,
        y: 0,
        angle: 0,
        scale: 2.25,
        mirror: 1,
      },
      "30%": {
        x: 15,
        y: -15,
        scale: 1.4,
        angle: -2,
        mirror: 1,
      },
      "60%": {
        x: -5,
        y: 5,
        scale: 1.3,
        angle: 0,
        mirror: 1,
      },
      "100%": {
        x: 0,
        y: 0,
        scale: 1,
        angle: 1,
        mirror: 1,
      },
    },
  };
};

/**
 * Zoom Out Bounce - Starts normal (1.75) and zooms back out (1.75)
 * Creates a "breathing" or "pulsing" effect while staying zoomed
 */
const zoomOutBounce = (duration: number) => {
  return {
    type: "keyframes",
    options: {
      duration: duration,
      delay: 0,
      easing: "slow",
      iterCount: 1,
      id: "keyframe_zoomout_strong_valley",
    },
    params: {
      "0%": {
        x: 0,
        y: 0,
        angle: 0,
        scale: 2.75,
        mirror: 1,
      },
      "30%": {
        x: 15,
        y: -15,
        scale: 1.4,
        angle: -2,
        mirror: 1,
      },
      "60%": {
        x: -5,
        y: 5,
        scale: 1.1,
        angle: 0,
        mirror: 1,
      },
      "100%": {
        x: 0,
        y: 0,
        scale: 2.75,
        angle: 1,
        mirror: 1,
      },
    },
  };
};

/**
 * Zoom Bounce Out - Starts zoomed (1.75), bounces through smaller scales, ends normal (1.0)
 * Creates an exit effect with bounce
 */
const zoomBounceOut = (duration: number) => {
  return {
    type: "keyframes",
    options: {
      duration: duration,
      delay: 0,
      easing: "slow",
      iterCount: 1,
      id: "keyframe_zoombounceout_strong_valley",
    },
    params: {
      "0%": {
        x: 0,
        y: 0,
        angle: 0,
        scale: 2.75,
        mirror: 1,
      },
      "30%": {
        x: 15,
        y: -15,
        scale: 1.5,
        angle: -2,
        mirror: 1,
      },
      "60%": {
        x: -5,
        y: 5,
        scale: 1.3,
        angle: 0,
        mirror: 1,
      },
      "100%": {
        x: 0,
        y: 0,
        scale: 1,
        angle: 1,
        mirror: 1,
      },
    },
  };
};

// ============================================
// SLIDE ANIMATIONS GROUP
// Animations that slide with blur effects
// ============================================

/**
 * Slide Blur Left - Slides from left (-100) to center and back
 * Creates a left-to-center transition with blur
 */
const slideBlurLeft = (duration: number) => {
  return {
    type: "keyframes",
    options: {
      duration: duration,
      delay: 0,
      easing: "slow",
      iterCount: 1,
      id: "keyframe_slide_blur_left_valley",
    },
    params: {
      "0%": {
        x: -100,
        y: 0,
        blur: 10,
        scale: 2.25,
        angle: 2,
        mirror: 1,
      },
      "30%": {
        x: 0,
        y: 0,
        blur: 0,
        scale: 1.3,
        angle: 1,
        mirror: 1,
      },
      "60%": {
        x: 0,
        y: 0,
        blur: 0,
        scale: 1.18,
        angle: -1,
        mirror: 1,
      },
      "80%": {
        x: -30,
        y: 0,
        blur: 3,
        scale: 1.22,
        angle: -3,
        mirror: 1,
      },
      "100%": {
        x: -100,
        y: 0,
        blur: 10,
        scale: 2.25,
        angle: -5,
        mirror: 1,
      },
    },
  };
};

/**
 * Slide Blur Right - Slides from right (100) to center and back
 * Creates a right-to-center transition with blur (mirror of slideBlurLeft)
 */
const slideBlurRight = (duration: number) => {
  return {
    type: "keyframes",
    options: {
      duration: duration,
      delay: 0,
      easing: "slow",
      iterCount: 1,
      id: "keyframe_slide_blur_right_valley",
    },
    params: {
      "0%": {
        x: 100,
        y: 0,
        blur: 10,
        scale: 2.25,
        angle: -2,
        mirror: 1,
      },
      "30%": {
        x: 0,
        y: 0,
        blur: 0,
        scale: 1.3,
        angle: -1,
        mirror: 1,
      },
      "60%": {
        x: 0,
        y: 0,
        blur: 0,
        scale: 1.18,
        angle: 1,
        mirror: 1,
      },
      "80%": {
        x: 30,
        y: 0,
        blur: 3,
        scale: 1.22,
        angle: 3,
        mirror: 1,
      },
      "100%": {
        x: 100,
        y: 0,
        blur: 10,
        scale: 2.25,
        angle: 5,
        mirror: 1,
      },
    },
  };
};

// ============================================
// FLUID ANIMATIONS GROUP
// Smooth, flowing animations with continuous motion
// ============================================

/**
 * Wave Flow - Smooth wave-like motion with scale pulsing
 * Creates a fluid, organic flowing effect
 */
const waveFlow = (duration: number) => {
  return {
    type: "keyframes",
    options: {
      duration: duration,
      delay: 0,
      easing: "slow",
      iterCount: 1,
      id: "keyframe_wave_valley",
    },
    params: {
      "0%": {
        x: 0,
        y: -20,
        scale: 1.6,
        angle: -3,
        mirror: 1,
      },
      "30%": {
        x: 20,
        y: 5,
        scale: 2.1,
        angle: 3,
        mirror: 1,
      },
      "60%": {
        x: 5,
        y: 10,
        scale: 1.8,
        angle: 0,
        mirror: 1,
      },
      "80%": {
        x: -20,
        y: -5,
        scale: 1.9,
        angle: -3,
        mirror: 1,
      },
      "100%": {
        x: 0,
        y: -20,
        scale: 2.2,
        angle: -3,
        mirror: 1,
      },
    },
  };
};

/**
 * Float Drift - Gentle floating motion with subtle scale changes
 * Creates a dreamy, weightless drifting effect
 */
const floatDrift = (duration: number) => {
  return {
    type: "keyframes",
    options: {
      duration: duration,
      delay: 0,
      easing: "slow",
      iterCount: 1,
      id: "keyframe_float_valley",
    },
    params: {
      "0%": {
        x: -10,
        y: 0,
        scale: 1.2,
        angle: -2,
        mirror: 1,
      },
      "30%": {
        x: 12,
        y: -15,
        scale: 1.7,
        angle: 2,
        mirror: 1,
      },
      "60%": {
        x: 3,
        y: 5,
        scale: 1.4,
        angle: 0,
        mirror: 1,
      },
      "80%": {
        x: -18,
        y: 8,
        scale: 1.55,
        angle: -2,
        mirror: 1,
      },
      "100%": {
        x: -10,
        y: 0,
        scale: 1.65,
        angle: -2,
        mirror: 1,
      },
    },
  };
};

export const ANIMATION_GROUPS = {
  zoom: [zoomInBounce, zoomOutBounce, zoomBounceOut, zoomPulseGrow, zoomRotateBounceMega],
  slide: [slideLeftCenterBottom, slideRightCenterBottom, slideBlurLeft, slideBlurRight],
  path: [slideLeftCenterBottom, slideRightCenterBottom],
  fluid: [waveFlow, floatDrift],
};

export const ALL_ANIMATIONS = [
  ...ANIMATION_GROUPS.zoom,
  ...ANIMATION_GROUPS.slide,
  ...ANIMATION_GROUPS.path,
  ...ANIMATION_GROUPS.fluid,
];

// Legacy export for backward compatibility
export const baseAnim = (duration: number) => {
  const randomIndex = Math.floor(Math.random() * ALL_ANIMATIONS.length);
  return ALL_ANIMATIONS[randomIndex](duration);
};

export const COMBO_ANIMATION_GROUPS = {
  scale: {
    fast: ["comboZoom2"],
    slow: ["comboZoom1", "comboBounce1"],
    medium: ["comboSwayIn", "comboSwayOut"],
  },

  motion: {
    fast: [],
    slow: ["comboWobble"],
    medium: ["comboPendulum1", "comboPendulum2"],
  },

  rotation: {
    fast: ["comboRightDistort"],
    slow: ["comboSpinningTop1", "comboSpinningTop2"],
    medium: ["comboLeftDistort", "comboRightDistort"],
  },
};
