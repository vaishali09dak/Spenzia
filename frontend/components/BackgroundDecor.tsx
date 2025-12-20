import React from "react";
import { View, StyleSheet } from "react-native";

export default function BackgroundDecor() {
  return (
    <>
      {/* Large soft blobs */}
      <View style={[styles.circle, styles.circleTopLeft]} />
      <View style={[styles.circle, styles.circleBottomRight]} />

      {/* Medium blobs */}
      <View style={[styles.circle, styles.circleMidRight]} />
      <View style={[styles.circle, styles.circleMidLeft]} />

      {/* Small dots */}
      <View style={[styles.dot, { top: 90, left: 40 }]} />
      <View style={[styles.dot, { top: 200, right: 60 }]} />
      <View style={[styles.dot, { bottom: 180, left: 70 }]} />
      <View style={[styles.dot, { bottom: 120, right: 120 }]} />

      {/* Lines */}
      <View style={[styles.line, styles.lineOne]} />
      <View style={[styles.line, styles.lineTwo]} />

      {/* Pills (rounded bars) */}
      <View style={[styles.pill, styles.pillTop]} />
      <View style={[styles.pill, styles.pillBottom]} />
    </>
  );
}

const PRIMARY = "#1F305E";

const styles = StyleSheet.create({
  /* ---------- BLOBS ---------- */
  circle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: PRIMARY,
    opacity: 0.05,
  },
  circleTopLeft: {
    width: 160,
    height: 160,
    top: -50,
    left: -50,
  },
  circleBottomRight: {
    width: 220,
    height: 220,
    bottom: -80,
    right: -80,
  },
  circleMidRight: {
    width: 100,
    height: 100,
    top: 280,
    right: -40,
    opacity: 0.04,
  },
  circleMidLeft: {
    width: 90,
    height: 90,
    bottom: 260,
    left: -30,
    opacity: 0.04,
  },

  /* ---------- DOTS ---------- */
  dot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    opacity: 0.12,
  },

  /* ---------- LINES ---------- */
  line: {
    position: "absolute",
    height: 2,
    backgroundColor: PRIMARY,
    opacity: 0.08,
    borderRadius: 2,
  },
  lineOne: {
    width: 220,
    top: 150,
    left: -50,
    transform: [{ rotate: "-18deg" }],
  },
  lineTwo: {
    width: 260,
    bottom: 220,
    right: -70,
    transform: [{ rotate: "14deg" }],
  },

  /* ---------- PILLS ---------- */
  pill: {
    position: "absolute",
    height: 12,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    opacity: 0.07,
  },
  pillTop: {
    width: 70,
    top: 110,
    right: 50,
    transform: [{ rotate: "20deg" }],
  },
  pillBottom: {
    width: 90,
    bottom: 90,
    left: 40,
    transform: [{ rotate: "-25deg" }],
  },
});
