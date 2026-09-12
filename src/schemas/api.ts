import { z } from 'zod';

// Schema for the expected OCR output from Rishi's pipeline
export const OCRExtractionSchema = z.object({
  medicationName: z.string().min(1, 'Medication name is required'),
  dosage: z.string().optional(),
  confidenceScore: z.number().min(0).max(1),
  rawText: z.string(),
});
export type OCRExtraction = z.infer<typeof OCRExtractionSchema>;

// Schema for Atharv's Interaction Warning System
export const InteractionAlertSchema = z.object({
  severity: z.enum(['Severe', 'Moderate', 'Minor']),
  description: z.string(),
  drugsInvolved: z.array(z.string()).min(2),
});
export type InteractionAlert = z.infer<typeof InteractionAlertSchema>;

// Unified Chronological Record Item
export const MedicationRecordSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  dosage: z.string(),
  dateAdded: z.string().datetime(), // ISO string
  prescribedBy: z.string().optional(),
});
export type MedicationRecord = z.infer<typeof MedicationRecordSchema>;
