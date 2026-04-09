const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Score a candidate element to determine if it's a download item
function scoreItem(title, href, img, desc) {
  let score = 0;
  if (title && title.length > 3) score += 10;
  if (href && href !== '#') score += 5;
  if (img) score += 8;
  if (desc && desc.length > 10) score += 4;
  // boost if looks like a real download link
  const dlPatterns = /\.(iso|zip|tar|gz|exe|img|torrent|deb|rpm|pkg)(\b|$)/i;
  if (href && dlPatterns.test(href)) score += 15;
  const dlWords = /download|release|install|setup|windows|linux|ubuntu|debian|arch|mint|fedora|edition|x64|x86|amd64/i;
  if (title && dlWords.test(title)) score += 6;
  if (href && dlWords.test(href)) score += 4;
  return score;
}

function resolveUrl(base, relative) {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

function cleanText(str) {
  return str ? str.replace(/\s+/g, ' ').trim() : '';
}

app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const { data: html, headers } = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      maxRedirects: 5,
    });

    const $ = cheerio.load(html);
    const baseUrl = new URL(url).origin;
    const pageTitle = cleanText($('title').text()) || url;

    const candidates = [];

    // Strategy 1: find <a> tags that wrap or are near <img>
    $('a').each((i, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      if (!href || href === '#' || href.startsWith('javascript')) return;

      const resolvedHref = resolveUrl(url, href);

      // image inside or near
      let img = null;
      const $img = $el.find('img').first();
      if ($img.length) {
        img = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src');
      }
      // check parent for image
      if (!img) {
        const $parentImg = $el.closest('article, div, li, section').find('img').first();
        if ($parentImg.length) {
          img = $parentImg.attr('src') || $parentImg.attr('data-src');
        }
      }
      if (img) img = resolveUrl(url, img);

      // title
      const title = cleanText(
        $el.attr('title') ||
        $el.find('h1,h2,h3,h4,h5,strong,b,.title,.name').first().text() ||
        $el.text()
      ).slice(0, 150);

      // description - look in parent container
      let desc = '';
      const $container = $el.closest('article, .entry, .item, li, .card, .post, div[class*="item"], div[class*="card"], div[class*="entry"]');
      if ($container.length) {
        desc = cleanText(
          $container.find('p, .desc, .description, .excerpt, .summary').first().text()
        ).slice(0, 300);
      }

      const score = scoreItem(title, resolvedHref, img, desc);
      if (score >= 10) {
        candidates.push({ title, href: resolvedHref, img, desc, score });
      }
    });

    // Strategy 2: structured article/card elements
    $('article, .entry, .item, .card, .post, li.download, div[class*="item"]').each((i, el) => {
      const $el = $(el);
      const $link = $el.find('a').first();
      if (!$link.length) return;

      const href = resolveUrl(url, $link.attr('href') || '');
      if (!href || href === url) return;

      const $img = $el.find('img').first();
      const img = $img.length
        ? resolveUrl(url, $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || '')
        : null;

      const title = cleanText(
        $el.find('h1,h2,h3,h4,h5,.title,.name,strong').first().text() ||
        $link.text()
      ).slice(0, 150);

      const desc = cleanText(
        $el.find('p,.desc,.description,.excerpt,.summary').first().text()
      ).slice(0, 300);

      const score = scoreItem(title, href, img, desc);
      if (score >= 10 && !candidates.find(c => c.href === href)) {
        candidates.push({ title, href, img, desc, score });
      }
    });

    // Sort by score, dedupe, limit
    const seen = new Set();
    const items = candidates
      .sort((a, b) => b.score - a.score)
      .filter(item => {
        if (!item.title || item.title.length < 2) return false;
        if (seen.has(item.href)) return false;
        seen.add(item.href);
        return true;
      })
      .slice(0, 60)
      .map(({ score, ...rest }) => rest);

    res.json({ pageTitle, items, count: items.length });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: `Scrape failed: ${err.message}` });
  }
});

const PORT = process.env.PORT || 3847;
app.listen(PORT, () => {
  console.log(`\n🌿 Daxter Download Browser running at http://localhost:${PORT}\n`);
});
