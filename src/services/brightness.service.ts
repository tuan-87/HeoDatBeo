import { NativeModules, Platform } from 'react-native';

const { ScreenBrightnessModule } = NativeModules;

export const BrightnessService = {
  setMaxBrightness: () => {
    if (Platform.OS === 'android' && ScreenBrightnessModule?.setMaxBrightness) {
      try {
        ScreenBrightnessModule.setMaxBrightness();
      } catch (err) {
        console.warn('Error setting max brightness:', err);
      }
    }
  },
  resetBrightness: () => {
    if (Platform.OS === 'android' && ScreenBrightnessModule?.resetBrightness) {
      try {
        ScreenBrightnessModule.resetBrightness();
      } catch (err) {
        console.warn('Error resetting brightness:', err);
      }
    }
  },
};

