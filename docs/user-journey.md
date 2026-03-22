# Geo / Site Planner — User Journey

A step-by-step walkthrough of every experience a user has from first opening the app to finishing a site plan.

---

## Stage 1 — Loading Screen

**What the user sees:**
The app opens on a full-screen branded loading screen. The background is the signature brand blue (`#615CE5`). Centred on screen is the Mide's Toolshed logo with the text "GEO" and "SITE" rendered in large, bold `CodeSaver` monospace typography in black. A subtle noise/grain overlay sits on top of the whole screen for texture.

**What happens:**
A timed fade-out animation plays automatically. Once the transition completes, the user is taken to the Landing Page — no interaction is needed.

---

## Stage 2 — Landing Page

**What the user sees:**
A light, near-white (`#FFFCFF`) full-screen landing page. The Mide's Toolshed logo and wordmark appear in brand purple (`#615CE5`) at the top. Centred on the page is a 3D globe rendered live via Mapbox GL, displayed inside a circular ellipse frame with a 3px brand-purple border and a soft radial atmosphere glow. Below the globe is the tool name label.

**What happens:**
The globe continuously renders live satellite imagery. The user's only action on this screen is to **click the globe** to enter the Geo Site Planner. There are no navigation menus or onboarding prompts — the interaction is entirely visual and minimal.

> **Design Intention:** The landing page communicates what the tool does (site planning with real satellite maps) without any text explanation. The globe is the CTA.

---

## Stage 3 — The Planner Canvas

**What the user sees when they arrive:**
- A full-screen Mapbox satellite map starting at a global zoom level (zoom 0.5, centred at `[20, 0]`).
- A minimal floating header at the top: `GEO / SITEPLANNER` brand text on the left, the Mide's Toolshed logo (clickable back-home button) in the centre.
- A horizontal toolbar anchored 40px above the bottom-centre of the screen, containing: **Search (🔍)**, **CREATE ▼**, **SETTINGS ▼**, **FILES ▼**.
- A collapsed side panel on the right edge.

**The user is now free to explore the map.** No tutorial overlays. No modal gates.

---

## Stage 4 — Searching for a Location (Optional but Recommended)

**Trigger:** Click the magnifying glass icon in the toolbar.

**What happens:**
The toolbar animates: the three dropdown groups (CREATE, SETTINGS, FILES) collapse with a scale-X transition. The search bar expands to fill the toolbar width (466px). A Mapbox Geocoder input appears in the search bar with the placeholder text `SEARCH LOCATION...`.

**User types a location** (e.g. "Central Park, New York") and selects a result from the dropdown suggestions.

**Result:**
- The map flies (`flyTo`) to the searched location at zoom level 15 — close enough to see individual buildings and trees.
- A red Mapbox marker pin drops at the result coordinates.
- The `close-search` event is dispatched, and the search bar collapses, revealing the toolbar groups again.

> **Alternative — Paste Coordinates:** In the side panel, the user can paste raw `lat, lng` coordinate pairs (one per line) to load a polygon directly. The map automatically flies to fit the shape.

> **Alternative — Load from File / URL:** A previously exported `.json` plan or a shared URL `?s=...` will auto-restore all pegs, style, and zoom to the saved site.

---

## Stage 5 — Creating a Site Layout (SET OUT)

**Trigger:** Click `CREATE ▼` → `SET OUT`.

**What happens:**
- The dropdown closes. The mode switches to `'polygon'`.
- The map cursor changes to a crosshair cursor.

**User clicks on the map up to 4 times**, placing pegs at corners of the site.

**Each click:**
- A numbered **white square peg marker** (`peg-marker`) appears at the clicked location on the map.
- The marker is draggable — the user can reposition any peg after placing it.
- Right-clicking a marker deletes it from the polygon.

**After 2+ pegs are placed:**
- White outline lines are drawn between consecutive pegs using a Mapbox GeoJSON layer (`area-outline`).
- **Edge distance labels** appear along each line segment, showing the length in the selected unit (FEET by default).

**After 3+ pegs:**
- A closed polygon is formed (the last edge connects back to peg 1).
- A **semi-transparent white fill** (`fillOpacity: 0.2`) is applied inside the polygon.
- The **Site Analysis side panel opens automatically** on the right.

---

## Stage 6 — Measuring a Distance (MEASURE)

**Trigger:** Click `CREATE ▼` → `MEASURE`.

**What happens:**
- Mode switches to `'ruler'`.
- The user places exactly **2 points** on the map.
- A dashed orange measurement line (`#ff5722`) is drawn between the two points.
- A distance label appears along the line in the active unit.
- The **side panel opens automatically** showing the measured distance.

---

## Stage 7 — Reading the Site Analysis Panel

**What the panel shows** (after SET OUT with 3+ points):

| Section | Content |
|---|---|
| **Site Details** | Plan name (editable), number of pegs, bounding box |
| **Area** | Calculated polygon area in the selected unit |
| **Perimeter** | Total perimeter length |
| **Vertex Coordinates** | `Lat, Lng` for each peg, listed and copiable |
| **Solar Path Overlay** | Toggle to show/hide the sun arc for the current day |
| **Solar Time Slider** | Scrub a time-of-day slider to see the sun position move |
| **Wind Rose** | Toggle to display the dominant wind direction fetched live from **NASA POWER API** |
| **History** | List of up to 50 previously saved plans (stored in `localStorage`) |
| **Coordinate Loader** | Paste raw coordinate data to load a new shape |

The panel is toggled by the eye icon button in the top-right corner of the map canvas. An `X` button at the top of the panel also closes it.

---

## Stage 8 — Adjusting Settings

**Trigger:** Click `SETTINGS ▼`.

**Options:**
| Option | Behaviour |
|---|---|
| **Dark Mode / Satellite** | Toggles the Mapbox map style between `satellite-v9` and `dark-v11`. |
| **Unit Selector** | Dropdown to change measurement units: MILLIMETER / CENTIMETER / INCHES / FEET. All existing distances on the map and in the panel update immediately. |

---

## Stage 9 — Saving and Sharing

**Trigger:** Click `FILES ▼`.

**Options:**
| Option | Behaviour |
|---|---|
| **SHARE LINK** | Compresses the full plan (pegs, style, unit, name) using `LZString` into a URL query param `?s=...`. Copies the link to the clipboard. Also saves the plan to `localStorage` history. |
| **EXPORT** | Downloads a `.json` file containing the plan data for offline backup or handoff. |
| **IMPORT** | Opens a file picker to load a previously exported `.json` plan file. The map flies to the site automatically. |

---

## Stage 10 — Clearing and Starting Over

**Trigger:** Click `CREATE ▼` → `CLEAR`.

**What happens:**
- All peg markers are removed from the map.
- GeoJSON lines, polygon fill, and distance labels are all cleared.
- The side panel data resets.
- The mode returns to `'none'`.
- The URL query string (`?s=...`) is removed from the browser history.
- Wind and solar overlays are cleared.

---

## Stage 11 — Going Home

**Trigger:** Click the Mide's Toolshed logo in the top-centre header.

**What happens:** The app navigates back to the Landing Page (`view = 'landing'`). The map instance and all state remain mounted in the background but are no longer visible.

---

## Flow Diagram

```
App Open
  └─► Loading Screen (auto-fades)
        └─► Landing Page
              └─► [Click Globe]
                    └─► Planner Canvas
                          ├─► [Search] ──► FlyTo Location
                          ├─► CREATE ─► SET OUT ──► Place Pegs ──► Polygon + Auto-open Panel
                          ├─► CREATE ─► MEASURE ──► 2 Points ──► Distance + Auto-open Panel
                          ├─► SETTINGS ─► Toggle Map Style / Unit
                          ├─► FILES ─► Share / Export / Import
                          └─► [Logo Click] ──► Landing Page
```
