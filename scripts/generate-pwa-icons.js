#!/usr/bin/env node

/**
 * PWA Icon Generator Script
 * 
 * This script generates PWA icons from the favicon.svg
 * Requires: sharp npm package
 * 
 * Usage:
 *   npm install sharp
 *   node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    // Try to import sharp
    const sharp = await import('sharp').catch(() => null);
    
    if (!sharp) {
      console.log('\n⚠️  Sharp is not installed.');
      console.log('\nTo generate icons automatically, run:');
      console.log('  npm install --save-dev sharp\n');
      console.log('Or use the browser-based generator:');
      console.log('  Open public/generate-icons.html in your browser\n');
      return;
    }

    const inputSvg = path.join(__dirname, '../public/favicon.svg');
    const sizes = [192, 512];

    console.log('🎨 Generating PWA icons...\n');

    for (const size of sizes) {
      const outputPath = path.join(__dirname, `../public/icon-${size}.png`);
      
      await sharp.default(inputSvg)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated: icon-${size}.png`);
    }

    console.log('\n✨ All icons generated successfully!\n');
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    console.log('\n💡 Alternative: Open public/generate-icons.html in your browser\n');
  }
}

generateIcons();



