/**
 * Single source of truth for all clinic facts. The receptionist engine must
 * ONLY ever answer from this object — never from AI-generated text and never
 * from anything a patient claims in chat. See src/receptionist/safety.ts and
 * src/receptionist/intents.ts for how facts are matched and injected.
 */
export const CLINIC = {
  businessName: "Dr. Alamdin Microscopic Dental Clinic and Implant Center",
  doctor: {
    name: "Dr. Alamdin Tareen",
    qualifications: [
      "BDS (BMC)",
      "FCPS (Operative & Endodontics, CMH Quetta)",
      "C-Implant",
      "C-Veneers",
      "C-Endo",
      "C-Crown & Bridge"
    ],
    experienceYears: 6
  },
  location: {
    address: "Zain Business Center, Zarghoon Road, near Bukhari Sweet, Quetta",
    city: "Quetta",
    country: "Pakistan",
    coordinates: { lat: 30.1873, lng: 67.0012 },
    mapsUrl: "https://www.google.com/maps?q=30.1873,67.0012"
  },
  hours: {
    privateClinic: {
      label: "Private Clinic",
      days: "Monday–Sunday",
      time: "8:00 PM – 11:30 PM"
    },
    jelaniHospital: {
      label: "Jelani Hospital",
      days: "Monday–Saturday",
      time: "4:00 PM – 9:30 PM"
    }
  },
  consultationFeePKR: 500,
  phone: "0330-3786289",
  whatsappUrl: "https://wa.me/923303786289",
  ratings: [
    { source: "Google", score: "5.0/5", detail: "116 reviews" },
    { source: "Marham", score: "5.0/5", detail: "32 reviews" },
    { source: "Oladoc", score: "5.0/5", detail: "37 reviews" },
    { source: "Apka Muaalij", score: "4.5/5", detail: "92% satisfaction" }
  ],
  social: {
    tiktok: "@dralamdin",
    instagram: "@dentistalamdinquetta",
    facebook: "/DrAlamdintareen"
  },
  timezone: "Asia/Karachi"
} as const;

export type Clinic = typeof CLINIC;
