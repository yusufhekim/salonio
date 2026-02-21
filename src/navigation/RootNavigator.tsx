import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { BarberNavigator } from "../features/barber/navigation";
import { CustomerNavigator } from "../features/customer/navigation";
import AuthNavigator from "./AuthNavigator";

export default function RootNavigator() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

  if (role === "barber") {
    return <BarberNavigator />;
  }

  if (role === "customer") {
    return <CustomerNavigator />;
  }

  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});
