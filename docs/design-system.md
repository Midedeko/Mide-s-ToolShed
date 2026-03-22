# Geo / Site Planner — UI Design System

A reference for all visual design decisions, tokens, and component patterns used in the application.

---

## 1. Design Philosophy

The Geo Site Planner uses a strict **monochromatic + glassmorphism** aesthetic influenced by high-end architectural and engineering tools. The visual language is intentionally sparse — the satellite map is the content; the UI must stay out of the way.

Key principles:
- **White on world.** The planner UI is pure white, black, and glass, so it works on top of any Mapbox style without colour clashes.
- **No rounded corners in the planner.** Square geometry (`border-radius: 0`) signals precision and professionalism (the Toolbar, Side Panel, dropdowns, and peg markers are all sharp-cornered).
- **Monospaced everything.** The `CodeSaver` typeface is used globally, reinforcing the tool's "technical instrument" character.
- **Minimal motion.** Transitions are short (0.1–0.3s) and functional — never decorative for its own sake.

---

## 2. Color Palette

### Global Tokens (`index.css` `:root`)

| Token | Value | Usage |
|---|---|---|
| `--brand-blue` | `#6366f1` | Interactive accents (hover on home button) |
| `--brand-blue-hover` | `#818cf8` | Hover states for brand-blue elements |
| `--brand-cyan` | `#38bdf8` | Side panel headings, solar arc, analysis highlights |
| `--brand-bg` | `#020617` | App-level background (dark slate) |
| `--glass-bg` | `rgba(0,0,0,0.2)` | Background for all glass surfaces |
| `--glass-border` | `rgba(255,255,255,0.5)` | Border for all glass surfaces |
| `--glass-blur` | `blur(7px)` | Backdrop blur for all glass surfaces |
| `--screen-padding` | `64px` | Standard horizontal edge padding |

### Context-Specific Colours

| Element | Colour | Notes |
|---|---|---|
| Loading screen background | `#615CE5` | Exact brand purple from Figma |
| Loading screen text | `#000000` | Black on purple |
| Landing page background | `#FFFCFF` | Near-white, warm-tinted |
| Landing page text / branding | `#615CE5` | Purple logo + wordmark |
| Globe ellipse frame | `#615CE5` | 3px border |
| Planner header branding | `#FFFFFF` | White text + white logo in `.white-branding` |
| Toolbar border | `#FFFFFF` (2px) | Hard white border, no softening |
| Measurement line | `#ff5722` | Orange-red dashed line |
| Measurement labels | `#ff5722` | Matches line colour |
| Set Out polygon fill | `#ffffff` at `opacity: 0.2` | White translucent fill |
| Set Out outline | `#ffffff` | White stroke |
| Peg markers (background) | `#ffffff` | White square |
| Peg markers (text/border) | `#000000` | Black number + border |
| Search result pin | `#ff0000` | Red Mapbox marker |
| Side panel fg | `#f1f5f9` | Light slate |
| Side panel heading | `#38bdf8` | Cyan accent |
| Side panel subheading | `#94a3b8` | Muted slate |

---

## 3. Typography

### Typeface

**`CodeSaver`** — a custom monospaced typeface, loaded via `@font-face` from `/assets/fonts/CodeSaver-Regular.otf`.

Applied globally to `body`, all `button` elements, the Toolbar, and the Geocoder input override. This is the **only** typeface used in the UI layer.

> Note: The Side Panel point list uses `JetBrains Mono` for its coordinate data display — a secondary monospaced typeface loaded from Google Fonts or the system.

### Type Scale

| Element | Size | Weight | Letter Spacing | Transform |
|---|---|---|---|---|
| Loading screen headline | `5.5rem` | 800 | `0.1em` | — |
| Landing tool name | `1.4rem` | 400 | `0.1em` | — |
| Landing tool info title | `1.2rem` | 400 | `0.2em` | — |
| Planner brand text | `1.1rem` | 500 | `0.5px` | — |
| Toolbar group labels | `0.8rem` | 500 | `0.15rem` | UPPERCASE |
| Dropdown button labels | `0.8rem` | 500 | `0.1rem` | UPPERCASE |
| Geocoder input | `0.85rem` | 400 | `0.1em` | UPPERCASE |
| Side panel h3 | `1.5rem` | 700 | — | — |
| Side panel h4 | `1.1rem` | — | `0.1em` | UPPERCASE |
| Side panel result value | `1.25rem` | — | — | — |
| Primary measurement result | `1.75rem` | 700 | — | — |

---

## 4. Spacing & Layout

### Global Layout

The app is always full-viewport: `width: 100vw; height: 100vh; overflow: hidden`. No scrolling at the page level.

### Layer Stack (z-index)

| Element | z-index |
|---|---|
| Loading screen | 1000 |
| Landing page | 500 |
| Side panel | 10 |
| Toolbar | 100 |
| Planner header | (positioned absolute, inherits stacking) |
| Map canvas | 0 (fills the view) |

### Toolbar

- **Position:** `absolute; bottom: 40px; left: 50%; transform: translateX(-50%)`
- **Height:** `45px` (fixed)
- **Border:** `2px solid white`
- **Sections:** Each group is `160px` wide. The search bar expands the toolbar to `466px` total.
- **No border-radius.** Sharp corners system-wide.

### Side Panel

- **Position:** `absolute; right: 40px; top: 90px`
- **Width:** `320px`
- **Entry animation:** `opacity: 0 → 1`, `transform: translateY(-10px) → translateY(0)`, eased with CSS `transition: all 0.3s ease`

### Screen Padding

All content respects `--screen-padding: 64px` from the left/right edges. The brand text and logo in the header are offset by this value.

---

## 5. Glassmorphism System

All floating UI panels share the same glass recipe:

```css
background: rgba(0, 0, 0, 0.2);       /* --glass-bg */
backdrop-filter: blur(7px);            /* --glass-blur */
-webkit-backdrop-filter: blur(7px);
border: 2px solid rgba(255,255,255,0.5); /* --glass-border */
```

This includes:
- The **Toolbar** and its **dropdown menus**
- The **Side Panel**
- The **Search trigger button**
- The **Search input container**

The geocoder suggestions dropdown uses a darker, more opaque glass (`#1e293b`) so it sits on top of the map without blending in.

---

## 6. Components

### Toolbar

**File:** `Toolbar.tsx`

Three dropdown groups — CREATE, SETTINGS, FILES — rendered in a row. Each group-label button is full-height with text + arrow indicator. Dropdowns open upward (`bottom: calc(100% + 6px)`).

**Modes:**
- **Default:** Shows the 3 groups + search icon.
- **Searching:** Groups collapse (width → 0, opacity → 0, scaleX → 0), search input expands.

**Button states:**
- Default: transparent bg, white text
- Hover / Active: white bg, black text (hard inversion)

**Custom icons (SVG React components):**
- `MeasureIcon`, `SetOutIcon`, `SateliteIcon`, `DarkmodeIcon`, `ExportIcon`, `ImportIcon`

### Peg Markers (Map)

**CSS class:** `.peg-marker`

```css
width: 24px;
height: 24px;
background: white;
color: black;
border: 2px solid black;
border-radius: 0;          /* Sharp square */
font-size: 12px;
font-weight: bold;
cursor: grab;
box-shadow: 0 0 10px rgba(0,0,0,0.5);
```

Numbers 1–N are rendered inside a `<span>` child. Draggable via Mapbox's native `draggable: true` marker option. Right-click to delete.

### Side Panel

**File:** `SidePanel.tsx`

Slides in from the right with `translateY` + `opacity` transition. Two tab sections: **DETAILS** and **HISTORY**. Uses the glassmorphism system. Toggle visibility via an eye icon button in the top-right corner of the screen (positioned absolutely over the map).

### Geocoder (Search)

The Mapbox GL Geocoder widget is embedded inside the toolbar's `#geocoder-dock` div. Its default Mapbox styles are overridden via CSS to strip border, background, and shadow, making it fully transparent inside the toolbar. The custom search icon replaces Mapbox's built-in icon.

---

## 7. Mapbox Layers

Custom Mapbox GL JS layers are added on `style.load`:

| Layer ID | Type | Purpose | Colour |
|---|---|---|---|
| `measurement-line` | `line` | Ruler distance line | `#ff5722` dashed |
| `measurement-labels` | `symbol` | Distance labels on ruler | `#ff5722` |
| `area-fill` | `fill` | Set Out polygon fill | `siteStyle.fillColor` at `siteStyle.fillOpacity` |
| `area-outline` | `line` | Set Out polygon border | `siteStyle.strokeColor` |
| `area-labels` | `symbol` | Edge distance labels | `#ffffff` |
| `solar-arc` | `line` | Sun path overlay | `#eab308` dashed |
| `sun-icon` | `circle` | Current sun position | `#fde047` (yellow) |
| `wind-rose` | `fill` | Wind direction wedge | `#38bdf8` (cyan) |

---

## 8. Animations & Motion

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Loading screen fade out | `opacity: 1 → 0` | `0.8s` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Globe hover | `scale(1.05)` | `0.4s ease-in-out` | — |
| Toolbar groups hide/show | `width`, `opacity`, `scaleX` | `0.3s` | linear |
| Dropdown open/close | `opacity`, `visibility` | `0.2s` | linear |
| Side panel show | `opacity`, `translateY(-10px)` | `0.3s ease` | — |
| All button hover | `background-color`, `color` | `0.1s ease-in-out` | — |
| Map flyTo | Mapbox built-in | ~1.5s | Mapbox easing |

---

## 9. Responsive Behaviour

The planner is desktop-first. Mobile adaptations exist in a `@media (max-width: 768px)` block:

- `--screen-padding` reduces significantly
- Side panel shrinks from `320px` to near-full width
- Toolbar groups reduce in size
- Panel font sizes reduce to `12–14px`
- Tab heights reduce to `40px`
- Brand text reduces to `0.6rem`

The loading and landing screens remain full-viewport and scale gracefully using `min()` CSS functions for the globe and orbit frame sizes.

---

## 10. CSS File Structure

| File | Purpose |
|---|---|
| `src/index.css` | Root variables, global reset, base button styles, scrollbar |
| `src/App.css` | All component-level styles: Loading, Landing, Toolbar, Side Panel, Map, Markers, Geocoder overrides, responsive media queries |

Styles are **not** component-scoped (no CSS Modules or styled-components). All styles live in the two flat CSS files above.
