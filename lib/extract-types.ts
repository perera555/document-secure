import { z } from "zod";
import { CATEGORY_IDS } from "./categories";

export const ExtractionSchema = z.object({
  ownerName: z
    .string()
    .describe("Full name of the person this document belongs to (patient, holder, account owner). Empty string if unknown."),
  ownerNameVariants: z
    .array(z.string())
    .describe("Other spellings of the owner's name found in the document, e.g. initials form 'P R Perera'."),
  category: z.enum(CATEGORY_IDS).describe("Best matching document folder."),
  title: z.string().describe("Short human title, e.g. 'Blood test report - Asiri Hospital' or 'Sri Lanka Passport'."),
  documentNumber: z.string().describe("Main ID / reference number (passport no, NIC, policy no, report no). Empty if none."),
  issueDate: z.string().describe("Issue / report date as YYYY-MM-DD, empty if none."),
  expiryDate: z.string().describe("Expiry date as YYYY-MM-DD, empty if none."),
  issuer: z.string().describe("Issuing organisation (hospital, department, bank). Empty if none."),
  dateOfBirth: z.string().describe("Owner date of birth as YYYY-MM-DD if shown, else empty."),
  nicNumber: z.string().describe("Sri Lankan NIC or other national ID number of the owner if shown, else empty."),
  summary: z.string().describe("One or two sentence plain-language summary of the document."),
  fields: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .describe(
      "All other important key/value details. Use these exact labels when present: 'Gender', 'Blood group', 'Address', 'Mobile', 'Phone', 'Email', 'Occupation', 'Passport number', 'Birth certificate number', 'Marriage certificate number', 'Driving licence number', plus any others (diagnosis, medicines, nationality, father's name...).",
    ),
  fullText: z.string().describe("Complete transcription of all readable text in the document."),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

export const emptyExtraction = (): Extraction => ({
  ownerName: "",
  ownerNameVariants: [],
  category: "other",
  title: "",
  documentNumber: "",
  issueDate: "",
  expiryDate: "",
  issuer: "",
  dateOfBirth: "",
  nicNumber: "",
  summary: "",
  fields: [],
  fullText: "",
});
