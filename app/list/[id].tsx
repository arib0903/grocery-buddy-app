/*
 * THIS FILE (list/[id].tsx): The LIST DETAILS screen
 * This shows the contents of a specific grocery list with all its items
 * The [id] in brackets means this is a "dynamic route" - it can show any list
 * For example: "/list/123" would show the list with ID 123
 */
//imports:
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";

import { useLocalSearchParams } from "expo-router";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { useLists } from "../../lib/state/listContext";
import { GroceryList } from "../../lib/types";
import SearchBar from "../../components/common/SearchBar";
import { Ionicons } from "@expo/vector-icons";

export default function ListDetail() {
  const [itemName, setItemName] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");

  const { getListById, addItemToList, toggleItem, deleteItem, updateItem } =
    useLists();
  const { id } = useLocalSearchParams<{ id: string }>();

  //Get specific list:
  const currentList: GroceryList | undefined = getListById(id);
  const currentListName = currentList?.name;
  const currentListStore = currentList?.store;

  const handleAddItem = () => {
    //validate:
    if (!itemName.trim()) {
      Alert.alert("Error", "Please enter an item name");
      return;
    }

    //Add item to list:
    addItemToList(id, itemName);

    //Clear input:
    setItemName("");
  };

  //   const handleToggleItem = (itemId: string) => {
  //     toggleItem(id, itemId);
  //   };

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
    // TODO: Navigate to shopping mode
    Alert.alert("Shopping Mode", "Shopping mode coming soon!");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.listName}>{currentListName}</Text>
          <Text style={styles.storeName}>{currentListStore}</Text>
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

      {/* Add Item Section */}
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

      {/* Items List */}
      <FlatList
        data={currentList?.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No items yet. Add your first item!
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            {editingItemId === item.id ? (
              // Edit Mode
              <>
                <SearchBar
                  placeholder="Item name"
                  value={editedName}
                  onChangeText={setEditedName}
                  showSearchIcon={false}
                  containerStyle={styles.editInput}
                />
                <TouchableOpacity
                  onPress={handleSaveEdit}
                  style={styles.saveButton}
                >
                  <Ionicons name="checkmark" size={24} color="white" />
                </TouchableOpacity>
              </>
            ) : (
              // View Mode
              <>
                <View style={styles.itemDetails}>
                  <Text
                    style={[
                      styles.itemName,
                      item.completed && styles.itemNameCompleted,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {item.quantity && (
                    <Text style={styles.itemQuantity}>{item.quantity}</Text>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => handleEditItem(item.id, item.name)}
                  style={styles.editIconButton}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={colors.gray600}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteItem(item.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={colors.danger}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: colors.gray600,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerLeft: {
    flex: 1,
  },
  listName: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.gray900,
    marginBottom: spacing.xs,
  },
  storeName: {
    fontSize: 16,
    color: colors.gray600,
    marginBottom: spacing.xs,
  },
  itemCount: {
    fontSize: 14,
    color: colors.gray500,
  },
  startShoppingButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.lg,
  },
  startShoppingText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  addItemContainer: {
    flexDirection: "row",
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    alignItems: "center",
  },
  searchBarContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  addButton: {
    backgroundColor: colors.success,
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingVertical: spacing.sm,
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.gray300,
    marginRight: spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: colors.gray900,
  },
  itemNameCompleted: {
    textDecorationLine: "line-through",
    color: colors.gray500,
  },
  itemQuantity: {
    fontSize: 14,
    color: colors.gray600,
    marginTop: spacing.xs,
  },
  editIconButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  deleteButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  editInput: {
    flex: 1,
    marginRight: spacing.sm,
  },
  saveButton: {
    backgroundColor: colors.success,
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
});
