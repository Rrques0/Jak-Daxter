# 🌿 Daxter Browse — Dark Eco Download Browser

A Jak & Daxter themed download browser. Feed it any URL with a download listing and it scrapes titles, images, and links into a beautiful card grid.

## Requirements
- Node.js 16+ (https://nodejs.org)

## Setup & Run

1. Open a terminal in this folder
2. Install dependencies (first time only):
   ```
   npm install
   ```
3. Start the server:
   ```
   node server.js
   ```
4. Open your browser to:
   ```
   http://localhost:3847
   ```

## Usage
- Paste any download page URL into the input bar
- Hit **Scan** or press Enter
- Browse results with images, titles, and direct links
- Use the filter box to search within results
- Click **Open Link** to go to the download
- Click the copy icon to copy the URL

## Example Sites That Work Well
- https://ubuntu.com/download/flavours
- https://www.linuxmint.com/download.php
- https://www.7-zip.org/download.html
- https://www.videolan.org/vlc/
- https://www.ventoy.net/en/download.html
- https://portableapps.com/apps

## Notes
- Some sites block scraping via CORS or bot detection — try different pages if a scan returns nothing
- The scraper is smart: it tries multiple strategies to find download cards with images
- Works best on pages where downloads are listed in a card/grid/list format with thumbnails
