/*
 * THIS FILE (shopping/[id].tsx): The SHOPPING MODE screen
 * Shows an active shopping session — items can be checked off as they're picked up.
 * The [id] is the session ID (not the list ID). Sessions are managed by sessionContext.
 *
 * Route: /shopping/{sessionId}
 * Reached from: list/[id].tsx → "Start Shopping" button
 */

import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { useSessions } from "../../lib/state/sessionContext";
import { SessionItem } from "../../lib/types";
import { useLists } from "../../lib/state/listContext";

export default function ShoppingMode() {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getSessionById, toggleSessionItem, completeSession, addItemToSession } = useSessions();
  const { getListById } = useLists();
  const [manualName, setManualName] = useState("");

  const session = getSessionById(sessionId);
  const list = session ? getListById(session.listId) : undefined;

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Session not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalItems = session.items.length;
  const completedItems = session.items.filter((i) => i.completed).length;
  const progressPercent = totalItems > 0 ? completedItems / totalItems : 0;

  const handleToggle = (itemId: string) => {
    toggleSessionItem(sessionId, itemId);
  };

  const handleAddManual = () => {
    const trimmed = manualName.trim();
    if (!trimmed) return;
    addItemToSession(sessionId, trimmed);
    setManualName("");
  };

  const handleCompleteTrip = () => {
    Alert.alert(
      "Complete Shopping Trip",
      "Are you done shopping? This will finish your session.",
      [
        { text: "Keep Shopping", style: "cancel" },
        {
          text: "Complete",
          style: "default",
          onPress: () => {
            completeSession(sessionId);
            router.back();
          },
        },
      ],
    );
  };

  const handleVoiceCommand = () => {
    Alert.alert("Voice Commands", "Voice command feature coming soon!");
  };

  const renderItem = ({ item }: { item: SessionItem }) => (
    <TouchableOpacity
      style={styles.itemRow}
      onPress={() => handleToggle(item.itemId)}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
        {item.completed && (
          <Ionicons name="checkmark" size={14} color={colors.white} />
        )}
      </View>

      <View style={styles.itemTextContainer}>
        <Text
          style={[styles.itemName, item.completed && styles.itemNameCompleted]}
        >
          {item.name}
        </Text>
        {item.quantity && (
          <Text
            style={[
              styles.itemQuantity,
              item.completed && styles.itemQuantityCompleted,
            ]}
          >
            {item.quantity}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <SafeAreaView style={styles.container}>
      {/* Green Header */}
      <View style={styles.header}>
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Shopping Mode</Text>
          <Text style={styles.headerSubtitle}>
            {list?.store ?? "Store"} • {completedItems}/{totalItems} items
          </Text>
        </View>

        {/* Settings icon placeholder */}
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons
            name="options-outline"
            size={24}
            color="rgba(255,255,255,0.8)"
          />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { flex: progressPercent }]} />
        <View style={{ flex: 1 - progressPercent }} />
      </View>

      {/* Items List */}
      <FlatList
        data={session.items}
        keyExtractor={(item) => item.itemId}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.sectionHeader}>
            {list?.name ?? "Shopping List"}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items in this session.</Text>
          </View>
        }
        renderItem={renderItem}
        ListFooterComponent={
          <View style={styles.manualEntryContainer}>
            <Text style={styles.manualEntryLabel}>ADD TO THIS TRIP</Text>
            <View style={styles.manualEntryRow}>
              <TextInput
                style={styles.manualInput}
                value={manualName}
                onChangeText={setManualName}
                placeholder="Item name..."
                placeholderTextColor={colors.gray400}
                returnKeyType="done"
                onSubmitEditing={handleAddManual}
              />
              <TouchableOpacity
                style={[
                  styles.manualAddBtn,
                  !manualName.trim() && styles.manualAddBtnDisabled,
                ]}
                onPress={handleAddManual}
                disabled={!manualName.trim()}
              >
                <Ionicons name="add" size={22} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        }
      />

      {/* Voice Command FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleVoiceCommand}
        activeOpacity={0.85}
      >
        <Ionicons name="mic" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Complete Shopping Trip Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleCompleteTrip}
          activeOpacity={0.85}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color={colors.white}
          />
          <Text style={styles.completeButtonText}>Complete Shopping Trip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ─────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.shoppingGreen,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.shoppingGreenLight,
    marginTop: spacing.xs,
  },
  settingsButton: {
    padding: spacing.xs,
  },

  // ── Progress Bar ───────────────────────────────────────────────
  progressBarTrack: {
    height: 6,
    backgroundColor: "rgba(61,190,139,0.3)",
    flexDirection: "row",
  },
  progressBarFill: {
    backgroundColor: colors.shoppingGreen,
  },

  // ── Items ──────────────────────────────────────────────────────
  listContent: {
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xxxl + 80, // extra room for FAB + footer
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.gray300,
    marginRight: spacing.md,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
  },
  checkboxChecked: {
    backgroundColor: colors.shoppingGreen,
    borderColor: colors.shoppingGreen,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: colors.gray900,
  },
  itemNameCompleted: {
    textDecorationLine: "line-through",
    color: colors.gray400,
  },
  itemQuantity: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 2,
  },
  itemQuantityCompleted: {
    color: colors.gray400,
  },

  // ── Empty ──────────────────────────────────────────────────────
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: colors.gray500,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: colors.gray500,
    textAlign: "center",
  },

  // ── Keyboard / wrapper ─────────────────────────────────────────
  flex: {
    flex: 1,
  },

  // ── Manual entry ───────────────────────────────────────────────
  manualEntryContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  manualEntryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  manualEntryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  manualInput: {
    flex: 1,
    fontSize: 15,
    color: colors.gray900,
    paddingVertical: spacing.sm,
  },
  manualAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.shoppingGreen,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.xs,
  },
  manualAddBtnDisabled: {
    backgroundColor: colors.gray300,
  },

  // ── FAB ────────────────────────────────────────────────────────
  fab: {
    position: "absolute",
    bottom: spacing.fab.bottom + 80, // above the footer
    right: spacing.fab.right,
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

  // ── Footer ─────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.shoppingGreen,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.lg,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
  },
});
