/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // ─────────────────────────────────────────────────────────────
      // LEGACY TOKENS — kept for backward-compat with existing glass
      // components. Do NOT use these in new neo-brutalist UI work.
      // ─────────────────────────────────────────────────────────────
      colors: {
        // Legacy glass-era surfaces
        obsidian:       '#121212',
        'warm-dark':    '#0E0D12',
        'surface-dark': '#15131A',
        'surface-card': '#1C1A24',
        'glass-bg':     'rgba(255, 255, 255, 0.03)',
        'glass-border': 'rgba(255, 255, 255, 0.06)',

        // Legacy brand accents
        lavender:         '#B47AEA',
        'iridescent-pink':'#FF71CE',
        'toxic-lime':     '#39FF14',
        'neon-coral':     '#FF5757',

        // Legacy neutrals
        'gray-light': '#F3F4F6',
        'gray-muted': '#9CA3AF',
        'gray-dark':  '#4B5563',

        // ─────────────────────────────────────────────────────────
        // ✦ NEO-BRUTALISM TOKENS  (bb = BreadBuddy)
        //
        // COLOUR RATIONALE
        // ────────────────
        // Accent 1 — Toxic Lime → KEPT as bb-lime (#A8E635)
        //   The existing #39FF14 is too radioactive for body text.
        //   Dialling to #A8E635 keeps the loud lime energy while
        //   passing WCAG AA contrast on the #1A1724 surface.
        //   Role: success, savings, level-ups, positive feedback.
        //
        // Accent 2 — Neon Coral → KEPT as bb-coral (#F85C50)
        //   Shifted from pink-ish #FF5757 to a punchier tomato-red.
        //   Reads unambiguously as "danger / deficit" against dark bg.
        //   Role: deficits, deletions, warnings, error states.
        //
        // Accent 3 — Pink/Lavender duo → REPLACED by bb-violet (#9B59F5)
        //   The iridescent pink+lavender gradient was the core glass-era
        //   signature. Collapsing the duo into ONE flat electric violet
        //   retains the Gen-Z / gamification vibe without any gradient
        //   or iridescence. Passes AA contrast on dark surfaces.
        //   Role: gamification, AI Bro, XP bars, achievements, badges.
        //
        // Paper surface (#F4F0FF) added for high-contrast accent blocks
        //   (e.g. a stat card printed as a physical sticker on the page).
        // ─────────────────────────────────────────────────────────
        bb: {
          // Surfaces
          bg:      '#0F0D13',   // void — deeper than legacy bg
          surface: '#1A1724',   // card/panel — solid, NOT translucent
          paper:   '#F4F0FF',   // light "paper" for contrast blocks

          // Accent 1: Lime
          lime:      '#A8E635',
          'lime-fg': '#0F1A00', // text placed ON lime fills

          // Accent 2: Coral
          coral:      '#F85C50',
          'coral-fg': '#1A0300', // text placed ON coral fills

          // Accent 3: Violet
          violet:      '#9B59F5',
          'violet-fg': '#0D0027', // text placed ON violet fills

          // Text hierarchy
          'text-primary':   '#F2EDFF', // near-white w/ slight violet tint
          'text-secondary': '#A89EC4', // muted lavender-grey
          'text-muted':     '#5B5272', // labels, placeholders, hints

          // Borders (solid, dark-tinted — NOT transparent)
          border: '#2B2540',

          // Shadow base (used in offset-shadow values below)
          shadow: '#000000',
        },
      },

      // ─────────────────────────────────────────────────────────────
      // BORDER WIDTHS
      // Neo-brutal uses heavy, visible borders:
      //   2px — inputs, chips, small components (bb-border-sm)
      //   3px — cards, standard buttons, badges   (bb-border DEFAULT)
      //   4px — modals, hero CTA buttons           (bb-border-lg)
      // ─────────────────────────────────────────────────────────────
      borderWidth: {
        '0': '0px',
        '1': '1px',
        '2': '2px',
        '3': '3px',
        '4': '4px',
        '6': '6px',
        '8': '8px',
      },

      // ─────────────────────────────────────────────────────────────
      // BORDER RADIUS
      // DECISION: 4px default (bb-sm). Justification:
      //   Pure 0px (square) is jarring in a gamified/fun app.
      //   4px is still visibly angular vs. existing 12-16px cards,
      //   giving the blocky sticker-like quality without feeling
      //   hostile. 6px max for inputs/modals. 0px available for
      //   dividers and explicit "hard" elements (progress bars).
      // ─────────────────────────────────────────────────────────────
      borderRadius: {
        'bb-none': '0px',   // progress bar tracks, dividers
        'bb-xs':   '2px',   // tightest — badge notches
        'bb-sm':   '4px',   // DEFAULT for cards, buttons, stat blocks
        'bb-md':   '6px',   // inputs — slightly softer
        'bb-lg':   '8px',   // modals / overlays

        // Legacy radii (kept)
        sm:    '0.125rem',
        DEFAULT: '0.25rem',
        md:    '0.375rem',
        lg:    '0.5rem',
        xl:    '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full:  '9999px',
      },

      // ─────────────────────────────────────────────────────────────
      // BOX SHADOWS — offset-only (zero blur, zero spread)
      // Principle: ALL new-era shadows are hard offsets.
      // Hover interaction: element TRANSLATES toward shadow (+2px,+2px),
      // making the shadow SHRINK — gives a satisfying "press" feel
      // without any animation library needed.
      // ─────────────────────────────────────────────────────────────
      boxShadow: {
        // Legacy soft shadows (kept)
        sm:    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md:    '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg:    '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        xl:    '0 20px 25px -5px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        none:  'none',

        // ── Neo-brutal offset shadows ─────────────────────────────
        'bb':        '4px 4px 0px 0px #000000',   // card at rest
        'bb-hover':  '2px 2px 0px 0px #000000',   // card on hover (pair with translate-[2px,2px])
        'bb-active': '0px 0px 0px 0px #000000',   // card pressed
        'bb-lg':     '6px 6px 0px 0px #000000',   // hero cards / modals
        'bb-xl':     '8px 8px 0px 0px #000000',   // landing hero elements

        // Accent-coloured shadows (special flair, use sparingly)
        'bb-lime':   '4px 4px 0px 0px #A8E635',
        'bb-coral':  '4px 4px 0px 0px #F85C50',
        'bb-violet': '4px 4px 0px 0px #9B59F5',
        'bb-paper':  '4px 4px 0px 0px #F4F0FF',
      },

      // ─────────────────────────────────────────────────────────────
      // TYPOGRAPHY
      // Keeping Inter (excellent legibility + tabular numeric figures).
      // Adding Outfit as display/headline — rounder personality, Gen-Z
      // coded, pairs perfectly with Inter body text.
      // JetBrains Mono for tabular stat numbers (XP, amounts, streaks)
      // where monospace prevents layout shift as digits change.
      // ─────────────────────────────────────────────────────────────
      fontFamily: {
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Outfit', 'Inter', 'ui-sans-serif', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        // Stat display scale — big chunky numbers (XP, amounts, streaks)
        // These pair font-size with locked lineHeight + weight + tracking.
        'stat-sm':  ['2rem',    { lineHeight: '1', fontWeight: '800', letterSpacing: '-0.02em' }],
        'stat-md':  ['2.75rem', { lineHeight: '1', fontWeight: '800', letterSpacing: '-0.025em' }],
        'stat-lg':  ['3.5rem',  { lineHeight: '1', fontWeight: '900', letterSpacing: '-0.03em' }],
        'stat-xl':  ['4.5rem',  { lineHeight: '1', fontWeight: '900', letterSpacing: '-0.035em' }],
        // Section labels — screaming uppercase capslock style
        'label':    ['0.625rem', { lineHeight: '1', fontWeight: '700', letterSpacing: '0.12em' }],
        'label-md': ['0.75rem',  { lineHeight: '1', fontWeight: '700', letterSpacing: '0.1em' }],
      },

      fontWeight: {
        thin:       '100',
        extralight: '200',
        light:      '300',
        normal:     '400',
        medium:     '500',
        semibold:   '600',
        bold:       '700',
        extrabold:  '800',
        black:      '900', // stat display numbers
      },

      // ─────────────────────────────────────────────────────────────
      // SPACING (a few named gaps for the design system)
      // ─────────────────────────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
      },

      // ─────────────────────────────────────────────────────────────
      // ANIMATIONS — legacy kept + neo-brutal additions
      // ─────────────────────────────────────────────────────────────
      animation: {
        // Legacy
        'pulse-slow':  'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float':       'float 6s ease-in-out infinite',
        'shake':       'shake 0.5s ease-in-out',
        'shimmer':     'shimmer 2s linear infinite',
        // Neo-brutal
        'bb-press':    'bbPress 0.1s ease-out forwards',     // element press toward shadow
        'bb-wobble':   'bbWobble 0.4s ease-in-out',          // sticker badge wobble
        'bb-slide-up': 'bbSlideUp 0.2s cubic-bezier(0.22, 1, 0.36, 1) forwards', // modal entry
      },

      keyframes: {
        // Legacy
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%':      { transform: 'translateX(-4px)' },
          '75%':      { transform: 'translateX(4px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        // Neo-brutal: element shifts +2px +2px toward shadow on press
        bbPress: {
          '0%':   { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(2px, 2px)' },
        },
        // Sticker wobble on badge hover
        bbWobble: {
          '0%':   { transform: 'rotate(0deg)' },
          '25%':  { transform: 'rotate(-4deg)' },
          '75%':  { transform: 'rotate(3deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        // Modal slide up from below
        bbSlideUp: {
          '0%':   { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
      },

      backdropBlur: {
        xs: '2px', // kept for legacy glass components during migration
      },
    },
  },
  plugins: [],
};
