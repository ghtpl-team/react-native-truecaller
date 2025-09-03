import { useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Alert } from 'react-native';

import {
  TRUECALLER_ANDROID_CUSTOMIZATIONS,
  useTruecaller,
} from '@ghtpl-team/react-native-truecaller';

export default function App() {
  const truecallerConfig = {
    androidClientId: 'xxxxxxxx-android-client-id',
    androidButtonColor: '#212121',
    androidButtonTextColor: '#FFFFFF',
    androidButtonShape: TRUECALLER_ANDROID_CUSTOMIZATIONS.BUTTON_SHAPES.ROUNDED,
    androidButtonText: TRUECALLER_ANDROID_CUSTOMIZATIONS.BUTTON_TEXTS.ACCEPT,
    androidFooterButtonText:
      TRUECALLER_ANDROID_CUSTOMIZATIONS.FOOTER_TEXTS.ANOTHER_METHOD,
    androidConsentHeading:
      TRUECALLER_ANDROID_CUSTOMIZATIONS.CONSENT_HEADINGS.CHECKOUT_WITH,
    // OAuth scopes configuration - specify which data you want to access
    oauthScopes: ['profile', 'phone'], // This is the new feature!
  };

  const {
    userProfile,
    error,
    isTruecallerInitialized,
    initializeTruecallerSDK,
    openTruecallerForVerification,
    clearTruecallerSDK,
  } = useTruecaller(truecallerConfig);

  useEffect(() => {
    // Initialize the SDK when component mounts
    initializeTruecallerSDK();
  }, [initializeTruecallerSDK]);

  useEffect(() => {
    if (userProfile) {
      console.log('User Profile:', userProfile);
      Alert.alert(
        'Success!',
        `Welcome ${userProfile.firstName}!\nPhone: ${userProfile.phoneNumber}`
      );
    }
  }, [userProfile]);

  useEffect(() => {
    if (error) {
      console.error('Truecaller Error:', error);
      Alert.alert('Error', error);
    }
  }, [error]);

  const handleSignIn = async () => {
    if (!isTruecallerInitialized) {
      Alert.alert('Error', 'SDK is not initialized yet');
      return;
    }
    await openTruecallerForVerification();
  };

  const handleSignInWithEmailScope = async () => {
    // Example of using different OAuth scopes
    const configWithEmail = {
      ...truecallerConfig,
      oauthScopes: ['profile', 'phone', 'email'], // Request email access too
    };

    // You would need to reinitialize with new config for this to work
    Alert.alert(
      'Info',
      'To change OAuth scopes, you need to reinitialize the SDK with new configuration'
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Truecaller OAuth Scopes Demo</Text>

      <Text style={styles.subtitle}>
        Current OAuth Scopes: {truecallerConfig.oauthScopes?.join(', ')}
      </Text>

      <Pressable
        style={[
          styles.button,
          !isTruecallerInitialized && styles.buttonDisabled,
        ]}
        onPress={handleSignIn}
        disabled={!isTruecallerInitialized}
      >
        <Text style={styles.buttonText}>
          {isTruecallerInitialized
            ? 'Sign in with Truecaller'
            : 'Initializing...'}
        </Text>
      </Pressable>

      <Pressable style={styles.button} onPress={handleSignInWithEmailScope}>
        <Text style={styles.buttonText}>Example: Request Email Scope</Text>
      </Pressable>

      {userProfile && (
        <View style={styles.profileContainer}>
          <Text style={styles.profileTitle}>User Profile:</Text>
          <Text>
            Name: {userProfile.firstName} {userProfile.lastName}
          </Text>
          <Text>Phone: {userProfile.phoneNumber}</Text>
          <Text>Country Code: {userProfile.countryCode}</Text>
          {userProfile.email && <Text>Email: {userProfile.email}</Text>}
          {userProfile.gender && <Text>Gender: {userProfile.gender}</Text>}
        </View>
      )}

      <Pressable
        style={[styles.button, styles.clearButton]}
        onPress={clearTruecallerSDK}
      >
        <Text style={styles.buttonText}>Clear SDK</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 8,
    minWidth: 200,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    marginTop: 20,
  },
  profileContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginVertical: 20,
    width: '100%',
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
