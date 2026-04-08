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
  TouchableOpacity,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useRouter } from "expo-router";

import ListCard from "../components/lists/ListCard";

// import { dummyLists } from "../lib/mock/dummyLists";
import SearchBar from "../components/common/SearchBar";
import { colors } from "../constants/colors";
import { spacing } from "../constants/spacing";
import { Ionicons } from "@expo/vector-icons";
import { useLists } from "../lib/state/listContext";
import { useSessions } from "../lib/state/sessionContext";
import { ShoppingSession } from "../lib/types";

// ===========================================
// CREATING THE COMPONENT
// ===========================================
export default function MyListsScreen() {
  const router = useRouter();
  const { lists, getListById } = useLists();
  const { sessions } = useSessions();

  const activeSessions = sessions.filter((s) => !s.completedAt);

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

      {/* ACTIVE LISTS — in-progress shopping sessions */}
      {activeSessions.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>ACTIVE LISTS</Text>
          </View>
          {activeSessions.map((session: ShoppingSession) => {
            const list = getListById(session.listId);
            const storeName = list?.store ?? "Store";
            const listName = list?.name ?? "Shopping Trip";
            const total = session.items.length;
            const checked = session.items.filter((i) => i.completed).length;
            const progress = total > 0 ? checked / total : 0;

            return (
              <TouchableOpacity
                key={session.id}
                style={styles.activeSessionCard}
                onPress={() => router.push(`/shopping/${session.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.activeSessionIcon}>
                  <Ionicons
                    name="cart"
                    size={20}
                    color={colors.shoppingGreen}
                  />
                </View>
                <View style={styles.activeSessionInfo}>
                  <Text style={styles.activeSessionStore}>{storeName}</Text>
                  <Text style={styles.activeSessionMeta}>
                    {listName} • {checked}/{total} items
                  </Text>
                  <View style={styles.activeProgressTrack}>
                    <View
                      style={[styles.activeProgressFill, { flex: progress }]}
                    />
                    <View style={{ flex: 1 - progress }} />
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.gray400}
                />
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {/* BLUEPRINTS Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>BLUEPRINTS</Text>
      </View>

      {/* List of cards */}
      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ListCard
            listName={item.name}
            storeName={item.store}
            itemCount={item.items.length}
            iconColor={
              index === 0 ? "#4CAF50" : index === 1 ? "#FF9800" : "#9C27B0"
            }
            onPress={() => handleListDetail(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
      />

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons
            name="list-outline"
            size={24}
            color={colors.shoppingGreen}
          />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Lists</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="cart-outline" size={24} color={colors.gray400} />
          <Text style={styles.navLabel}>Shopping</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/archive")}
        >
          <Ionicons name="archive-outline" size={24} color={colors.gray400} />
          <Text style={styles.navLabel}>Archive</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="settings-outline" size={24} color={colors.gray400} />
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
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
  activeSessionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 14,
    borderRadius: spacing.borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.shoppingGreen,
    shadowColor: colors.black,
    shadowOffset: spacing.shadowOffset.small,
    shadowOpacity: spacing.shadowOpacity.light,
    shadowRadius: spacing.shadowRadius.small,
    elevation: 2,
  },
  activeSessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.shoppingGreenLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  activeSessionInfo: {
    flex: 1,
  },
  activeSessionStore: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray900,
  },
  activeSessionMeta: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 2,
    marginBottom: 6,
  },
  activeProgressTrack: {
    height: 4,
    backgroundColor: colors.gray200,
    borderRadius: 2,
    flexDirection: "row",
    overflow: "hidden",
  },
  activeProgressFill: {
    backgroundColor: colors.shoppingGreen,
    borderRadius: 2,
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    paddingVertical: spacing.sm,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
    gap: 2,
  },
  navLabel: {
    fontSize: 11,
    color: colors.gray400,
  },
  navLabelActive: {
    color: colors.shoppingGreen,
    fontWeight: "600",
  },
});
