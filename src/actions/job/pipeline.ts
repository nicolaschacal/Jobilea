"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { IN_PROCESS_STATUS } from "@/lib/pipeline";
import { requireUser } from "../shared";

// Installs seeded before the Application Pipeline existed have no
// "In Process" status; the board calls this before the first drop there.
export const ensurePipelineStatus = async (
  value: string,
): Promise<any | undefined> => {
  try {
    await requireUser();
    if (value !== IN_PROCESS_STATUS.value) {
      throw new Error("Unknown pipeline status");
    }
    const status = await prisma.jobStatus.upsert({
      where: { value: IN_PROCESS_STATUS.value },
      update: {},
      create: { ...IN_PROCESS_STATUS },
    });
    return { status, success: true };
  } catch (error) {
    return handleError(error, "Failed to create pipeline status.");
  }
};
