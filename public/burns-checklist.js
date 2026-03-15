// Burns Depression Checklist (BDC) — from "Feeling Good" by David Burns
// 25 items, each rated 0-4
// 0 = Not at All, 1 = Somewhat, 2 = Moderately, 3 = A Lot, 4 = Extremely

export const categories = [
  { key: "thoughts", label: "Thoughts and Feelings" },
  { key: "activities", label: "Activities and Personal Relationships" },
  { key: "physical", label: "Physical Symptoms" },
  { key: "suicidal", label: "Suicidal Urges" },
];

export const checklist = [
  // Thoughts and Feelings
  { id: 1,  text: "Feeling sad or down in the dumps", category: "thoughts" },
  { id: 2,  text: "Feeling unhappy or blue", category: "thoughts" },
  { id: 3,  text: "Crying spells or tearfulness", category: "thoughts" },
  { id: 4,  text: "Feeling discouraged", category: "thoughts" },
  { id: 5,  text: "Feeling hopeless", category: "thoughts" },
  { id: 6,  text: "Low self-esteem", category: "thoughts" },
  { id: 7,  text: "Feeling worthless or inadequate", category: "thoughts" },
  { id: 8,  text: "Guilt or shame", category: "thoughts" },
  { id: 9,  text: "Criticizing yourself or blaming yourself", category: "thoughts" },
  { id: 10, text: "Difficulty making decisions", category: "thoughts" },

  // Activities and Personal Relationships
  { id: 11, text: "Loss of interest in family, friends, or colleagues", category: "activities" },
  { id: 12, text: "Loneliness", category: "activities" },
  { id: 13, text: "Spending less time with family or friends", category: "activities" },
  { id: 14, text: "Loss of motivation", category: "activities" },
  { id: 15, text: "Loss of interest in work or other activities", category: "activities" },
  { id: 16, text: "Avoiding work or other activities", category: "activities" },
  { id: 17, text: "Loss of pleasure or satisfaction in life", category: "activities" },

  // Physical Symptoms
  { id: 18, text: "Feeling tired", category: "physical" },
  { id: 19, text: "Difficulty sleeping or sleeping too much", category: "physical" },
  { id: 20, text: "Decreased or increased appetite", category: "physical" },
  { id: 21, text: "Loss of interest in sex", category: "physical" },
  { id: 22, text: "Worrying about your health", category: "physical" },

  // Suicidal Urges
  { id: 23, text: "Do you have any suicidal thoughts?", category: "suicidal", sensitive: true },
  { id: 24, text: "Would you like to end your life?", category: "suicidal", sensitive: true },
  { id: 25, text: "Do you have a plan for harming yourself?", category: "suicidal", sensitive: true },
];

export const ratingLabels = ['Not at All', 'Somewhat', 'Moderately', 'A Lot', 'Extremely'];

export const scoreRanges = [
  { min: 0,  max: 5,  label: "No depression", color: "#4ade80", description: "You're doing well. No significant depression." },
  { min: 6,  max: 10, label: "Normal but unhappy", color: "#a3e635", description: "A little down, but within normal range." },
  { min: 11, max: 25, label: "Mild depression", color: "#facc15", description: "Mild mood disturbance. The techniques in this app can really help." },
  { min: 26, max: 50, label: "Moderate depression", color: "#fb923c", description: "Moderate depression. Keep using the tools here, and consider talking to someone you trust." },
  { min: 51, max: 75, label: "Severe depression", color: "#f87171", description: "Significant depression. Please consider reaching out to a therapist or counselor. You deserve support." },
  { min: 76, max: 100, label: "Extreme depression", color: "#dc2626", description: "This is serious. Please reach out to a mental health professional. You don't have to go through this alone." },
];

export function getScoreRange(score) {
  return scoreRanges.find(r => score >= r.min && score <= r.max) || scoreRanges[scoreRanges.length - 1];
}
