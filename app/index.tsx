/*
 * ===========================================
 *  HOME SCREEN - My Lists
 * ===========================================
 */

// ===========================================
// IMPORTS
// ===========================================

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useRouter } from "expo-router";

import ListCard from "../components/lists/ListCard";

// import { dummyLists } from "../lib/mock/dummyLists";
import SearchBar from "../components/common/SearchBar";
import { colors } from "../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useLists } from "../lib/state/listContext";

// ===========================================
// CREATING THE COMPONENT
// ===========================================
export default function MyListsScreen() {
  const router = useRouter();
  const { lists } = useLists();

  const handleListDetail = (listId: string) => {
    router.push(`/list/${listId}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      {/*HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Arib Household</Text>
      </View>

      {/*SEARCH */}
      <View style={styles.searchContainer}>
        <SearchBar showSearchIcon={true} placeholder="Search for lists..." />
      </View>

      {/*CREATE LIST */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => router.push("/create-list")}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="add" size={24} color="white" />
        </View>
        <Text style={styles.buttonText}>Create New List</Text>
      </TouchableOpacity>

      {/* ACTIVE LISTS Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>ACTIVE LISTS</Text>
      </View>

      {/* List of cards */}
      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ListCard
            listName={item.name}
            storeName="Walmart"
            itemCount={item.items.length}
            iconColor={
              index === 0 ? "#4CAF50" : index === 1 ? "#FF9800" : "#9C27B0"
            }
            onPress={() => handleListDetail(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5", // Light gray background
  },
  listContent: {
    paddingVertical: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    padding: 20,
    marginTop: 40,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D0D0D0",
    borderRadius: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  plusIcon: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  buttonText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
});
