# Minesweeper - Classic Puzzle Game

A modern, fully-featured implementation of the classic Minesweeper puzzle game with support for three difficulty levels, progressive web app (PWA) capabilities, and 12-language internationalization.

## Features

### Gameplay
- **3 Difficulty Levels**
  - Beginner: 9×9 grid with 10 mines
  - Intermediate: 16×16 grid with 40 mines
  - Expert: 30×16 grid with 99 mines

- **Core Game Mechanics**
  - Left-click to reveal cells
  - Right-click or long-press to flag suspected mines
  - Auto-reveal adjacent safe cells when clicking empty cell (flood fill)
  - First click always safe (mines placed after first move)
  - Timer and remaining mine counter

- **Visual Feedback**
  - Color-coded numbers (1-8) for adjacent mine count
  - Smooth animations for cell reveals
  - Game over modal with statistics
  - Victory celebration with confetti effect
  - Best time leaderboard per difficulty

### User Experience
- **2026 Modern UI**
  - Glassmorphism design with backdrop blur effects
  - Dark mode by default (#0f0f23 background)
  - Smooth transitions and microinteractions
  - Responsive grid layout for all screen sizes

- **Accessibility**
  - WCAG 2.1 AA compliant
  - 44px minimum touch targets
  - Keyboard support (Enter to click, F to flag)
  - Focus indicators and proper semantic HTML
  - High color contrast ratios

- **Audio**
  - Web Audio API sound effects
  - Click, flag, explosion, and victory sounds
  - Toggle button for sound control

### Technology
- **PWA Ready**
  - Service Worker for offline capability
  - Web manifest with installation support
  - SVG icons for sharp display on all devices
  - Add to home screen on mobile

- **Internationalization (i18n)**
  - 12 supported languages:
    - Korean (한국어)
    - English
    - Japanese (日本語)
    - Chinese (中文)
    - Spanish (Español)
    - Portuguese (Português)
    - Indonesian (Bahasa Indonesia)
    - Turkish (Türkçe)
    - German (Deutsch)
    - French (Français)
    - Hindi (हिन्दी)
    - Russian (Русский)
  - Auto language detection
  - Persistent language preference

- **SEO Optimized**
  - Schema.org VideoGame markup
  - Open Graph social sharing tags
  - hreflang multilingual tags
  - Meta descriptions and keywords

### Analytics & Monetization
- Google Analytics 4 integration (GA4)
- Google AdSense ad placements
  - Top banner ad
  - Bottom banner ad
- Game event tracking

## Project Structure

```
minesweeper/
├── index.html              # Main HTML with ad slots and language selector
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker for offline support
├── icon-192.svg            # PWA icon (192x192)
├── icon-512.svg            # PWA icon (512x512)
├── css/
│   └── style.css          # All styling (dark mode first)
├── js/
│   ├── app.js             # Core game logic and UI interaction
│   ├── i18n.js            # Internationalization handler
│   └── locales/
│       ├── ko.json        # Korean translations
│       ├── en.json        # English translations
│       ├── ja.json        # Japanese translations
│       ├── zh.json        # Chinese translations
│       ├── es.json        # Spanish translations
│       ├── pt.json        # Portuguese translations
│       ├── id.json        # Indonesian translations
│       ├── tr.json        # Turkish translations
│       ├── de.json        # German translations
│       ├── fr.json        # French translations
│       ├── hi.json        # Hindi translations
│       └── ru.json        # Russian translations
└── README.md              # This file
```

## How to Play

1. **Select Difficulty** - Choose from Beginner, Intermediate, or Expert
2. **First Click** - Click any cell (always safe on first move)
3. **Reveal Cells** - Click to reveal safe cells and numbers
4. **Flag Mines** - Right-click or long-press to flag suspected mines
5. **Win Condition** - Reveal all safe cells without hitting any mines
6. **Lose Condition** - Click on a mine and the game ends

### Game Tips
- Numbers indicate how many mines are in adjacent cells
- Empty cells with no adjacent mines auto-reveal surrounding cells
- Use flags to mark cells you think contain mines
- Watch the timer and remaining mine counter at the top

## Local Development

### Running Locally
```bash
# Navigate to project directory
cd minesweeper/

# Start a local HTTP server
python -m http.server 8000

# Open in browser
# http://localhost:8000
```

### Testing PWA Features
1. Open DevTools (F12)
2. Go to Application > Service Workers
3. Verify Service Worker is registered and active
4. Test offline by going offline in DevTools
5. Reload page - should work offline with cached assets

### Testing Internationalization
1. Click language selector (🌐 button)
2. Choose a language
3. Verify all UI text updates
4. Check localStorage for saved preference

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with PWA support

## Performance

- **Lazy Loading**: Languages loaded on demand
- **Service Worker Caching**: Core assets cached for instant loading
- **Image Optimization**: SVG icons for perfect scaling
- **Responsive Design**: Optimized for all screen sizes

## Accessibility Features

✓ Color contrast ratio ≥ 4.5:1
✓ Touch targets ≥ 44px × 44px
✓ Keyboard navigation support
✓ Semantic HTML structure
✓ Focus indicators
✓ ARIA labels on interactive elements
✓ Screen reader support

## Game Statistics

All best times are automatically saved to browser LocalStorage:
- `minesweeper-best-times`: JSON object with best times by difficulty
- `language`: Current selected language preference

## Credits

- Developed with vanilla JavaScript, HTML5, and CSS3
- No external dependencies
- Classic game mechanics from the original Minesweeper
- Modern UI inspired by 2026 design trends

## License

Copyright dopabrain.com. All rights reserved.

---

**Enjoy the game and test your logic skills!** 🎮
