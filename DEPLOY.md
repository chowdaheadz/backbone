# BACKBONE — Vite + Vercel Deployment Guide

## Project Structure

Set up your project exactly like this before pushing to GitHub:

```
backbone/
├── public/
│   └── vite.svg          ← (optional, can delete)
├── src/
│   ├── App.jsx           ← backbone-v3.jsx (rename/copy here)
│   └── main.jsx          ← see content below
├── index.html            ← see content below
├── vite.config.js        ← see content below
├── vercel.json           ← see content below
├── package.json          ← see content below
└── .gitignore            ← see content below
```

---

## File Contents

### package.json
```json
{
  "name": "backbone-tasks",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.2"
  }
}
```

### vite.config.js
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

### index.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Backbone — Chowdaheadz</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### src/main.jsx
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### vercel.json
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### .gitignore
```
node_modules
dist
.env
.env.local
.DS_Store
```

---

## Deploy Steps

1. Create the folder structure above on your machine
2. Copy `backbone-v3.jsx` → `src/App.jsx`
3. Create all the files above with the exact content shown
4. Run `npm install` in the project root
5. Run `npm run dev` to test locally — should open at http://localhost:5173
6. Push to GitHub
7. In Vercel: New Project → Import repo → Framework Preset: **Vite** → Deploy

### Vercel Build Settings (auto-detected with Vite preset)
| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Build Command | `vite build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

---

## Notes
- The `vercel.json` rewrites ensure direct URL navigation works (SPA routing)
- No environment variables needed — this is fully client-side
- All state is in-memory; add Vercel Postgres + API routes when you're ready to persist data
