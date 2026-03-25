# Responsive & Mobile-First Checklist

## Breakpoint Targets
- `xs` / mobile: `<640px`
- `sm`: `>=640px`
- `md`: `>=768px`
- `lg`: `>=1024px`
- `xl`: `>=1280px`
- `2xl`: `>=1536px`

## Global UI
- [x] `Navbar`: mobile hamburger menu, desktop menu, globe language switch, touch target >=44px
- [x] `Footer`: wrapped links, centered text on mobile, touch target >=44px on nav links
- [x] `FloatingChat`: primary/open buttons >=44px and mobile-safe placement
- [x] Touch target baseline: icon/buttons adjusted to `min-h-11` / `min-w-11` in key nav areas

## Pages Audit
- [x] `/` Home: responsive hero typography and category card spacing
- [x] `/about`: responsive title/subtitle and member card paddings
- [x] `/portfolio`: responsive heading and album card grid
- [x] `/portfolio/[albumId]`: responsive heading, modal controls wrap, Next 16 params compatibility
- [x] `/download`: responsive heading and event card spacing
- [x] `/download/[folderId]`: Pinterest masonry, infinite scroll, filter sidebar (desktop), filter drawer (mobile)
- [x] `/contact`: responsive heading, social links wrap, touch-sized social icons
- [x] `/gallery`: placeholder page (no responsive issues in current minimal content)
- [x] `/admin/login`: form already single-column responsive
- [x] `/admin`: forms and album grid responsive (`1/2/3` columns)

## Mobile-First Patterns Implemented
- [x] Hamburger navigation for small screens
- [x] Globe-trigger language switch (desktop + mobile)
- [x] Sidebar/filter pattern: desktop sidebar + mobile slide-over drawer on gallery page
- [x] Progressive loading (50 items/page) + infinite scroll on heavy gallery page

## Performance/UX Notes
- [x] Gallery API pagination (`pageSize`, `pageToken`) enabled
- [x] Gallery image metadata (`width`, `height`) used for masonry stability
- [x] Gallery ordering preserved by filename numeric descending

## Manual QA Pass (recommended)
- [ ] Verify navigation + language switch on real mobile device
- [ ] Verify gallery filter drawer close/open gestures and focus flow
- [ ] Verify long Thai/English labels do not overflow at `xs`
- [ ] Verify all primary taps are comfortable one-handed
