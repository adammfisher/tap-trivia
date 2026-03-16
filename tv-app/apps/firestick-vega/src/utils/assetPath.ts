/**
 * Asset URLs for Vega OS media files.
 *
 * LOCAL FIRST: Raw assets bundled in the vpkg at /pkg/assets/raw/ are available
 * immediately at boot with no network dependency. This prevents the CDN cold-start
 * race where WiFi hasn't reconnected yet and the video fails to load, which would
 * leave no active display power session and allow screensaver to fire.
 *
 * CDN FALLBACK: Used if the local file is not present (e.g., old installed version).
 */

export const LOCAL_ASSET_BASE = 'file:///pkg/assets/raw/';
export const CDN_ASSET_BASE = 'https://tv.taptrivia.tv/assets/';

export function getLocalAssetURL(filename: string): string {
  return LOCAL_ASSET_BASE + filename;
}

export function getCDNAssetURL(filename: string): string {
  return CDN_ASSET_BASE + filename;
}

/** @deprecated Use getLocalAssetURL with CDN fallback instead */
export function getAssetURL(filename: string): string {
  return CDN_ASSET_BASE + filename;
}
