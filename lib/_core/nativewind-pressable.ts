// NativeWind + Pressable: className can swallow onPress. Disable className mapping globally.
import { Pressable } from "react-native";
// @ts-ignore
import { remapProps } from "nativewind";

remapProps(Pressable, { className: false });
