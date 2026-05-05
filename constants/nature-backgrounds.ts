/**
 * Shared list of nature background URLs used in:
 *  - app/daily-ayah.tsx (rendering)
 *  - app/_layout.tsx (background prefetch on app start)
 *
 * Keeping them in a single module ensures the prefetch downloads
 * exactly the URLs that the screen will request.
 */

export const NATURE_BG_URLS: string[] = [
  'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80', // mountains
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', // beach
  'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&q=80', // forest
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80', // mountain lake
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80', // mountain mist
  'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&q=80', // flowers
  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80', // forest path
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', // sky
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80', // waterfall
  'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80', // sunset
  'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&q=80', // night sky
  'https://images.unsplash.com/photo-1527754046865-bfaed5b2aa2f?w=800&q=80', // ocean
  'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&q=80', // river forest
  'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=800&q=80', // misty mountains
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&q=80', // mountain valley
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80', // sunny forest
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&q=80', // alpine lake
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80', // green hills
  'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=800&q=80', // pine forest
  'https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?w=800&q=80', // green valley
  'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=800&q=80', // snowy peaks
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80', // lake reflection
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&q=80', // autumn trees
  'https://images.unsplash.com/photo-1504788363733-507549153474?w=800&q=80', // mountain road
  'https://images.unsplash.com/photo-1510784722466-f2aa9c52fff6?w=800&q=80', // calm sea
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80', // milky way mountain
  'https://images.unsplash.com/photo-1520962880247-cfaf541c8724?w=800&q=80', // green field
  'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=800&q=80', // bamboo forest
  'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800&q=80', // lavender field
  'https://images.unsplash.com/photo-1545569310-4af435ae5fa3?w=800&q=80', // tropical sea
];
