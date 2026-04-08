/*
 * APP FOLDER: Contains all the screens/pages of your mobile app
 * This folder uses Expo Router for navigation - file names become routes automatically
 *
 * THIS FILE (_layout.tsx): Sets up the main navigation structure for your entire app
 * Think of this as the "frame" that holds all your different screens
 */

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ListProvider } from "../lib/state/listContext";
import { SessionProvider } from "../lib/state/sessionContext";

export default function RootLayout() {
  return (
    <ListProvider>
      <SessionProvider>
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen
            name="index"
            options={{
              title: "My Lists",
              headerStyle: {
                backgroundColor: "#f8f9fa",
              },
              headerTitleStyle: {
                fontWeight: "bold",
              },
            }}
          />
          <Stack.Screen
            name="create-list/index"
            options={{
              title: "Create New List",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="list/[id]"
            options={{
              title: "List Details",
            }}
          />
          <Stack.Screen
            name="login"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="shopping/[id]"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="archive/index"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
      </SessionProvider>
    </ListProvider>
  );
}
