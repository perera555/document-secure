# DocSecure – Family Document Vault

Scan family documents with a phone camera or a printer-scanner. DocSecure reads each one, works out who it belongs to (for example **P R Perera**) and files it into that person's folders: Medical, Passport, National ID, Driving License, Birth/Marriage certificates, Bank, Insurance, Property, Vehicle, Tax, Work, Other.

Installable app (PWA) for Windows, macOS, Linux, Android, iPhone and iPad.

## Features

- **Person cards** with photo and details: NIC/ID, date of birth, passport, birth and marriage certificate numbers, driving licence, mobile, phone, email, blood group, address, plus custom fields.
- **Scanning**
  - Phone: the native camera at full resolution.
  - Computer: an in-app document camera that detects every connected camera.
  - Printer / scanner: choose the scanner's save folder once and new scans are **imported automatically** (Chrome/Edge desktop). Upload images or PDFs also works.
  - Enhance filters (auto, vivid colour, grayscale, B&W) and rotate. Pages are kept at print quality (up to 3600px).
- **Automatic reading**
  - With an Anthropic API key, Claude reads the owner, document type, numbers, dates and every field.
  - Without a key, free on-device OCR (Tesseract) runs instead and works offline.
- **Owner matching** by name, initials ("P R Perera" ≈ "Pathirage Ranjith Perera") or ID number. Details found in a document fill in empty profile fields automatically.
- Download, print, edit, move and delete any document. Expiry warnings for passports and licences.
- **Privacy**: all documents are stored on the device (IndexedDB). Use *Settings → Download backup* to back up or move data to another device.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY
npm run dev
```

## Environment variables

| Name | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Optional. Turns on AI reading of documents. |
| `APP_ACCESS_CODE` | Recommended when deployed with a key. Users must enter this code in Settings before the AI can be used, so strangers can't spend your API credit. |

## Deploy

Deploy to Vercel and set the variables above under *Project → Settings → Environment Variables*.
