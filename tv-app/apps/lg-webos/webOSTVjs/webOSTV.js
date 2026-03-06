// webOS TV JS library stub
// On real LG TVs, replace this with the webOSTV.js from the LG webOS SDK.
// This stub ensures the app doesn't crash in development/non-webOS environments.

(function () {
  if (window.webOS) return; // Real library already loaded

  window.webOS = {
    platform: { tv: true },
    service: {
      request: function (uri, params) {
        console.log('[webOS stub] service.request:', uri, params.method || '');
        if (params.onFailure) {
          params.onFailure({ errorCode: -1, errorText: 'stub - not on real webOS device' });
        }
        return { cancel: function () {} };
      }
    },
    systemInfo: function (callback) {
      if (callback) callback({ modelName: 'stub', sdkVersion: '0.0.0' });
    },
    deviceInfo: function (callback) {
      if (callback) callback({ modelName: 'stub' });
    }
  };

  console.log('[webOS stub] Loaded webOS stub library');
})();
