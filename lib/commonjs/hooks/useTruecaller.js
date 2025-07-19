"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useTruecaller = void 0;
var _react = require("react");
var _reactNative = require("react-native");
var _axios = _interopRequireDefault(require("axios"));
var _constants = require("../constants.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const TruecallerAndroidModule = _reactNative.NativeModules.TruecallerModule;
const TruecallerIOS = _reactNative.NativeModules.ReactNativeTruecaller;
const useTruecaller = config => {
  const [userProfile, setUserProfile] = (0, _react.useState)(null);
  const [error, setError] = (0, _react.useState)(null);
  const [isTruecallerInitialized, setIsTruecallerInitialized] = (0, _react.useState)(false);
  const initializeTruecallerSDK = (0, _react.useCallback)(async () => {
    try {
      if (_reactNative.Platform.OS === 'android' && !config.androidClientId) {
        throw new Error('Android client ID is required for Android platform');
      }
      if (_reactNative.Platform.OS === 'ios' && (!config.iosAppKey || !config.iosAppLink)) {
        throw new Error('iOS app key and app link are required for iOS platform');
      }
      if (_reactNative.Platform.OS === 'android') {
        const androidConfig = {
          buttonColor: config.androidButtonColor || _constants.DEFAULT_BUTTON_COLOR,
          buttonTextColor: config.androidButtonTextColor || _constants.DEFAULT_BUTTON_TEXT_COLOR,
          buttonText: config.androidButtonText || _constants.DEFAULT_BUTTON_TEXT,
          buttonShape: config.androidButtonShape || _constants.DEFAULT_BUTTON_SHAPE,
          footerButtonText: config.androidFooterButtonText || _constants.DEFAULT_FOOTER_BUTTON_TEXT,
          consentHeading: config.androidConsentHeading || _constants.DEFAULT_CONSENT_HEADING,
          languageCode: config.languageCode || _constants.DEFAULT_LANGUAGE
        };
        await TruecallerAndroidModule.initializeSdk(androidConfig);
      } else {
        await TruecallerIOS.initializeSdk(config);
      }
      setIsTruecallerInitialized(true);
      setError(null);
    } catch (err) {
      setError(err.message);
      setIsTruecallerInitialized(false);
    }
  }, [config]);
  (0, _react.useEffect)(() => {
    let successListener;
    let failureListener;
    if (isTruecallerInitialized) {
      if (_reactNative.Platform.OS === 'android') {
        if (!config.androidClientId) {
          setError('Android client ID is required for Android platform');
          return;
        }
        successListener = _reactNative.DeviceEventEmitter.addListener(_constants.TRUECALLER_ANDROID_EVENTS.SUCCESS, data => {
          // custom handler if provided, otherwise default handler
          if (config.androidSuccessHandler) {
            config.androidSuccessHandler(data);
          } else {
            handleAuthorizationSuccess(data);
          }
        });
        failureListener = _reactNative.DeviceEventEmitter.addListener(_constants.TRUECALLER_ANDROID_EVENTS.FAILURE, err => {
          setError(err.errorMessage);
          setUserProfile(null);
        });
      } else if (_reactNative.Platform.OS === 'ios') {
        if (!config.iosAppKey || !config.iosAppLink) {
          setError('iOS app key and app link are required for iOS platform');
          return;
        }
        const eventEmitter = new _reactNative.NativeEventEmitter(TruecallerIOS);
        successListener = eventEmitter.addListener(_constants.TRUECALLER_IOS_EVENTS.SUCCESS, handleAuthorizationSuccess);
        failureListener = eventEmitter.addListener(_constants.TRUECALLER_IOS_EVENTS.FAILURE, err => {
          setError(err.errorMessage);
          setUserProfile(null);
        });
      }
    }
    return () => {
      if (successListener) {
        if (_reactNative.Platform.OS === 'android') {
          successListener.remove();
        } else {
          successListener.remove();
        }
      }
      if (failureListener) {
        if (_reactNative.Platform.OS === 'android') {
          failureListener.remove();
        } else {
          failureListener.remove();
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTruecallerInitialized, config]);
  const handleAuthorizationSuccess = async data => {
    try {
      if (_reactNative.Platform.OS === 'android') {
        const {
          authorizationCode,
          codeVerifier
        } = data;
        const accessToken = await exchangeAuthorizationCodeForAccessToken(authorizationCode, codeVerifier);
        const userInfo = await fetchUserProfile(accessToken);
        setUserProfile(userInfo);
      } else {
        // For iOS, the profile data is directly available
        setUserProfile(mapIOSResponseToUserProfile(data));
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      setUserProfile(null);
    }
  };
  const exchangeAuthorizationCodeForAccessToken = async (authorizationCode, codeVerifier) => {
    const clientId = config.androidClientId;
    const response = await _axios.default.post(_constants.TRUECALLER_API_URLS.TOKEN_URL, {
      grant_type: 'authorization_code',
      client_id: clientId,
      code: authorizationCode,
      code_verifier: codeVerifier
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data.access_token;
  };
  const fetchUserProfile = async accessToken => {
    const response = await _axios.default.get(_constants.TRUECALLER_API_URLS.USER_INFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return mapAndroidResponseToUserProfile(response.data);
  };
  const mapAndroidResponseToUserProfile = data => ({
    firstName: data.given_name,
    lastName: data.family_name,
    email: data.email,
    countryCode: data.phone_number_country_code,
    gender: data.gender,
    phoneNumber: data.phone_number
  });
  const mapIOSResponseToUserProfile = data => ({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    countryCode: data.countryCode,
    gender: data.gender,
    phoneNumber: data.phoneNumber
  });
  const isSdkUsable = () => {
    if (_reactNative.Platform.OS === 'android') return TruecallerAndroidModule.isSdkUsable();else if (_reactNative.Platform.OS === 'ios') return TruecallerIOS.isSupported();
    return false;
  };
  const openTruecallerForVerification = (0, _react.useCallback)(async () => {
    if (!isTruecallerInitialized) {
      setError('SDK is not initialized. Call initializeSDK first.');
      return;
    }
    try {
      if (!isSdkUsable()) {
        throw new Error('Truecaller SDK is not usable on this device');
      }
      if (_reactNative.Platform.OS === 'android') {
        if (!config.androidClientId) {
          throw new Error('Android client ID is required for Android platform');
        }
        await TruecallerAndroidModule.requestAuthorizationCode();
      } else {
        if (!config.iosAppKey || !config.iosAppLink) {
          throw new Error('iOS app key and app link are required for iOS platform');
        }
        await TruecallerIOS.requestTrueProfile();
      }
    } catch (err) {
      setError(err.message);
    }
  }, [isTruecallerInitialized, config]);
  return {
    userProfile,
    error,
    isTruecallerInitialized,
    initializeTruecallerSDK,
    isSdkUsable,
    openTruecallerForVerification
  };
};
exports.useTruecaller = useTruecaller;
//# sourceMappingURL=useTruecaller.js.map