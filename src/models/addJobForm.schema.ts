import { z } from "zod";
import { APP_CONSTANTS } from "@/lib/constants";

export const AddJobFormSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  title: z
    .string({
      error: "Job title is required.",
    })
    .min(2, {
      message: "Escribí el nombre del puesto.",
    }),
  company: z
    .string({
      error: "Company name is required.",
    })
    .min(2, {
      message: "Escribí el nombre de la empresa.",
    }),
  location: z
    .string({
      error: "Location is required.",
    })
    .min(2, {
      message: "Escribí el lugar.",
    }),
  type: z.string().min(1),
  workplaceType: z.string().optional(),
  source: z
    .string({
      error: "Source is required.",
    })
    .min(2, {
      message: "Escribí dónde lo viste.",
    }),
  status: z
    .string({
      error: "Status is required.",
    })
    .min(2, {
      message: "Elegí un estado.",
    })
    .default("draft"),
  dueDate: z.date(),
  /**
   * Note: Timezone offsets can be allowed by setting the offset option to true.
   * z.string().datetime({ offset: true });
   */
  //
  dateApplied: z.date().optional(),
  salaryRange: z.string().optional(),
  jobDescription: z
    .string({
      error: "Job description is required.",
    })
    .refine((val) => val === "N/A" || val.length >= 10, {
      message: "La descripción debe tener al menos 10 caracteres.",
    }),
  jobUrl: z.string().optional(),
  resume: z.string().optional(),
  coverLetter: z.string().optional(),
  tags: z
    .array(z.string())
    .max(APP_CONSTANTS.MAX_JOB_TAGS)
    .optional()
    .default([]),
});
