export const CONSTELLATION_STAR_IDS = [
  "seraphim",
  "diamond",
  "elior",
  "sentinel",
  "atlas",
  "aurelion",
  "aurora",
  "lumen",
  "legend",
  "kairo",
  "veris",
  "hermes",
  "olympus",
  "persephone",
] as const;

export const CONSTELLATION_STAR_NAMES = [
  "Seraphim",
  "Diamond",
  "Elior",
  "Sentinel",
  "Atlas",
  "Aurelion",
  "Aurora",
  "Lumen",
  "Legend",
  "Kairo",
  "Veris",
  "Hermes",
  "Olympus",
  "Persephone",
] as const;

export type ConstellationStarId = typeof CONSTELLATION_STAR_IDS[number];
