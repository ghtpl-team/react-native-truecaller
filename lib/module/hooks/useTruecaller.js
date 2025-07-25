"use strict";

import { useState, useEffect, useCallback } from 'react';
import { Platform, NativeModules, NativeEventEmitter, DeviceEventEmitter } from 'react-native';
import axios from 'axios';
import { TRUECALLER_ANDROID_EVENTS, TRUECALLER_IOS_EVENTS, TRUECALLER_API_URLS, DEFAULT_BUTTON_TEXT_COLOR, DEFAULT_BUTTON_COLOR, DEFAULT_BUTTON_SHAPE, DEFAULT_BUTTON_TEXT, DEFAULT_CONSENT_HEADING, DEFAULT_FOOTER_BUTTON_TEXT, DEFAULT_LANGUAGE } from "../constants.js";
const TruecallerAndroidModule = NativeModules.TruecallerModule;
const TruecallerIOS = NativeModules.ReactNativeTruecaller;
export const useTruecaller = config => {
  const [userProfile, setUserProfile] = useState(null);
  const [error, setError] = useState(null);
  const [isTruecallerInitialized, setIsTruecallerInitialized] = useState(false);
  const initializeTruecallerSDK = useCallback(async () => {
    try {
      if (Platform.OS === 'android' && !config.androidClientId) {
        throw new Error('Android client ID is required for Android platform');
      }
      if (Platform.OS === 'ios' && (!config.iosAppKey || !config.iosAppLink)) {
        throw new Error('iOS app key and app link are required for iOS platform');
      }
      if (Platform.OS === 'android') {
        const androidConfig = {
          buttonColor: config.androidButtonColor || DEFAULT_BUTTON_COLOR,
          buttonTextColor: config.androidButtonTextColor || DEFAULT_BUTTON_TEXT_COLOR,
          buttonText: config.androidButtonText || DEFAULT_BUTTON_TEXT,
          buttonShape: config.androidButtonShape || DEFAULT_BUTTON_SHAPE,
          footerButtonText: config.androidFooterButtonText || DEFAULT_FOOTER_BUTTON_TEXT,
          consentHeading: config.androidConsentHeading || DEFAULT_CONSENT_HEADING,
          languageCode: config.languageCode || DEFAULT_LANGUAGE
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
  useEffect(() => {
    let successListener;
    let failureListener;
    if (isTruecallerInitialized) {
      if (Platform.OS === 'android') {
        if (!config.androidClientId) {
          setError('Android client ID is required for Android platform');
          return;
        }
        successListener = DeviceEventEmitter.addListener(TRUECALLER_ANDROID_EVENTS.SUCCESS, data => {
          // custom handler if provided, otherwise default handler
          if (config.androidSuccessHandler) {
            config.androidSuccessHandler(data);
          } else {
            handleAuthorizationSuccess(data);
          }
        });
        failureListener = DeviceEventEmitter.addListener(TRUECALLER_ANDROID_EVENTS.FAILURE, err => {
          setError(err.errorMessage);
          setUserProfile(null);
        });
      } else if (Platform.OS === 'ios') {
        if (!config.iosAppKey || !config.iosAppLink) {
          setError('iOS app key and app link are required for iOS platform');
          return;
        }
        const eventEmitter = new NativeEventEmitter(TruecallerIOS);
        successListener = eventEmitter.addListener(TRUECALLER_IOS_EVENTS.SUCCESS, handleAuthorizationSuccess);
        failureListener = eventEmitter.addListener(TRUECALLER_IOS_EVENTS.FAILURE, err => {
          setError(err.errorMessage);
          setUserProfile(null);
        });
      }
    }
    return () => {
      if (successListener) {
        if (Platform.OS === 'android') {
          successListener.remove();
        } else {
          successListener.remove();
        }
      }
      if (failureListener) {
        if (Platform.OS === 'android') {
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
      if (Platform.OS === 'android') {
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
    const response = await axios.post(TRUECALLER_API_URLS.TOKEN_URL, {
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
    const response = await axios.get(TRUECALLER_API_URLS.USER_INFO_URL, {
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
    if (Platform.OS === 'android') return TruecallerAndroidModule.isSdkUsable();else if (Platform.OS === 'ios') return TruecallerIOS.isSupported();
    return false;
  };
  const openTruecallerForVerification = useCallback(async () => {
    if (!isTruecallerInitialized) {
      setError('SDK is not initialized. Call initializeSDK first.');
      return;
    }
    try {
      if (!isSdkUsable()) {
        throw new Error('Truecaller SDK is not usable on this device');
      }
      if (Platform.OS === 'android') {
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
  const clearTruecallerSDK = useCallback(() => {
    try {
      if (Platform.OS === 'android') {
        TruecallerAndroidModule.clearSdk();
        setIsTruecallerInitialized(false);
        setUserProfile(null);
        setError(null);
      }
      // iOS doesn't require explicit cleanup
    } catch (err) {
      setError(err.message);
    }
  }, []);
  return {
    userProfile,
    error,
    isTruecallerInitialized,
    initializeTruecallerSDK,
    isSdkUsable,
    openTruecallerForVerification,
    clearTruecallerSDK
  };
};
//# sourceMappingURL=useTruecaller.js.map