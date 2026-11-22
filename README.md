# Programming Chapters Archive — v4

Interactive portal for displaying student programming certificates.
**Dr. Walaa El-Masry** — Programming & AI. Static site, no database — ready for GitHub Pages.

## Features
- Dark / Light mode · 7-chapter system · search · modal viewer (prev / next / arrows / click-to-zoom)
- **Share button on every certificate** — link = chapter number + student name: `#chapter-2/hana-mohamed`
  (copy, WhatsApp, Telegram, Facebook, native share)
- **Links hub** (`#links`): contact links + every chapter and every student link, each with a copy button
- Per chapter: copy chapter link, copy all student links, sort A→Z / Z→A,
  grid / list view, favorites (saved in the browser), chapter filter (all / available / upcoming)
- Animations: count-up stats, scroll reveal, 3D tilt + shine on cards, slide transitions, ripple, toasts

## New in v4 (design + options)
- **Premium design**: stronger glassmorphism, glow cards, floating orbs on intro, refined shadows
- **A–Z letter filter** on each chapter (quick jump to students by first letter)
- **Compact / Comfortable density** toggle
- **Multi-chapter badge** ★ for students who appear in more than one chapter
- **Keyboard shortcuts help** (`?` or the **?** button top-left)
- Shortcuts: `/` search · `T` theme · `A` accent · `C` confetti · `S` share · `F` fullscreen · `Esc` close
- Accent color switcher 🎨 · confetti 🎉 · scroll progress · back-to-top

## Add new certificates each month
1. Put images in `assets/images/certificates/chapter-XX/`
2. Add the student in `js/chapters.js` and set the chapter status to `"completed"`
3. Done — the share link is generated automatically from the student name
   (optional: set `slug: "custom-name"` on a student to override it)

## Add / change links
Edit `js/links.js` (groups of links shown in the Links hub).
