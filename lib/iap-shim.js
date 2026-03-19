// Web shim for react-native-iap (native-only module)
module.exports = {
  initConnection: async () => false,
  endConnection: async () => {},
  getProducts: async () => [],
  getSubscriptions: async () => [],
  requestPurchase: async () => {},
  requestSubscription: async () => {},
  finishTransaction: async () => {},
  purchaseUpdatedListener: () => ({ remove: () => {} }),
  purchaseErrorListener: () => ({ remove: () => {} }),
  getAvailablePurchases: async () => [],
  clearTransactionIOS: async () => {},
  flushFailedPurchasesCachedAsPendingAndroid: async () => {},
};
