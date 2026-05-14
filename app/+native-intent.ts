const APP_SCHEME = 'rooh-almuslim';

function routeForPath(path: string): string {
  const [pathname, suffix = ''] = path.split(/([?#].*)/, 2);

  switch (pathname) {
    case '/':
    case '':
      return '/';
    case '/widget':
    case '/widgets-gallery':
    case '/widget-settings':
      return `/widget${suffix}`;
    case '/prayer':
    case '/tasbih':
    case '/quran':
      return `/(tabs)${pathname}${suffix}`;
    case '/qibla':
      return '/(tabs)/prayer?tab=qibla';
    case '/azkar/morning':
      return `/azkar/1${suffix}`;
    case '/azkar/evening':
      return `/azkar/1b${suffix}`;
    default:
      return `${pathname}${suffix}`;
  }
}

function normalizeSystemPath(path: string): string {
  if (!path) return '/';

  // Expo development client uses the app scheme to bootstrap Metro. It is not
  // an in-app route and must not be handed to Expo Router as one.
  if (path.includes('expo-development-client')) {
    return '/';
  }

  const prefix = `${APP_SCHEME}://`;
  if (path.startsWith(prefix)) {
    const rawPath = path.slice(prefix.length);
    if (!rawPath || rawPath === '/') return '/';

    const routePath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    return routeForPath(routePath);
  }

  return routeForPath(path.startsWith('/') ? path : `/${path}`);
}

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return normalizeSystemPath(path);
  } catch {
    return '/';
  }
}
