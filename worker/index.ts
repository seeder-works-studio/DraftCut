import * as cheerio from 'cheerio';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/scrape') {
      return handleScrape(url);
    }
    if (url.pathname === '/api/proxy-image') {
      return handleProxyImage(url);
    }

    // Fall through to static assets (handled by Wrangler assets binding)
    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler;

async function handleScrape(reqUrl: URL): Promise<Response> {
  const targetUrl = reqUrl.searchParams.get('url');
  if (!targetUrl) {
    return Response.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
  } catch {
    return Response.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return Response.json({ error: `Failed to fetch: ${res.status}` }, { status: 502 });
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const baseUrl = `${parsed.protocol}//${parsed.host}`;

    function resolveUrl(href: string | undefined): string | null {
      if (!href) return null;
      if (href.startsWith('data:')) return null;
      if (href.startsWith('//')) return `${parsed.protocol}${href}`;
      if (href.startsWith('/')) return `${baseUrl}${href}`;
      if (href.startsWith('http')) return href;
      return `${baseUrl}/${href}`;
    }

    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim() ||
      '';

    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';

    const images: { url: string; alt: string }[] = [];

    const ogImage = resolveUrl($('meta[property="og:image"]').attr('content'));
    if (ogImage) images.push({ url: ogImage, alt: 'og-image' });

    const iconHref =
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href') ||
      $('link[rel="apple-touch-icon"]').attr('href');
    const iconUrl = resolveUrl(iconHref);
    if (iconUrl) images.push({ url: iconUrl, alt: 'site-icon' });

    $('img[class*="logo"], img[alt*="logo" i], img[id*="logo"], header img').each(
      (_, el) => {
        const src = resolveUrl($(el).attr('src'));
        if (src && !images.some((img) => img.url === src)) {
          images.push({ url: src, alt: $(el).attr('alt') || 'logo' });
        }
      }
    );

    $('img').each((_, el) => {
      if (images.length >= 10) return false;
      const src = resolveUrl($(el).attr('src'));
      if (!src) return;
      if (images.some((img) => img.url === src)) return;

      const width = parseInt($(el).attr('width') || '0', 10);
      const height = parseInt($(el).attr('height') || '0', 10);
      if ((width > 0 && width < 50) || (height > 0 && height < 50)) return;

      const srcLower = src.toLowerCase();
      if (
        srcLower.includes('pixel') ||
        srcLower.includes('tracking') ||
        srcLower.includes('analytics') ||
        srcLower.includes('spacer') ||
        (srcLower.includes('.gif') && (width <= 1 || height <= 1))
      ) {
        return;
      }

      images.push({ url: src, alt: $(el).attr('alt') || '' });
    });

    const colors: string[] = [];
    const themeColor = $('meta[name="theme-color"]').attr('content');
    if (themeColor) colors.push(themeColor);
    const tileColor = $('meta[name="msapplication-TileColor"]').attr('content');
    if (tileColor) colors.push(tileColor);

    const styleText = $('style').text() + ($('html').attr('style') || '');
    const cssVarMatches = styleText.match(/--[\w-]*color[\w-]*:\s*(#[0-9a-fA-F]{3,8})/gi);
    if (cssVarMatches) {
      for (const match of cssVarMatches) {
        const hexMatch = match.match(/#[0-9a-fA-F]{3,8}/);
        if (hexMatch && !colors.includes(hexMatch[0])) {
          colors.push(hexMatch[0]);
        }
      }
    }

    const textParts: string[] = [];
    $('h1').each((_, el) => {
      const text = $(el).text().trim();
      if (text) textParts.push(text);
    });
    $('h2').each((i, el) => {
      if (i >= 3) return false;
      const text = $(el).text().trim();
      if (text) textParts.push(text);
    });
    $('p').each((i, el) => {
      if (i >= 5) return false;
      const text = $(el).text().trim();
      if (text && text.length > 20) textParts.push(text);
    });

    return Response.json({
      title,
      description,
      images,
      colors,
      textContent: textParts.join('\n\n'),
      url: parsed.toString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scrape failed';
    return Response.json({ error: message }, { status: 500 });
  }
}

async function handleProxyImage(reqUrl: URL): Promise<Response> {
  const targetUrl = reqUrl.searchParams.get('url');
  if (!targetUrl) {
    return Response.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/*,audio/*,*/*',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      return Response.json({ error: `Upstream error: ${res.status}` }, { status: 502 });
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Proxy fetch failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
