# SEO Meta Tags - OG Images Guide

## Overview
This document explains the Open Graph (OG) images used for social media previews and SEO.

## Required OG Images

The application expects the following OG images to be placed in the root directory:

### 1. Default Images
- **`og-image.png`** (1200x630px)
  - Default image for all pages
  - Should represent the Stock Analysis Platform brand
  - Used for: Legal pages, default fallback

### 2. Page-Specific Images
- **`og-image-market.png`** (1200x630px)
  - Market Overview page
  - Should show market data visualization or dashboard

- **`og-image-stock.png`** (1200x630px)
  - Stock Analysis pages (dynamic with symbol parameter)
  - Can be a template that works for all stocks
  - URL format: `/og-image-stock.png?symbol=AAPL`

- **`og-image-watchlist.png`** (1200x630px)
  - Watchlist page
  - Should represent portfolio tracking

- **`og-image-comparison.png`** (1200x630px)
  - Stock Comparison page
  - Should show comparison/analysis concept

- **`og-image-backtesting.png`** (1200x630px)
  - Backtesting Engine pages
  - Should represent strategy testing/analysis

- **`og-image-portfolio.png`** (1200x630px)
  - Portfolio Tracking page
  - Should represent portfolio management

- **`og-image-calendar.png`** (1200x630px)
  - Economic Calendar page
  - Should represent calendar/events

### 3. Logo
- **`logo.png`** (512x512px recommended)
  - Used in structured data (Schema.org)
  - Should be square format
  - Used for organization branding

## Image Specifications

### Technical Requirements
- **Format**: PNG (recommended) or JPG
- **Dimensions**: 1200x630px (OG image standard)
- **File Size**: < 1MB (optimized for web)
- **Aspect Ratio**: 1.91:1 (1200:630)

### Design Guidelines
- Use high contrast for text readability
- Include brand colors (#4ea1f3 blue, #0b0f14 dark background)
- Keep text minimal and impactful
- Ensure images work in both light and dark mode contexts

## Dynamic Image Generation (Future Enhancement)

For stock-specific images, you can:
1. Create a server endpoint that generates images dynamically
2. Use a service like Cloudinary or Imgix
3. Use a template system to overlay stock symbols on base images

Example endpoint structure:
```
GET /api/og-image/stock?symbol=AAPL
→ Returns dynamically generated image with AAPL logo/info
```

## Current Implementation

The application automatically:
- Sets appropriate OG image URLs based on the current page
- Updates meta tags when navigating between pages
- Includes images in structured data (Schema.org)
- Provides fallback to default image if specific image not found

## Testing

Test your OG images using:
- **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
- **Twitter Card Validator**: https://cards-dev.twitter.com/validator
- **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/

## Notes

- Images are referenced with absolute URLs (including domain)
- If an image doesn't exist, social media platforms will show a generic preview
- It's recommended to create at least the default `og-image.png` before deployment

