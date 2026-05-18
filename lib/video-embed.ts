const IFRAME_SRC_RE = /<iframe[^>]+src=["']([^"']+)["']/i;

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractSource(input: string): string {
  const match = input.match(IFRAME_SRC_RE);
  return decodeHtmlAttribute(match?.[1] ?? input).trim();
}

function parseStartSeconds(value: string | null): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);

  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/i);
  if (!match) return null;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}

function getYouTubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    return url.pathname.split('/').filter(Boolean)[0] ?? null;
  }

  if (!host.endsWith('youtube.com') && host !== 'youtube-nocookie.com') {
    return null;
  }

  if (url.pathname === '/watch') {
    return url.searchParams.get('v');
  }

  const [, type, id] = url.pathname.split('/');
  if (['embed', 'shorts', 'live'].includes(type)) {
    return id ?? null;
  }

  return null;
}

export function extractYouTubeId(input?: string | null): { id: string; start?: number } | null {
  if (!input?.trim()) return null;
  let source = input.trim();
  if (source.startsWith('//')) source = `https:${source}`;
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return null;
  }
  const id = getYouTubeId(url)?.match(/^[\w-]{6,}$/)?.[0];
  if (!id) return null;
  const start = parseStartSeconds(url.searchParams.get('start') ?? url.searchParams.get('t'));
  return start ? { id, start } : { id };
}

export function extractVimeoId(input?: string | null): string | null {
  if (!input?.trim()) return null;
  let source = input.trim();
  if (source.startsWith('//')) source = `https:${source}`;
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'player.vimeo.com' && url.pathname.startsWith('/video/')) {
    return url.pathname.split('/').filter(Boolean)[1] ?? null;
  }
  if (host !== 'vimeo.com') return null;
  return url.pathname.split('/').filter(Boolean)[0]?.match(/^\d+$/)?.[0] ?? null;
}

function buildYouTubeEmbed(url: URL): string | null {
  const id = getYouTubeId(url)?.match(/^[\w-]{6,}$/)?.[0];
  if (!id) return null;

  const params = new URLSearchParams();
  const start = parseStartSeconds(url.searchParams.get('start') ?? url.searchParams.get('t'));
  if (start) params.set('start', String(start));
  params.set('rel', '0');

  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

function buildVimeoEmbed(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'player.vimeo.com' && url.pathname.startsWith('/video/')) {
    return url.toString();
  }
  if (host !== 'vimeo.com') return null;

  const id = url.pathname.split('/').filter(Boolean)[0]?.match(/^\d+$/)?.[0];
  return id ? `https://player.vimeo.com/video/${id}` : null;
}

export function normalizeVideoEmbedUrl(input?: string | null): string | null {
  if (!input?.trim()) return null;

  let source = extractSource(input);
  if (source.startsWith('//')) source = `https:${source}`;

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return null;
  }

  if (!['https:', 'http:'].includes(url.protocol)) return null;

  const youtube = buildYouTubeEmbed(url);
  if (youtube) return youtube;

  const vimeo = buildVimeoEmbed(url);
  if (vimeo) return vimeo;

  return url.toString();
}
