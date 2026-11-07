import { describe, expect, it } from "vitest";
import { PIPELINE_STAGES, stageForStatus } from "@/lib/pipeline";
import { JOB_STATUSES } from "@/lib/constants";

describe("Application Pipeline", () => {
  it("shows the six Jobilea stages in order", () => {
    expect(PIPELINE_STAGES.map((s) => s.label)).toEqual([
      "Por aplicar",
      "Postulado",
      "En proceso",
      "Entrevista",
      "Oferta",
      "Rechazado / Cerrado",
    ]);
  });

  it("places every seeded status in exactly one stage", () => {
    for (const status of JOB_STATUSES) {
      const hits = PIPELINE_STAGES.filter((s) => s.statuses.includes(status.value));
      expect(hits, status.value).toHaveLength(1);
    }
  });

  it("drops onto a status that exists and belongs to the stage", () => {
    const values = JOB_STATUSES.map((s) => s.value as string);
    for (const stage of PIPELINE_STAGES) {
      expect(values).toContain(stage.dropStatus);
      expect(stage.statuses).toContain(stage.dropStatus);
    }
  });

  it("falls back to Por aplicar for unknown statuses", () => {
    expect(stageForStatus("something-else").id).toBe("to-apply");
    expect(stageForStatus(undefined).id).toBe("to-apply");
    expect(stageForStatus("offer-declined").id).toBe("offer");
  });
});
