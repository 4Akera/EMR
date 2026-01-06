# Testing Your PWA

## Quick Test Checklist

### 1. Verify Files Exist
```bash
ls -la public/manifest.json
ls -la public/sw.js
ls -la public/generate-icons.html
```

### 2. Generate Icons
Before testing, generate the PWA icons:

**Using the browser tool:**
1. Open `http://localhost:3000/generate-icons.html`
2. Download both icons
3. Save to `public/` folder

**Or using the script:**
```bash
npm install --save-dev sharp
npm run generate-icons
```

### 3. Start the Development Server
```bash
npm run dev
```

### 4. Test in Chrome DevTools

1. Open [http://localhost:3000](http://localhost:3000)
2. Press `F12` to open DevTools
3. Go to **Application** tab

#### Check Manifest
- Click "Manifest" in the left sidebar
- Verify all fields are populated
- Check that icons show up (if generated)

#### Check Service Worker
- Click "Service Workers" in the left sidebar
- You should see `sw.js` registered
- Status should be "activated and is running"
- Try clicking "Offline" checkbox
- Navigate between pages - should still work

#### Check Storage
- Click "Storage" → "Cache Storage"
- You should see `emr-v1` cache
- Check that pages are cached

### 5. Test Installation

#### Desktop
1. Look for the install button (⊕) in the address bar
2. Click it to install
3. App should open in a standalone window
4. Check that it appears in your applications

#### Mobile (Using ngrok or deployed site)
1. Install ngrok: `npm install -g ngrok`
2. In one terminal: `npm run dev`
3. In another: `ngrok http 3000`
4. Open the ngrok URL on your mobile device
5. Add to Home Screen
6. Launch and test

### 6. Test Responsive Design

#### Browser DevTools
1. Press `F12`
2. Click device toolbar icon (or `Ctrl+Shift+M`)
3. Test these breakpoints:
   - Mobile: 375px (iPhone)
   - Tablet: 768px (iPad)
   - Desktop: 1440px

#### Check These Elements
- [ ] Navigation works on mobile
- [ ] Buttons are tap-friendly (44px min)
- [ ] Tables are scrollable on mobile
- [ ] Forms are usable on small screens
- [ ] Export buttons show text on mobile

### 7. Test Export Features

Navigate to an encounter page:

#### Copy Feature
1. Click the Copy button
2. Should see "Copied!" confirmation
3. Paste somewhere - should have encounter text

#### HTML Export
1. Click the HTML button
2. HTML file should download
3. Open the file in browser
4. Should see beautifully formatted encounter

#### PDF Export
1. Click the PDF button
2. HTML file should download
3. Open the file in browser
4. Click "Print to PDF" button
5. Use browser's print dialog to save as PDF

### 8. Test Offline Mode

#### In Chrome DevTools
1. Go to **Application** → **Service Workers**
2. Check "Offline" box
3. Navigate to different pages
4. Should see cached pages load
5. New API calls will fail gracefully

#### Real Offline Test
1. Install the PWA
2. Turn off WiFi
3. Launch the PWA
4. Previously visited pages should load

### 9. Lighthouse Audit

1. Open DevTools → **Lighthouse** tab
2. Select these categories:
   - ✅ Progressive Web App
   - ✅ Performance
   - ✅ Accessibility
   - ✅ Best Practices
3. Click "Analyze page load"
4. Review results

**Target Scores:**
- PWA: 90+ (100 with icons generated)
- Performance: 80+
- Accessibility: 90+
- Best Practices: 90+

### 10. Test on Real Devices

#### iOS (Safari)
- [ ] Open in Safari
- [ ] Tap Share → Add to Home Screen
- [ ] Launch from home screen
- [ ] Test offline functionality
- [ ] Check status bar appearance

#### Android (Chrome)
- [ ] Open in Chrome
- [ ] See "Add to Home Screen" banner
- [ ] Install the app
- [ ] Launch from home screen
- [ ] Test offline functionality

## Common Issues

### Service Worker Not Registering
**Problem:** Console shows SW registration failed  
**Solution:**
- Must use HTTPS or localhost
- Check for JS errors in console
- Verify `sw.js` is accessible at `/sw.js`

### Icons Not Showing
**Problem:** Manifest shows broken icon images  
**Solution:**
- Generate icons using `generate-icons.html`
- Verify files exist: `ls public/icon-*.png`
- Hard refresh: `Ctrl+Shift+R`

### Install Button Not Appearing
**Problem:** No install prompt in address bar  
**Solution:**
- Check Lighthouse PWA score
- Ensure icons are present
- Must be HTTPS (or localhost)
- Some browsers don't show prompt if already installed

### Offline Mode Not Working
**Problem:** Pages don't load when offline  
**Solution:**
- Check Service Worker is activated
- Visit pages first while online (to cache them)
- Check Cache Storage in DevTools
- Increment cache version in `sw.js` and reload

### Export Buttons Too Small on Mobile
**Problem:** Hard to tap export buttons  
**Solution:**
- Buttons should show text on mobile (< 768px)
- Check that `md:hidden` and `flex md:hidden` classes are working
- Minimum tap target: 44x44px

## Success Criteria

✅ **PWA is ready when:**
- [ ] Lighthouse PWA score is 90+
- [ ] Service Worker is registered and active
- [ ] Icons are generated and showing in manifest
- [ ] App can be installed on desktop and mobile
- [ ] Previously visited pages work offline
- [ ] Export features work (Copy, HTML, PDF)
- [ ] Responsive design works on all breakpoints
- [ ] No console errors

## Next Steps

Once testing is complete:
1. Deploy to production (Vercel, Netlify, etc.)
2. Test on production URL
3. Share with users
4. Monitor Service Worker updates
5. Collect feedback on PWA experience








