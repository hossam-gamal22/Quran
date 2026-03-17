import { PropsWithChildren, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useIsRTL } from "@/hooks/use-is-rtl";

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = useColors();
  const isRTL = useIsRTL();

  return (
    <View className="bg-background">
      <TouchableOpacity
        style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}
      >
        <IconSymbol
          name={isRTL ? "chevron.left" : "chevron.right"}
          size={18}
          color={colors.foreground}
          style={{ transform: [{ rotate: isOpen ? (isRTL ? "-90deg" : "90deg") : "0deg" }] }}
        />
        <Text className="text-base font-semibold text-foreground" style={{ textAlign: isRTL ? 'right' : 'left' }}>{title}</Text>
      </TouchableOpacity>
      {isOpen && <View style={{ marginTop: 6, marginLeft: isRTL ? 0 : 24, marginRight: isRTL ? 24 : 0 }}>{children}</View>}
    </View>
  );
}
