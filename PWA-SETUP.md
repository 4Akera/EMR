# PWA Setup Guide

## Overview
This application is now configured as a Progressive Web App (PWA), making it installable on devices and capable of working offline.

## What's Been Added

### 1. PWA Manifest (`/public/manifest.json`)
- Defines app metadata, icons, and display preferences
- Theme color: `#0ea5e9` (blue)
- Display mode: standalone (appears like a native app)

### 2. Service Worker (`/public/sw.js`)
- Enables offline functionality
- Caches important routes and assets
- Implements cache-first strategy with network fallback

### 3. PWA Metadata (in `src/app/layout.tsx`)
- Meta tags for mobile web app capabilities
- Service worker registration script
- Apple-specific PWA support

### 4. Next.js Configuration Updates
- Added headers for service worker and manifest
- Proper cache control settings

## Icon Setup

### Option 1: Use the Icon Generator (Recommended)
1. Open `/public/generate-icons.html` in your browser
2. Click "Download 192x192" to save `icon-192.png`
3. Click "Download 512x512" to save `icon-512.png`
4. Place both PNG files in the `/public` folder

### Option 2: Use ImageMagick
If you have ImageMagick installed:

```bash
cd public
convert -background none -size 192x192 favicon.svg icon-192.png
convert -background none -size 512x512 favicon.svg icon-512.png
```

### Option 3: Use an Online Converter
1. Visit a service like [CloudConvert](https://cloudconvert.com/svg-to-png)
2. Upload `/public/favicon.svg`
3. Set dimensions to 192x192 and 512x512
4. Download and save to `/public` folder

## Testing Your PWA

### Desktop (Chrome/Edge)
1. Run your app: `npm run dev`
2. Open Chrome DevTools (F12)
3. Go to "Application" tab → "Manifest"
4. Verify manifest loads correctly
5. Check "Service Workers" section for active worker
6. Click the install button in the address bar (if available)

### Mobile Testing
1. Deploy your app or use ngrok for local testing
2. Open in mobile browser (Chrome/Safari)
3. Look for "Add to Home Screen" prompt
4. Install and test offline functionality

### Lighthouse PWA Audit
1. Open Chrome DevTools
2. Go to "Lighthouse" tab
3. Select "Progressive Web App" category
4. Click "Generate report"
5. Aim for 90+ score

## Features

### Export Functionality
The encounter export now includes:
- **Copy to Clipboard**: Plain text copy
- **HTML Export**: Download formatted HTML file
- **PDF Export**: Download HTML (can be printed to PDF)

All export buttons are responsive:
- Desktop: Icon-only buttons
- Mobile: Icon + text labels

### Responsive Design
- The app uses Tailwind CSS breakpoints
- Export buttons adapt to screen size
- Service worker provides offline access to cached pages

## Browser Support

| Browser | Install PWA | Service Worker | Offline |
|---------|-------------|----------------|---------|
| Chrome (Desktop) | ✅ | ✅ | ✅ |
| Edge (Desktop) | ✅ | ✅ | ✅ |
| Safari (Desktop) | ⚠️ Limited | ✅ | ✅ |
| Chrome (Mobile) | ✅ | ✅ | ✅ |
| Safari (iOS) | ✅ | ✅ | ✅ |
| Firefox | ⚠️ Limited | ✅ | ✅ |

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Ensure HTTPS (or localhost)
- Clear browser cache and reload
- Check Next.js headers configuration

### Icons Not Showing
- Verify PNG files exist in `/public`
- Check file sizes (192x192 and 512x512)
- Clear manifest cache in DevTools
- Re-install the PWA

### Offline Mode Not Working
- Check service worker is active
- Verify cached routes in DevTools → Application → Cache Storage
- Test by going offline in DevTools → Network tab

## Deployment Notes

### Production Checklist
- [ ] Generate and add icon PNG files
- [ ] Test PWA installation on multiple devices
- [ ] Run Lighthouse audit
- [ ] Configure HTTPS (required for PWA)
- [ ] Test offline functionality
- [ ] Add splash screens (optional)
- [ ] Configure app screenshots in manifest

### Vercel Deployment
PWA features work automatically on Vercel with HTTPS enabled.

### Custom Server
Ensure your server:
- Serves over HTTPS
- Sends correct headers for service worker
- Serves manifest.json with proper MIME type

## Updates & Maintenance

### Updating the Service Worker
When you update `sw.js`:
1. Increment `CACHE_NAME` version (e.g., `'emr-v2'`)
2. Update `urlsToCache` if routes changed
3. Users will get the update on next visit
4. Old cache versions are automatically cleaned up

### Adding New Routes
Add new routes to the `urlsToCache` array in `sw.js`:

```javascript
const urlsToCache = [
  '/',
  '/login',
  '/patients',
  '/encounters',
  '/profile',
  '/your-new-route'  // Add here
];
```

## Resources
- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev: PWA](https://web.dev/progressive-web-apps/)
- [Next.js PWA Guide](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)

