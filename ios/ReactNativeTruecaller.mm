#import "ReactNativeTruecaller.h"
#import <React/RCTBridge.h>
#import <React/RCTRootView.h>
#import <TrueSDK/TrueSDK.h>

@implementation ReactNativeTruecaller

RCT_EXPORT_MODULE()

- (NSArray<NSString *> *)supportedEvents {
    return @[@"TruecallerIOSSuccess", @"TruecallerIOSFailure"];
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(isSupported) {
    @try {
        return @([[TCTrueSDK sharedManager] isSupported]);
    }
    @catch (NSException *exception) {
        [self sendTruecallerFailureEvent:0 message:exception.reason];
        return @NO;
    }
}

RCT_EXPORT_METHOD(initializeSdk:(NSDictionary *)config) {
    NSString *appKey = config[@"iosAppKey"];
    NSString *appLink = config[@"iosAppLink"];
    NSArray *oauthScopes = config[@"oauthScopes"];
    
    if ([[TCTrueSDK sharedManager] isSupported]) {
        [[TCTrueSDK sharedManager] setupWithAppKey:appKey appLink:appLink];
        [TCTrueSDK sharedManager].delegate = self;
        
        // Store OAuth scopes for future use (iOS TrueSDK doesn't currently support OAuth scopes like Android)
        // This is prepared for future compatibility when iOS SDK supports OAuth scopes
        if (oauthScopes && [oauthScopes isKindOfClass:[NSArray class]]) {
            // Log the requested scopes for debugging
            NSLog(@"Truecaller iOS: Requested OAuth scopes: %@", oauthScopes);
            // Note: Current iOS TrueSDK doesn't support OAuth scopes configuration
            // This will be ready when iOS SDK adds OAuth scopes support
        }
    } else {
        [self sendTruecallerFailureEvent:0 message:@"Please make sure you have truecaller app installed on your device."];
    }
}

// Keep the old method for backward compatibility
RCT_EXPORT_METHOD(initialize:(NSString *)appKey appLink:(NSString *)appLink) {
    if ([[TCTrueSDK sharedManager] isSupported]) {
        [[TCTrueSDK sharedManager] setupWithAppKey:appKey appLink:appLink];
        [TCTrueSDK sharedManager].delegate = self;
    } else {
        [self sendTruecallerFailureEvent:0 message:@"Please make sure you have truecaller app installed on your device."];
    }
}

RCT_EXPORT_METHOD(requestTrueProfile) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [[TCTrueSDK sharedManager] requestTrueProfile];
    });
}

// Keep the old method for backward compatibility
RCT_EXPORT_METHOD(requestProfile) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [[TCTrueSDK sharedManager] requestTrueProfile];
    });
}

+ (BOOL)handleUserActivity:(NSUserActivity *)userActivity
        restorationHandler:(void (^)(NSArray *restorableObjects))restorationHandler {
    return [[TCTrueSDK sharedManager] application:[UIApplication sharedApplication] continueUserActivity:userActivity restorationHandler:restorationHandler];
}

- (void)didReceiveTrueProfile:(TCTrueProfile *)profileResponse {
    NSDictionary *profileData = @{
        @"firstName": profileResponse.firstName ?: [NSNull null],
        @"lastName": profileResponse.lastName ?: [NSNull null],
        @"email": profileResponse.email ?: [NSNull null],
        @"phoneNumber": profileResponse.phoneNumber ?: [NSNull null],
        @"countryCode": profileResponse.countryCode ?: [NSNull null],
        @"gender": profileResponse.gender ? @(profileResponse.gender) : [NSNull null],
    };

    [self sendEventWithName:@"TruecallerIOSSuccess" body:profileData];
}

- (void)didFailToReceiveTrueProfileWithError:(TCError *)error {
    [self sendTruecallerFailureEvent:error.code message:error.description];
}

- (void)sendTruecallerFailureEvent:(NSInteger)errorCode message:(NSString *)errorMessage {
    NSDictionary *errorData = @{
        @"errorCode": @(errorCode),
        @"errorMessage": errorMessage ?: (NSString *)[NSNull null]
    };

    [self sendEventWithName:@"TruecallerIOSFailure" body:errorData];
}

@end
