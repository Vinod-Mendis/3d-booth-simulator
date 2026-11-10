export interface ResolvedEmbed {
  /** URL to put in the iframe */
  src: string;
  /** Set when the host is known to refuse framing */
  blockedReason: string | null;
  /** Human note when the URL was rewritten */
  note: string | null;
}

const NEVER_EMBEDDABLE = [
  'pinterest.com',
  'facebook.com',
  'instagram.com',
  'x.com',
  'twitter.com',
  'linkedin.com',
  'google.com',
  'github.com',
  'netflix.com',
  'amazon.com',
  'reddit.com',
];

function hostMatches(host: string, domain: string) {
  return host === domain || host.endsWith('.' + domain);
}

function youtubeId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
  if (hostMatches(host, 'youtube.com') || hostMatches(host, 'youtube-nocookie.com')) {
    if (u.pathname === '/watch') return u.searchParams.get('v');
    const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{6,})/);
    if (m) return m[2];
  }
  return null;
}

/**
 * Turns a pasted link into something an iframe can actually show.
 * YouTube / Vimeo watch pages refuse framing, but their embed endpoints work.
 */
export function resolveEmbedUrl(rawUrl: string): ResolvedEmbed {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return { src: rawUrl, blockedReason: null, note: null };
  }

  const yt = youtubeId(u);
  if (yt) {
    const list = u.searchParams.get('list');
    const params = new URLSearchParams({ autoplay: '1', mute: '1', playsinline: '1', rel: '0' });
    if (list) params.set('list', list);
    else {
      params.set('loop', '1');
      params.set('playlist', yt);
    }
    const t = u.searchParams.get('t') || u.searchParams.get('start');
    if (t && /^\d+s?$/.test(t)) params.set('start', t.replace('s', ''));
    return {
      src: `https://www.youtube.com/embed/${yt}?${params.toString()}`,
      blockedReason: null,
      note: 'YouTube link converted to embed player (muted autoplay).',
    };
  }

  const host = u.hostname.replace(/^www\./, '');
  if (hostMatches(host, 'vimeo.com') && host !== 'player.vimeo.com') {
    const m = u.pathname.match(/^\/(\d+)/);
    if (m) {
      return {
        src: `https://player.vimeo.com/video/${m[1]}?autoplay=1&muted=1&loop=1`,
        blockedReason: null,
        note: 'Vimeo link converted to embed player.',
      };
    }
  }

  if (u.protocol === 'http:' && (hostMatches(host, 'vercel.app') || hostMatches(host, 'netlify.app'))) {
    u.protocol = 'https:';
    return { src: u.toString(), blockedReason: null, note: 'Upgraded to https.' };
  }

  const blocked = NEVER_EMBEDDABLE.find((d) => hostMatches(host, d));
  if (blocked) {
    return {
      src: rawUrl,
      blockedReason: `${blocked} does not allow itself to be shown inside another site, so it can't appear on a screen.`,
      note: null,
    };
  }

  return { src: rawUrl, blockedReason: null, note: null };
}
