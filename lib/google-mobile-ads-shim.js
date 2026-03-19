// Web shim for react-native-google-mobile-ads (native-only module)
module.exports = {
  default: () => ({ initialize: async () => {} }),
  BannerAd: null,
  BannerAdSize: {},
  InterstitialAd: { createForAdRequest: () => ({ load: () => {}, addAdEventListener: () => () => {} }) },
  AppOpenAd: { createForAdRequest: () => ({ load: () => {}, addAdEventListener: () => () => {} }) },
  AdEventType: {},
  TestIds: { BANNER: '', INTERSTITIAL: '', APP_OPEN: '' },
};
