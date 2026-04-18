import { TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";

interface FloatingMicButtonProps {
  onPress: () => void;
  isListening?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function FloatingMicButton({
  onPress,
  isListening = false,
  disabled = false,
  style,
}: FloatingMicButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={
        isListening ? "Stop voice input" : "Start voice input"
      }
      style={[
        styles.fab,
        isListening && styles.fabListening,
        disabled && styles.fabDisabled,
        style,
      ]}
    >
      <Ionicons
        name={isListening ? "stop" : "mic"}
        size={28}
        color={colors.white}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: spacing.fab.size,
    height: spacing.fab.size,
    borderRadius: spacing.fab.size / 2,
    backgroundColor: colors.shoppingGreen,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.black,
    shadowOffset: spacing.shadowOffset.medium,
    shadowOpacity: spacing.shadowOpacity.heavy,
    shadowRadius: spacing.shadowRadius.medium,
    elevation: 6,
  },
  fabListening: {
    backgroundColor: colors.danger,
  },
  fabDisabled: {
    backgroundColor: colors.gray300,
    opacity: 0.8,
  },
});
