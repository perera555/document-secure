/** Newest first. Shown in the "What's new" bar after an update. Keep items short and plain. */
export const CHANGELOG: { date: string; title: string; items: string[] }[] = [
  {
    date: "2026-11-25",
    title: "Admin PIN login, Admin panel and easier forms",
    items: [
      "Fixed: people added with the full form now always appear",
      "Scan straight from the printer-scanner (Windows helper “DocSecure Scan”); scans are filed hands-free",
      "Anyone can add people and save documents; updating and deleting need the admin PIN",
      "Admin panel: dashboard of all people and documents with edit, delete and download",
      "Add more admins, each with their own PIN",
      "New 4-step Add person form with a live 3D ID card",
      "Date of birth as Day / Month / Year lists; Gender as a simple choice",
      "Show a document full screen (e.g. to a doctor), Share by WhatsApp/email, Print",
      "Download one document, one folder, one person or everything",
      "File names are used to find the person and folder automatically",
      "Auto-save to a folder on this computer, and a User & Admin guide",
    ],
  },
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
