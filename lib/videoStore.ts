import { get, set, del, keys } from 'idb-keyval';

const IDB_KEY_PREFIX = 'vid_';
const objectUrlCache = new Map<string, string>();

/**
 * Checks if browser IndexedDB and URL APIs are available.
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

/**
 * Saves a video file to IndexedDB and returns its unique videoId.
 */
export async function saveVideo(file: File): Promise<string> {
  if (!isBrowser()) {
    throw new Error('IndexedDB is only available in the browser.');
  }

  const videoId = `${IDB_KEY_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  await set(videoId, file);
  return videoId;
}

/**
 * Retrieves the stored video Blob from IndexedDB.
 */
export async function getVideoBlob(id: string): Promise<Blob | undefined> {
  if (!isBrowser()) return undefined;
  try {
    const blob = await get<Blob>(id);
    return blob;
  } catch (err) {
    console.warn(`Failed to retrieve video blob for id ${id}:`, err);
    return undefined;
  }
}

/**
 * Gets or creates a reusable browser Object URL for a video stored in IndexedDB.
 */
export async function getVideoObjectUrl(id: string): Promise<string | null> {
  if (!isBrowser()) return null;

  if (objectUrlCache.has(id)) {
    return objectUrlCache.get(id)!;
  }

  const blob = await getVideoBlob(id);
  if (!blob) {
    return null;
  }

  const url = URL.createObjectURL(blob);
  objectUrlCache.set(id, url);
  return url;
}

/**
 * Revokes and deletes a cached object URL for a videoId.
 */
export function revokeVideoObjectUrl(id: string): void {
  const url = objectUrlCache.get(id);
  if (url) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore
    }
    objectUrlCache.delete(id);
  }
}

/**
 * Deletes a stored video from IndexedDB and revokes its object URL.
 */
export async function deleteVideo(id: string): Promise<void> {
  revokeVideoObjectUrl(id);
  if (!isBrowser()) return;
  try {
    await del(id);
  } catch (err) {
    console.warn(`Failed to delete video ${id} from IndexedDB:`, err);
  }
}

/**
 * Cleans up videos stored in IndexedDB that are no longer referenced by any screen.
 */
export async function cleanupUnusedVideos(activeVideoIds: string[]): Promise<void> {
  if (!isBrowser()) return;
  try {
    const allKeys = await keys();
    const activeSet = new Set(activeVideoIds);
    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith(IDB_KEY_PREFIX) && !activeSet.has(key)) {
        await deleteVideo(key);
      }
    }
  } catch (err) {
    console.warn('Failed to cleanup unused videos from IndexedDB:', err);
  }
}

/**
 * Common streaming/page URLs that do not support direct video file playback in WebGL.
 */
const EMBED_PLATFORM_PATTERNS = [
  /youtube\.com/i,
  /youtu\.be/i,
  /vimeo\.com/i,
  /dailymotion\.com/i,
  /twitch\.tv/i,
  /tiktok\.com/i,
  /streamable\.com/i,
];

/**
 * Validates a user-pasted video URL.
 */
export function validateVideoUrl(urlStr: string): { valid: boolean; error?: string } {
  const trimmed = urlStr.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter a video URL.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format. Include http:// or https://' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only http:// and https:// URLs are supported.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  for (const pattern of EMBED_PLATFORM_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        valid: false,
        error: 'Paste a direct .mp4 or .webm link, or upload the file.',
      };
    }
  }

  return { valid: true };
}
