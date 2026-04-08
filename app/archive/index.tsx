/*
 * THIS FILE (archive/index.tsx): The SHOPPING HISTORY screen
 * Shows all completed shopping sessions sorted by most recent.
 * Route: /archive
 * Reached from: bottom tab bar "Archive" on any screen with a nav bar.
 */

import { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { useSessions } from "../../lib/state/sessionContext";
import { useLists } from "../../lib/state/listContext";
import { ShoppingSession } from "../../lib/types";
import SearchBar from "../../components/common/SearchBar";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ArchiveScreen() {
  const router = useRouter();
  const { sessions } = useSessions();
  const { getListById } = useLists();
  const [searchQuery, setSearchQuery] = useState("");

  // Completed sessions only, sorted newest first
  const completedSessions = useMemo(
    () =>
      sessions
        .filter((s) => !!s.completedAt)
        .sort(
          (a, b) =>
            new Date(b.completedAt!).getTime() -
            new Date(a.completedAt!).getTime(),
        ),
    [sessions],
  );

  // Search filter: match store name or list name
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return completedSessions;
    const q = searchQuery.toLowerCase();
    return completedSessions.filter((s) => {
      const list = getListById(s.listId);
      return (
        list?.store?.toLowerCase().includes(q) ||
        list?.name?.toLowerCase().includes(q)
      );
    });
  }, [completedSessions, searchQuery, getListById]);

  // ── Stats ────────────────────────────────────────────────────────────────

  const totalTrips = completedSessions.length;
  const avgItems =
    totalTrips > 0
      ? Math.round(
          completedSessions.reduce((sum, s) => sum + s.items.length, 0) /
            totalTrips,
        )
      : 0;

  // ── Render item ──────────────────────────────────────────────────────────

  const renderTrip = ({ item: session }: { item: ShoppingSession }) => {
    const list = getListById(session.listId);
    const storeName = list?.store ?? "Unknown Store";
    const listName = list?.name ?? "Shopping Trip";
    const totalItems = session.items.length;
    const checkedItems = session.items.filter((i) => i.completed).length;
    const date = session.completedAt ? formatDate(session.completedAt) : "";

    return (
      <View style={styles.tripRow}>
        {/* Store icon */}
        <View style={styles.tripIcon}>
          <Ionicons
            name="cart-outline"
            size={20}
            color={colors.shoppingGreen}
          />
        </View>

        {/* Main info */}
        <View style={styles.tripInfo}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripStore}>{storeName}</Text>
            <View style={styles.receiptBadge}>
              <Text style={styles.receiptText}>Receipt</Text>
            </View>
          </View>
          <Text style={styles.tripMeta}>
            {date} • {totalItems} items • {checkedItems}/{totalItems} checked
          </Text>
          <Text style={styles.tripListName}>{listName}</Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
      </View>
    );
  };

  // ── JSX ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping History</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchBar
          showSearchIcon
          placeholder="Search past trips..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Stats cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statCardBlue]}>
          <View style={[styles.statIcon, styles.statIconBlue]}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={colors.primary}
            />
          </View>
          <Text style={styles.statLabel}>Total Trips</Text>
          <Text style={styles.statValue}>{totalTrips}</Text>
        </View>

        <View style={[styles.statCard, styles.statCardGray]}>
          <View style={[styles.statIcon, styles.statIconGray]}>
            <Ionicons name="timer-outline" size={20} color={colors.gray500} />
          </View>
          <Text style={styles.statLabel}>Avg Items</Text>
          <Text style={styles.statValue}>{avgItems}</Text>
        </View>
      </View>

      {/* Section header */}
      <Text style={styles.sectionHeader}>RECENT TRIPS</Text>

      {/* Trip list */}
      <FlatList
        data={filteredSessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={colors.gray300} />
            <Text style={styles.emptyText}>
              {searchQuery
                ? "No trips match your search."
                : "No completed trips yet.\nFinish a shopping session to see it here."}
            </Text>
          </View>
        }
        renderItem={renderTrip}
      />

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/")}
        >
          <Ionicons name="list-outline" size={24} color={colors.gray400} />
          <Text style={styles.navLabel}>Lists</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="cart-outline" size={24} color={colors.gray400} />
          <Text style={styles.navLabel}>Shopping</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons
            name="archive-outline"
            size={24}
            color={colors.shoppingGreen}
          />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Archive</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="settings-outline" size={24} color={colors.gray400} />
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ─────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "600",
    color: colors.gray900,
  },

  // ── Search ─────────────────────────────────────────────────────────────
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },

  // ── Stats ──────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    alignItems: "flex-start",
  },
  statCardBlue: {
    backgroundColor: "#EFF6FF",
  },
  statCardGray: {
    backgroundColor: colors.gray100,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  statIconBlue: {
    backgroundColor: "#DBEAFE",
  },
  statIconGray: {
    backgroundColor: colors.gray200,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray500,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.gray900,
  },

  // ── Section header ─────────────────────────────────────────────────────
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },

  // ── Trip list ──────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl + 64, // room for bottom nav
  },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  tripIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  tripInfo: {
    flex: 1,
  },
  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  tripStore: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray900,
  },
  receiptBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: spacing.borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  receiptText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.shoppingGreen,
  },
  tripMeta: {
    fontSize: 13,
    color: colors.gray500,
    marginBottom: 2,
  },
  tripListName: {
    fontSize: 13,
    color: colors.gray400,
  },

  // ── Empty state ────────────────────────────────────────────────────────
  emptyContainer: {
    alignItems: "center",
    paddingTop: spacing.xxxl * 2,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 15,
    color: colors.gray500,
    textAlign: "center",
    lineHeight: 22,
  },

  // ── Bottom nav ─────────────────────────────────────────────────────────
  bottomNav: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.lg,
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
