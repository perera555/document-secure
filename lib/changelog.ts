/** Newest first. Shown in the "What's new" bar after an update. Keep items short and plain. */
export const CHANGELOG: { date: string; title: string; items: string[] }[] = [
  {
    date: "2026-11-25",
    title: "Real folders for every person",
    items: [
      "Scans are filed automatically when it's clear whose document it is",
      "Smart file names, e.g. “Passport N1234567” or “National ID card 195867812345”",
      "Every document is saved as one PDF: Person › Folder › Document.pdf",
      "Adding a person creates their folder (with details and photo) on your computer",
      "The scan screen shows exactly where each document will be saved",
      "Renaming, moving or deleting keeps your computer folders up to date",
      "Update bar: you'll see this message whenever a new version is ready",
    ],
  },
  {
    date: "2026-11-10",
    title: "3D cards and new home page",
    items: ["3D ID-card style person cards", "Documents grouped by folder under each person", "ZIP download per person"],
  },
];
