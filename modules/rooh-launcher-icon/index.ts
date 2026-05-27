import { requireOptionalNativeModule } from 'expo-modules-core';

type RoohLauncherIconModule = {
  setLauncherIcon?: (
    iconName: string | null,
    aliases: readonly string[],
    killApp: boolean
  ) => boolean;
};

export const RoohLauncherIcon =
  requireOptionalNativeModule<RoohLauncherIconModule>('RoohLauncherIcon');
