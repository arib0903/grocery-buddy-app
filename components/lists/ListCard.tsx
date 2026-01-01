/*
 * This displays ONE grocery list card on the home screen.
 */

// ===========================================
// IMPORTS
// ===========================================
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ===========================================
// DEFINE  PROPS (What data this needs)
// ===========================================
interface ListCardProps {
  listName: string;
  storeName: string;
  itemCount: number;
  onPress: () => void;
  iconColor?: string;
}

export default function ListCard(listCardData: ListCardProps) {
  //destructure:
  const {
    listName,
    storeName,
    itemCount,
    onPress,
    iconColor = "#4CAF50",
  } = listCardData;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardContent}>
        {/* Left side - Icon with clipboard */}
        <View
          style={[styles.iconCircle, { backgroundColor: iconColor + "20" }]}
        >
          <Ionicons name="clipboard-outline" size={24} color={iconColor} />
        </View>

        {/* Middle section - Text */}
        <View style={styles.textSection}>
          <Text style={styles.listName}>{listName}</Text>
          <Text style={styles.storeInfo}>
            {storeName} • {itemCount} items
          </Text>
        </View>

        {/* Right side - Arrow */}
        <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF", // White background
    borderRadius: 12, // Rounded corners
    padding: 16, // Inner spacing
    marginVertical: 6, // Space between cards
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row", // Arrange children in a row
    alignItems: "center", // Center vertically
  },
  iconCircle: {
    width: 48, // Circle size
    height: 48,
    borderRadius: 24, // Make it circular (half of width/height)
    marginRight: 12, // Space between icon and text
    alignItems: "center",
    justifyContent: "center",
  },
  textSection: {
    flex: 1,
  },
  listName: {
    fontSize: 18,
    fontWeight: "500", // Semi-bold
    color: "#000000",
    marginBottom: 4,
  },
  storeInfo: {
    fontSize: 14,
    color: "#757575", // Gray text
  },
});
