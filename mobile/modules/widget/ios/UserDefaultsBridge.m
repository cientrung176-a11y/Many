#import <React/RCTBridgeModule.h>

@interface UserDefaultsBridge : NSObject <RCTBridgeModule>
@end

@implementation UserDefaultsBridge

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(setWidgetData:(NSDictionary *)data
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  NSUserDefaults *defaults = [[NSUserDefaults alloc]
    initWithSuiteName:@"group.com.lieu.ancuc.widget"];

  if (!defaults) {
    reject(@"E_APPGROUP", @"Cannot access App Group — check entitlements", nil);
    return;
  }

  NSNumber *total = data[@"totalThisMonth"];
  NSNumber *count = data[@"countThisMonth"];
  NSString *month = data[@"monthName"];

  if (total)  [defaults setDouble:[total doubleValue]   forKey:@"totalThisMonth"];
  if (count)  [defaults setInteger:[count integerValue] forKey:@"countThisMonth"];
  if (month)  [defaults setObject:month                 forKey:@"monthName"];
  [defaults setObject:[NSDate date].description         forKey:@"updatedAt"];
  [defaults synchronize];

  resolve(@YES);
}

@end
