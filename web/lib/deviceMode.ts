/*
 * A phone that lays the app out like a computer: Chrome's "Site para
 * computador" option is on for this site, so the page gets a ~980px wide
 * viewport instead of the phone's width. Only that browser setting fixes it.
 */
export function looksLikeDesktopMode({
  screenWidth,
  screenHeight,
  viewportWidth,
  touchPoints,
}: {
  /** Screen width in the current orientation (CSS pixels). */
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  touchPoints: number;
}): boolean {
  const phone = touchPoints > 0 && Math.min(screenWidth, screenHeight) < 600;
  return phone && viewportWidth > screenWidth * 1.3;
}
