import { looksLikeDesktopMode } from './deviceMode';

describe('looksLikeDesktopMode', () => {
  const phone = { screenWidth: 412, screenHeight: 915, touchPoints: 5 };

  it('spots a phone laid out at desktop width', () => {
    expect(looksLikeDesktopMode({ ...phone, viewportWidth: 980 })).toBe(true);
  });

  it('leaves normal phones, landscape, tablets and computers alone', () => {
    expect(looksLikeDesktopMode({ ...phone, viewportWidth: 412 })).toBe(false);
    expect(
      looksLikeDesktopMode({
        screenWidth: 915,
        screenHeight: 412,
        viewportWidth: 915,
        touchPoints: 5,
      }),
    ).toBe(false);
    expect(
      looksLikeDesktopMode({
        screenWidth: 800,
        screenHeight: 1280,
        viewportWidth: 1280,
        touchPoints: 10,
      }),
    ).toBe(false);
    expect(
      looksLikeDesktopMode({
        screenWidth: 1920,
        screenHeight: 1080,
        viewportWidth: 1920,
        touchPoints: 0,
      }),
    ).toBe(false);
  });
});
