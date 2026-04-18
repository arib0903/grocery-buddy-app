import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORY_META, CategoryKey } from "../../constants/categories";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";

interface CategorySectionHeaderProps {
  title: string; // raw category key from groupByCategory
}

export function CategorySectionHeader({ title }: CategorySectionHeaderProps) {
  const meta = CATEGORY_META[title as CategoryKey];
  const label = meta?.label ?? title.charAt(0).toUpperCase() + title.slice(1);
  const icon = (meta?.icon ?? "grid-outline") as keyof typeof Ionicons.glyphMap;

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={14} color={colors.gray500} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
