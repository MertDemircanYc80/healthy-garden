// Healthy Garden design tokens. Use these instead of raw values in components.
//
// Idea: the garden is the hero and stays put; everything else lives on one deep-pine
// "island" floating over the meadow. Light text on pine, warm sun yellow for rewards.

export const C = {
  // island (dark surface)
  pine: "#16301F",
  pineRaised: "#20402B",
  pineLine: "#2E5239",
  moss: "#A8D08D", // primary accent on pine (progress, active tab)
  mist: "#E7F0E2", // primary text on pine
  fern: "#9DB7A2", // secondary text on pine
  sun: "#F4C95D", // coins, sunlight, rewards
  berry: "#F08A7E", // alerts that need attention
  sky: "#8CC7E8", // water, sleep

  // garden scene
  meadow: "#86BC63",
  meadowDeep: "#5E9A47",
  soil: "#8B5B3A",
  soilDark: "#6E4429",
  wood: "#C99A68",
} as const;

export const F = {
  display: "Fraunces_600SemiBold",
  displayBold: "Fraunces_700Bold",
  displayItalic: "Fraunces_500Medium_Italic",
} as const;

/** Type scale (pt). Body uses the platform font (SF Pro / Roboto) for native feel. */
export const T = {
  hero: 30,
  title: 22,
  heading: 17,
  body: 15,
  small: 13,
  tiny: 11,
} as const;

export const R = {
  island: 34,
  card: 20,
  pill: 999,
} as const;
