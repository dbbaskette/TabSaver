# TabSaver Design System

## Direction

**Style:** Dark Glassmorphism
**Mood:** Modern, clean, professional with depth and transparency effects

---

## Spacing

**Base:** 2px

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 2px | Minimal gaps, fine adjustments |
| `space-2` | 4px | Tight spacing, small gaps |
| `space-3` | 6px | Default small padding/gaps |
| `space-4` | 8px | Standard padding, common gaps |
| `space-6` | 12px | Medium spacing, section gaps |
| `space-8` | 16px | Large spacing, card padding |
| `space-10` | 20px | Extra padding, major sections |
| `space-12` | 24px | Large containers |
| `space-16` | 32px | Modal padding, large containers |
| `space-24` | 48px | Empty/loading state centering |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-xs` | 3px | Favicons, tiny elements |
| `radius-sm` | 4px | Checkboxes, progress bars |
| `radius-md` | 6px | Inputs, small buttons |
| `radius-lg` | 8px | Action buttons, small panels |
| `radius-xl` | 10px | Sidebar buttons, glass panels |
| `radius-2xl` | 12px | Cards, sections, badges |
| `radius-3xl` | 16px | Modals, status bar corners |
| `radius-4xl` | 20px | Main container |

---

## Colors

### Brand Colors
| Token | Value | Usage |
|-------|-------|-------|
| `primary` | #06b6d4 | Primary actions, highlights, borders |
| `primary-dark` | #0891b2 | Hover states |
| `primary-darker` | #0e7490 | Active states |

### Semantic Colors
| Token | Value | Usage |
|-------|-------|-------|
| `success` | #22c55e | Success messages, save actions |
| `success-dark` | #16a34a | Hover states |
| `error` | #ef4444 | Error messages, destructive actions |
| `error-dark` | #dc2626 | Hover states |
| `warning` | #f59e0b | Warnings, save & close |
| `warning-dark` | #d97706 | Hover states |
| `info` | #38bdf8 | Info, freeze actions |
| `info-dark` | #0ea5e9 | Hover states |

### Background Colors (Slate scale)
| Token | Value | Usage |
|-------|-------|-------|
| `bg-darkest` | #0f172a | Deepest backgrounds |
| `bg-dark` | #1e293b | Standard dark backgrounds |
| `bg-medium` | #334155 | Lighter panels |
| `bg-light` | #475569 | Subtle highlights |

### Text Colors
| Token | Value | Usage |
|-------|-------|-------|
| `text-primary` | #ffffff | Primary text |
| `text-secondary` | #94a3b8 | Secondary text, labels |
| `text-muted` | #64748b | Muted text, metadata |
| `text-subtle` | rgba(255,255,255,0.6) | URLs, hints |
| `text-faint` | rgba(255,255,255,0.7) | Dimmed content |

### State Colors
| Token | Value | Usage |
|-------|-------|-------|
| `frozen` | #7dd3fc | Frozen tab text |
| `frozen-bg` | rgba(56, 189, 248, 0.08) | Frozen row background |

### Button Accent Colors

| Token | Value | Usage |
|-------|-------|-------|
| `accent-blue` | #3b82f6 | Archive button |
| `accent-purple` | #d8b4fe | Dedupe button |
| `accent-orange` | #fb923c | Thaw button |
| `accent-gray` | #6b7280 | Refresh button |
| `accent-gray-light` | #9ca3af | Back button |

### Extended Text Colors

| Token | Value | Usage |
|-------|-------|-------|
| `text-light` | #e2e8f0 | Lighter text for dashboard |

---

## Typography

**Font Stack:** `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif`

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-xs` | 10px | 600 | Labels, uppercase text |
| `text-sm` | 11px | 400 | URLs, metadata, small details |
| `text-base` | 12px | 400-600 | Body text, status messages |
| `text-md` | 13px | 600 | Tab titles, standard content |
| `text-lg` | 14px | 400-600 | Medium text, buttons |
| `text-xl` | 16px | 700 | Card titles, icons |
| `text-2xl` | 18px | 700 | H2, section headers |
| `text-3xl` | 24px | 700 | Large stat values |

**Letter Spacing:** 0.5px for uppercase labels

---

## Depth (Glassmorphism)

### Glass Panel Effect
```css
background: linear-gradient(135deg, rgba(51, 65, 85, 0.8), rgba(30, 41, 59, 0.9));
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(6, 182, 212, 0.2);
```

### Glass Container (Main wrapper)
```css
background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9), rgba(51, 65, 85, 0.85));
backdrop-filter: blur(20px);
border: 1px solid rgba(6, 182, 212, 0.3);
box-shadow:
  0 20px 40px rgba(0, 0, 0, 0.4),
  0 8px 16px rgba(0, 0, 0, 0.2),
  inset 0 1px 0 rgba(6, 182, 212, 0.2);
```

### Shadow Scale
| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | 0 2px 4px rgba(0,0,0,0.2) | Subtle depth |
| `shadow-md` | 0 4px 12px rgba(0,0,0,0.2) | Buttons, icons |
| `shadow-lg` | 0 8px 24px rgba(0,0,0,0.3) | Cards hover |
| `shadow-xl` | 0 8px 32px rgba(0,0,0,0.3) | Panels |
| `shadow-2xl` | 0 20px 40px rgba(0,0,0,0.4) | Containers |

---

## Components

### Sidebar Button (Vertical)
```css
display: flex;
flex-direction: column;
align-items: center;
gap: 2px;
padding: 8px 6px;
border: 1px solid rgba(6, 182, 212, 0.2);
border-radius: 10px;
background: linear-gradient(135deg, rgba(51, 65, 85, 0.9), rgba(30, 41, 59, 0.9));
backdrop-filter: blur(12px);
font-size: 11px;
font-weight: 600;
```

### Action Button (Horizontal)
```css
display: flex;
align-items: center;
gap: 6px;
padding: 8px 12px;
border: 1px solid;
border-radius: 8px;
font-size: 12px;
font-weight: 600;
```

### Card
```css
background: linear-gradient(135deg, rgba(51, 65, 85, 0.8), rgba(30, 41, 59, 0.8));
border: 1px solid rgba(6, 182, 212, 0.2);
border-radius: 12px;
padding: 16px-20px;
```

### Input Field
```css
padding: 6px;
border: 1px solid rgba(6, 182, 212, 0.3);
border-radius: 6px;
background: rgba(51, 65, 85, 0.8);
backdrop-filter: blur(8px);
font-size: 10px;
```

### Checkbox
```css
width: 16px;
height: 16px;
border: 2px solid rgba(6, 182, 212, 0.5);
border-radius: 4px;
background: rgba(51, 65, 85, 0.8);
```

### Badge
```css
padding: 4px 10px;
background: rgba(6, 182, 212, 0.2);
border: 1px solid rgba(6, 182, 212, 0.3);
border-radius: 12px;
font-size: 12px;
font-weight: 600;
```

### Status Bar
```css
height: 28px;
background: linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(15, 23, 42, 0.9));
backdrop-filter: blur(12px);
border-top: 1px solid rgba(6, 182, 212, 0.3);
border-radius: 0 0 16px 16px;
font-size: 12px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.5px;
```

---

## Transitions

| Usage | Value |
|-------|-------|
| Default | `all 0.2s ease` |
| Buttons/Cards | `all 0.3s ease` |

---

## Hover Effects

### Button Hover
```css
transform: translateY(-2px) scale(1.02);
box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
border-color: rgba(6, 182, 212, 0.4);
```

### Card Hover
```css
transform: translateY(-2px);
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
border-color: rgba(6, 182, 212, 0.4);
```

---

## Constraints

- **Max popup size:** 800px x 600px (Chrome limitation)
- **Sidebar width:** 115px
- **Table max-height:** 440px
- **Status bar height:** 28px
