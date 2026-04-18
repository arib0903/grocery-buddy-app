/*
 * THIS FILE (list/[id].tsx): The LIST DETAILS screen
 * Items are grouped by category using SectionList.
 */
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Alert,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { useLists } from "../../lib/state/listContext";
import { useSessions } from "../../lib/state/sessionContext";
import { GroceryItem, GroceryList } from "../../lib/types";
import SearchBar from "../../components/common/SearchBar";
import { Ionicons } from "@expo/vector-icons";
import { FloatingMicButton } from "../../components/common/FloatingMicButton";
import { useBlueprintVoiceCommands } from "../../lib/voice/useBlueprintVoiceCommands";
import { CategorySectionHeader } from "../../components/common/CategorySectionHeader";
import { groupByCategory } from "../../lib/utils/groupByCategory";

export default function ListDetail() {
  const [itemName, setItemName] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [voiceItemName, setVoiceItemName] = useState("");

  const { getListById, addItemToList, deleteItem, updateItem } = useLists();
  const { startSession, getActiveSessionForList, resyncSession } = useSessions();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const currentList: GroceryList | undefined = getListById(id);
  const sections = groupByCategory(currentList?.items ?? []);

  const {
    isVoiceAvailable,
    isListening,
    isParsing,
    lastTranscript,
    voiceError,
    clearVoiceError,
    handleVoiceCommand,
  } = useBlueprintVoiceCommands({ listId: id, setManualName: setVoiceItemName });

  const handleAddItem = () => {
    if (!itemName.trim()) {
      Alert.alert("Error", "Please enter an item name");
      return;
    }
    addItemToList(id, itemName);
    setItemName("");
  };

  const handleAddVoiceItem = () => {
    if (!voiceItemName.trim()) return;
    addItemToList(id, voiceItemName);
    setVoiceItemName("");
  };

  const handleDeleteItem = (itemId: string) => {
    deleteItem(id, itemId);
  };

  const handleEditItem = (itemId: string, currentName: string) => {
    setEditingItemId(itemId);
    setEditedName(currentName);
  };

  const handleSaveEdit = () => {
    if (!editedName.trim()) {
      Alert.alert("Error", "Item name cannot be empty");
      return;
    }
    if (editingItemId) {
      updateItem(id, editingItemId, { name: editedName });
      setEditingItemId(null);
      setEditedName("");
    }
  };

  const handleStartShopping = () => {
    if (!currentList) return;
    const existing = getActiveSessionForList(currentList.id);
    if (existing) {
      resyncSession(existing.id, currentList);
      router.push(`/shopping/${existing.id}`);
    } else {
      const session = startSession(currentList);
      if (!session) return;
      router.push(`/shopping/${session.id}`);
    }
  };

  const renderItem = ({ item }: { item: GroceryItem }) => (
    <View style={styles.itemRow}>
      {editingItemId === item.id ? (
        <>
          <SearchBar
            placeholder="Item name"
            value={editedName}
            onChangeText={setEditedName}
            showSearchIcon={false}
            containerStyle={styles.editInput}
          />
          <TouchableOpacity onPress={handleSaveEdit} style={styles.saveButton}>
            <Ionicons name="checkmark" size={24} color="white" />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.itemDetails}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.quantity != null && (
              <Text style={styles.itemQuantity}>
                {item.unit ? `${item.quantity} ${item.unit}` : String(item.quantity)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => handleEditItem(item.id, item.name)}
            style={styles.editIconButton}
          >
            <Ionicons name="create-outline" size={20} color={colors.gray600} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteItem(item.id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.listName}>{currentList?.name}</Text>
          <Text style={styles.storeName}>{currentList?.store}</Text>
          <Text style={styles.itemCount}>
            {currentList?.items.length}{" "}
            {currentList?.items.length === 1 ? "item" : "items"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleStartShopping}
          style={styles.startShoppingButton}
        >
          <Text style={styles.startShoppingText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>

      {/* Add Item bar */}
      <View style={styles.addItemContainer}>
        <SearchBar
          placeholder="Add item..."
          value={itemName}
          onChangeText={setItemName}
          showSearchIcon={false}
          containerStyle={styles.searchBarContainer}
        />
        <TouchableOpacity onPress={handleAddItem} style={styles.addButton}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Categorised item list */}
      <SectionList
        style={styles.flex}
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <CategorySectionHeader title={section.title} />
        )}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items yet. Add your first item!</Text>
          </View>
        }
      />

      {/* Voice error banner */}
      {voiceError && (
        <TouchableOpacity
          style={styles.voiceStatusError}
          onPress={clearVoiceError}
          activeOpacity={0.85}
        >
          <Ionicons name="alert-circle" size={14} color={colors.white} />
          <Text style={styles.voiceStatusText}>{voiceError}</Text>
        </TouchableOpacity>
      )}

      {/* Voice status card */}
      {(isListening || isParsing || lastTranscript) && (
        <View style={styles.voiceStatusCard}>
          <Ionicons
            name={isParsing ? "hourglass-outline" : isListening ? "mic" : "chatbubble-ellipses-outline"}
            size={14}
            color={colors.gray700}
          />
          <Text style={styles.voiceStatusLabel}>
            {isParsing
              ? "Parsing your command..."
              : isListening
                ? "Listening... tap mic again to stop"
                : `Last heard: ${lastTranscript}`}
          </Text>
        </View>
      )}

      {/* Voice fallback input */}
      {voiceItemName.length > 0 && (
        <View style={styles.voiceFallbackRow}>
          <SearchBar
            placeholder="Voice transcript..."
            value={voiceItemName}
            onChangeText={setVoiceItemName}
            showSearchIcon={false}
            containerStyle={styles.voiceFallbackInput}
          />
          <TouchableOpacity onPress={handleAddVoiceItem} style={styles.addButton}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Mic FAB */}
      <FloatingMicButton
        style={styles.fab}
        onPress={() => { void handleVoiceCommand(); }}
        isListening={isListening}
        disabled={!isVoiceAvailable || isParsing}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.background },
  flex:               { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerLeft:         { flex: 1 },
  listName:           { fontSize: 24, fontWeight: "bold", color: colors.gray900, marginBottom: spacing.xs },
  storeName:          { fontSize: 16, color: colors.gray600, marginBottom: spacing.xs },
  itemCount:          { fontSize: 14, color: colors.gray500 },
  startShoppingButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.lg,
  },
  startShoppingText:  { color: colors.white, fontSize: 14, fontWeight: "600" },
  addItemContainer: {
    flexDirection: "row",
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    alignItems: "center",
  },
  searchBarContainer: { flex: 1, marginRight: spacing.md },
  addButton: {
    backgroundColor: colors.success,
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent:        { paddingBottom: spacing.xxxl + 80 },
  emptyContainer:     { padding: spacing.xxl, alignItems: "center" },
  emptyText:          { fontSize: 16, color: colors.gray500, textAlign: "center" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  itemDetails:        { flex: 1 },
  itemName:           { fontSize: 16, color: colors.gray900 },
  itemQuantity:       { fontSize: 14, color: colors.gray600, marginTop: spacing.xs },
  editIconButton:     { padding: spacing.sm, marginLeft: spacing.sm },
  deleteButton:       { padding: spacing.sm, marginLeft: spacing.sm },
  editInput:          { flex: 1, marginRight: spacing.sm },
  saveButton: {
    backgroundColor: colors.success,
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  // ── Voice ──────────────────────────────────────────────────────
  fab: {
    position: "absolute",
    bottom: spacing.fab.bottom,
    right: spacing.fab.right,
  },
  voiceStatusCard: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.fab.bottom + 70,
    backgroundColor: colors.gray100,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  voiceStatusError: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.fab.bottom + 70,
    backgroundColor: colors.danger,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  voiceStatusLabel:   { flex: 1, color: colors.gray700, fontSize: 13 },
  voiceStatusText:    { flex: 1, color: colors.white, fontSize: 12 },
  voiceFallbackRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    alignItems: "center",
  },
  voiceFallbackInput: { flex: 1, marginRight: spacing.md },
});
