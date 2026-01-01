import { Store } from "../../lib/types";
import { Text, StyleSheet, Pressable } from "react-native";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";

interface storecards {
  store: Store;
  isSelected: boolean;
  onPress: () => void;
}

export default function StoreCard(card: storecards) {
  let { store, isSelected, onPress } = card;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, isSelected && styles.cardSelected]}
    >
      <Text style={styles.icon}>{store.icon}</Text>
      <Text style={[styles.name, isSelected && styles.nameSelected]}>
        {store.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.gray200,
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardSelected: {
    borderColor: colors.success,
    backgroundColor: colors.successLight + "20",
  },
  icon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray700,
    textAlign: "center",
  },
  nameSelected: {
    color: colors.successDark,
  },
});
