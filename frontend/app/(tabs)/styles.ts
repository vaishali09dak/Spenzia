import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9F2", // cream background
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  monthText: {
    fontSize: 16,
    color: "#8A8A8A",
    marginBottom: 14,
  },

  balanceCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 34,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 6,
  },

  balanceLabel: {
    fontSize: 14,
    color: "#9A9A9A",
    marginBottom: 6,
  },

  balanceAmount: {
    fontSize: 34,
    fontWeight: "600",
    color: "#2E2E2E",
  },

  caption: {
    marginTop: 22,
    fontSize: 14,
    color: "#A0A0A0",
  },
});
