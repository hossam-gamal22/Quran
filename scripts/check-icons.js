const icons = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
const check = [
  'arm-flex', 'emoticon-happy', 'rotate-360', 'kabaddi', 'exit-run',
  'human-handsup', 'human-handsdown', 'bullseye-arrow', 'rotate-3d-variant',
  'numeric-6-circle', 'weather-sunny-alert',
  'arm-flex-outline', 'emoticon-happy-outline', 'emoticon-excited', 'emoticon-excited-outline',
  'rotate-3d', 'axis-z-rotate-counterclockwise', 'sync', 'cached',
  'human-greeting', 'human-greeting-variant', 'run', 'run-fast',
  'numeric-6-circle-outline', 'weather-partly-cloudy',
  'bullseye', 'target',
  'walk', 'meditation', 'hand-heart', 'shield-check', 'content-cut',
  'mountain', 'weather-night', 'tent', 'cow', 'circle-multiple', 'bullhorn',
  'calendar-range', 'weather-sunset-up', 'weather-sunny', 'weather-sunset-down',
  'white-balance-sunny', 'moon-full', 'mosque', 'star-crescent', 'swap-horizontal',
];
check.forEach(name => {
  console.log(name + ': ' + (icons[name] !== undefined ? 'VALID' : 'INVALID'));
});

// Also search for close matches for invalid ones
const invalidNames = check.filter(n => icons[n] === undefined);
if (invalidNames.length > 0) {
  console.log('\n--- Searching close matches for invalid names ---');
  const allKeys = Object.keys(icons);
  invalidNames.forEach(invalid => {
    const parts = invalid.split('-');
    const matches = allKeys.filter(k => {
      return parts.some(p => p.length > 2 && k.includes(p));
    }).slice(0, 10);
    console.log(invalid + ' -> possible: ' + matches.join(', '));
  });
}
