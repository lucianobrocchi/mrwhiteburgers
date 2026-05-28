export const colors = {
  bgPrimary:    '#000000',
  bgSecondary:  '#0D0D0D',
  bgCard:       '#111111',
  accent:       '#F0C832',
  accent2:      '#FFFFFF',
  textPrimary:  '#FFFFFF',
  textMuted:    '#888888',
  borderSubtle: 'rgba(255, 255, 255, 0.07)',
}

export const fonts = {
  display: "'Anton', sans-serif",
  condensed: "'Barlow Condensed', sans-serif",
  body: "'DM Sans', sans-serif",
}

export const easings = {
  smooth:    [0.16, 1, 0.3, 1],
  cinematic: [0.25, 0.46, 0.45, 0.94],
}

export const fadeUp = {
  hidden:  { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
  },
}

export const staggerContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1 } },
}
