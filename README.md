# SchoolTimer

A beautiful, real-time school schedule timer built with React and Vite. See exactly how much time you have left in each block, what's coming next, and customize everything.

![School Timer Screenshot](src/assets/hero.png)

## Features

- **Live Countdown** — Big, bold countdown showing remaining time in the current block
- **Next Block Preview** — Always know what's coming up next and after that
- **Progress Bar** — Visual indicator of how far through the current block you are
- **Auto Day Detection** — Automatically switches between Mon–Thu and Friday schedules
- **Built-in Schedules** — Default Mon–Thu and Friday schedules included out of the box
- **Custom Schedule Builder** — Create your own schedule with the built-in builder (saved to localStorage)
- **7 Themes** — Latte, Rose, Amber, Sage, Sky, Lavender, and Midnight
- **Settings Panel** — Toggle sound, notifications, schedule source, and fullscreen mode
- **Persistent Everything** — Theme, schedule, and settings all saved to localStorage
- **Weekend Detection** — Shows a weekend message on Saturdays and Sundays
- **Responsive Design** — Works on desktop, tablet, and mobile
- **Glassmorphism UI** — Clean, modern floating glass panels with blur effects

## Tech Stack

- React 19
- Vite 8
- CSS with custom properties and glassmorphism effects
- No external UI libraries — pure CSS

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## Project Structure

```
schooltimer/
├── index.html              # Entry HTML
├── package.json            # Dependencies & scripts
├── vite.config.js          # Vite configuration
├── src/
│   ├── main.jsx            # React entry point
│   ├── App.jsx             # Main app component (all logic)
│   ├── App.css             # Component styles
│   ├── index.css           # Global styles, themes, animations
│   └── assets/
│       ├── hero.png        # Screenshot
│       └── react.svg
└── public/
    ├── icons.svg
    └── favicon.svg
```

## How It Works

- The app ticks every second using `setInterval`
- Compares current time against schedule blocks to determine state: `before`, `block`, `break`, `after`, or `weekend`
- Progress fill is calculated as `elapsed / duration * 100`
- Custom schedules are stored in `localStorage` and persist across sessions
- Changing the theme updates CSS custom properties on `:root`, which reactively restyles the entire app

## Customization

To change the default schedule, edit the `defaultSchedules` object in `src/App.jsx`:

```js
const defaultSchedules = {
  mondayThursday: [
    ["Block 1", "08:58", "09:53"],
    ["Block 2", "09:56", "10:51"],
    // ...
  ],
  friday: [
    ["Block 1", "08:35", "09:15"],
    // ...
  ]
}
```

To add or modify themes, edit the `themes` object in `src/App.jsx` and the corresponding `--accent`, `--bg1`, etc. CSS variables.
