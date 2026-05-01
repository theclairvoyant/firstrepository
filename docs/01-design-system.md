# Design System

The app supports light and dark mode. Default to system. A manual override lives in Settings (System / Light / Dark).

The design language is restrained, typographically precise, and accent-driven. No glassmorphism, no decorative gradients except the brand primary gradient on key CTAs, no faux-3D.

## 1. Color tokens

Define in `lib/theme/tokens.ts` and split into `light.ts` and `dark.ts`.

### Brand accents - identical across both themes

```ts
export const accent = {
  primary:  '#6366f1', // indigo - primary CTAs, focus, active tab
  skills:   '#f97316', // orange - workspace type "skills"
  social:   '#a855f7', // purple - workspace type "social"
  partner:  '#0d9488', // teal   - workspace type "partner"
  success:  '#10b981', // emerald - approved, live
  warning:  '#f59e0b', // amber  - pending
  danger:   '#ef4444', // red    - rejected, errors, sign out
  info:     '#22d3ee', // cyan   - invite pending
};

export const gradient = {
  primary: ['#6366f1', '#8b5cf6'], // primary CTAs only
};
```

### Dark theme

```ts
export const dark = {
  bg:            '#09090b',
  bgElevated:    '#131316',
  bgCard:        '#18181b',
  bgInput:       '#1f1f23',
  bgOverlay:     'rgba(0,0,0,0.6)',
  border:        'rgba(255,255,255,0.08)',
  borderStrong:  'rgba(255,255,255,0.14)',
  borderFocus:   accent.primary,
  textPrimary:   '#f4f4f5',
  textSecondary: '#a1a1aa',
  textMuted:     '#71717a',
  textInverse:   '#09090b',
};
```

### Light theme

```ts
export const light = {
  bg:            '#ffffff',
  bgElevated:    '#fafafa',
  bgCard:        '#ffffff',
  bgInput:       '#f4f4f5',
  bgOverlay:     'rgba(0,0,0,0.4)',
  border:        'rgba(0,0,0,0.08)',
  borderStrong:  'rgba(0,0,0,0.14)',
  borderFocus:   accent.primary,
  textPrimary:   '#09090b',
  textSecondary: '#52525b',
  textMuted:     '#71717a',
  textInverse:   '#fafafa',
};
```

### Status mapping

| Status | Dot color |
|--------|-----------|
| pending | warning |
| approved | success |
| live | success |
| rejected | danger |
| needs_edits | warning |
| pending_invite | info |
| pending_request | warning |

## 2. Typography

Loaded via `expo-google-fonts`:

- Sora 600/700/800 - large numbers, screen titles
- Outfit 400/500/600 - body, buttons, labels
- JetBrains Mono 500 - tags, status badges, view/click counters, OTP cells

```ts
export const type = {
  display:   { font: 'Sora_700Bold',         size: 32, lineHeight: 38, letterSpacing: -0.5 },
  title:     { font: 'Sora_700Bold',         size: 22, lineHeight: 28, letterSpacing: -0.3 },
  heading:   { font: 'Outfit_600SemiBold',   size: 18, lineHeight: 24, letterSpacing: -0.1 },
  body:      { font: 'Outfit_400Regular',    size: 15, lineHeight: 22 },
  bodyMed:   { font: 'Outfit_500Medium',     size: 15, lineHeight: 22 },
  caption:   { font: 'Outfit_500Medium',     size: 13, lineHeight: 18 },
  mono:      { font: 'JetBrainsMono_500Medium', size: 12, lineHeight: 16, letterSpacing: 0.04, textTransform: 'uppercase' },
  monoLarge: { font: 'JetBrainsMono_500Medium', size: 14, lineHeight: 18 },
};
```

## 3. Spacing and radius

```ts
export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48 };
export const radius  = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };
```

## 4. Components

| Component | Spec |
|-----------|------|
| Card | bgCard, 1px border, radius lg, padding md. Dark: no shadow. Light: 0 1px 2px rgba(0,0,0,0.04). |
| PrimaryButton | Gradient primary, white text, height 48, radius md, font Outfit 600 16. Pressed opacity 0.85. |
| SecondaryButton | bgInput, textPrimary, 1px border, height 48, radius md. |
| GhostButton | Transparent, textPrimary, height 40. |
| DestructiveButton | accent.danger background, white text. |
| Input | bgInput, textPrimary, placeholder textMuted, 1px border, height 52, radius md, padding 16. Focus border = borderFocus. |
| OTPInput | 6 cells, 48x56, monospace, gap 8. Focused cell border = borderFocus. |
| TagPill (selected) | accent.primary 12% bg, accent.primary text, mono, radius pill. |
| TagPill (unselected) | bgInput bg, textSecondary text, mono. |
| StatusBadge | 6px dot + text. Over media: bgOverlay 65%. Over surface: bgCard. Mono. Padding 4/10. |
| WorkspaceTypeBadge | Same as status badge but accent at 12% bg, full accent text. |
| Avatar | Circle, 1px border. Sizes 24/32/40/56/80. Default: initials on neutral grey. |
| TabBar | bgElevated, top border, height 64 + safe area. Active accent.primary, inactive textMuted. |
| ModalSheet | bgElevated, top radius xl, drag handle 36x4 in borderStrong. |
| Drawer (right) | bgElevated, full height, 90% width on phones. |
| Toast | bgCard, 1px border, radius lg, drop shadow always for visibility. |

## 5. Iconography

`lucide-react-native` only. Default 20px, tab bar 26px, large feature 32px. Stroke width 1.75 body, 2 tab bar.

## 6. Motion

| Interaction | Spec |
|-------------|------|
| Stack push | 280ms default |
| Modal sheet | Spring damping 20, stiffness 220 |
| Drawer | 250ms ease-out |
| Tag select | Scale 0.96 -> 1.0 |
| Status change | Crossfade 200ms |
| Tab change | Color transition 150ms only |

Respect `AccessibilityInfo.isReduceMotionEnabled()`.

## 7. Light + dark parity rules

- Toggle theme on every screen during review
- Status colors stay identical across themes
- Empty state icons use textMuted token
- Brand logos in tenant lists get a 1px border so light logos do not vanish on light bg
