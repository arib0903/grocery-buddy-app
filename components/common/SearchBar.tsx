import { View, StyleSheet, TextInput, TextInputProps } from "react-native";
import { colors } from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "../../constants/spacing";

interface SearchBarProps extends TextInputProps {
  showSearchIcon?: boolean;
  containerStyle?: object;
}

export default function SearchBar({
  showSearchIcon = false,
  containerStyle,
  style,
  ...props
}: SearchBarProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {showSearchIcon && (
        <Ionicons
          name="search"
          size={20}
          color={colors.gray400}
          style={styles.icon}
        />
      )}
      <TextInput
        style={[styles.input, showSearchIcon && styles.inputWithIcon, style]}
        placeholderTextColor={colors.gray400}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  icon: {
    position: "absolute",
    left: spacing.lg,
    top: "50%",
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray300,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.gray900,
  },
  inputWithIcon: {
    paddingLeft: spacing.lg + 28, // Make room for icon
  },
});
