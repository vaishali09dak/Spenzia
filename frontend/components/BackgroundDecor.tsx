import React from "react";
import { View, StyleSheet } from "react-native";

export default function BackgroundDecor() {
  return (
    <>
      {/* Circles */}
      <View style={[styles.circle, styles.circleTopLeft]} />
      <View style={[styles.circle, styles.circleBottomRight]} />

      {/* Lines */}
      <View style={[styles.line, styles.lineOne]} />
      <View style={[styles.line, styles.lineTwo]} />
    </>
  );
}

const styles = StyleSheet.create({
  circle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#1F305E",
    opacity: 0.06,
  },
  circleTopLeft: {
    width: 140,
    height: 140,
    top: -40,
    left: -40,
  },
  circleBottomRight: {
    width: 180,
    height: 180,
    bottom: -60,
    right: -60,
  },
  line: {
    position: "absolute",
    height: 2,
    backgroundColor: "#1F305E",
    opacity: 0.08,
    borderRadius: 2,
  },
  lineOne: {
    width: 220,
    top: 140,
    left: -40,
    transform: [{ rotate: "-20deg" }],
  },
  lineTwo: {
    width: 260,
    bottom: 220,
    right: -60,
    transform: [{ rotate: "15deg" }],
  },
});
