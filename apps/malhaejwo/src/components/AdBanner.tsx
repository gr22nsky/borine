import { StyleSheet, View } from "react-native";
import { NativeModules } from "react-native";
import { useMemo } from "react";

const hasNativeModule = !!(NativeModules as any).RNGoogleMobileAdsModule;
const SHOW_ADS = true;

export const AdBanner = () => {
  if (!SHOW_ADS) return null;

  const Ads = useMemo(() => {
    if (!hasNativeModule) return null;
    // Lazy import to avoid TurboModule errors when ads are unavailable.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BannerAd, BannerAdSize, TestIds } = require("react-native-google-mobile-ads");
    const adUnitId = __DEV__ ? TestIds.BANNER : "ca-app-pub-5720633830102347/4431415547";
    return { BannerAd, BannerAdSize, adUnitId };
  }, []);

  if (!Ads) return null;

  return (
    <View style={styles.container}>
      <Ads.BannerAd unitId={Ads.adUnitId} size={Ads.BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 8
  }
});
