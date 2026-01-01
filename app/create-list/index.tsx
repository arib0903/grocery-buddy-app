/*
 * THIS FILE (create-list/index.tsx): The CREATE NEW LIST screen
 * This screen appears when users want to make a new grocery list
 * Users can enter a name for their new list and save it
 * The "create-list" folder name makes this route accessible at "/create-list"
 */

import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Alert,
} from "react-native";
import { STORES } from "../../constants/stores";
import StoreCard from "../../components/lists/StoreCard";
import { useState } from "react";
import { router } from "expo-router";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import SearchBar from "../../components/common/SearchBar";
import { useLists } from "../../lib/state/listContext";
import { GroceryList } from "../../lib/types";

export default function CreateList() {
  const [listName, setListName] = useState("");
  const [selectedStore, setSelectedStore] = useState("");
  const { lists, addList } = useLists();

  const handleCreateList = () => {
    // Validate inputs
    if (!listName.trim()) {
      Alert.alert("Please enter a list name");
      return;
    }
    if (!selectedStore) {
      Alert.alert("Please select a store");
      return;
    }

    //Save the list to state/backend
    const newList: GroceryList = addList(listName, selectedStore);

    // Navigate to the list of groceries items (will display nothing in the beginning since list created)
    router.push("/list/" + newList.id);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Create Grocery List</Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* List Name Input */}
        <View style={styles.section}>
          <Text style={styles.label}>List Name</Text>

          <SearchBar
            placeholder="e.g., Weekly Groceries"
            value={listName}
            onChangeText={setListName}
            showSearchIcon={false}
          />
        </View>

        {/* Store Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Select Store</Text>
          <View style={styles.storeGrid}>
            {STORES.map((store) => (
              <View key={store.id} style={styles.storeCardWrapper}>
                <StoreCard
                  store={store}
                  isSelected={selectedStore === store.id}
                  onPress={() => setSelectedStore(store.id)}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Fixed Create Button */}
      <View style={styles.buttonContainer}>
        <Pressable style={styles.createButton} onPress={handleCreateList}>
          <Text style={styles.createButtonText}>Create List</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.sm,
  },
  backButtonText: {
    fontSize: 24,
    color: colors.gray700,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.gray900,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginTop: spacing.xl,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray700,
    marginBottom: spacing.md,
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
  storeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.sm,
  },
  storeCardWrapper: {
    width: "50%",
    padding: spacing.sm,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: colors.gray50,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray900,
    marginBottom: spacing.xs,
  },
  infoDescription: {
    fontSize: 14,
    color: colors.gray600,
    lineHeight: 20,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  createButton: {
    backgroundColor: colors.success,
    borderRadius: spacing.borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
