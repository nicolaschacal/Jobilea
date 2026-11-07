// Application Pipeline: the Kanban stages Jobilea shows, mapped onto the
// underlying JobStatus values. A card sits in the first stage whose
// `statuses` contains its status; dropping a card on a stage sets the
// stage's `dropStatus`.

export type PipelineStage = {
  id: string;
  label: string;
  dropStatus: string;
  statuses: string[];
  accent: string;
};

export const IN_PROCESS_STATUS = {
  label: "In Process",
  value: "in-process",
} as const;

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "to-apply",
    label: "Por aplicar",
    dropStatus: "draft",
    statuses: ["new", "draft"],
    accent: "bg-slate-400",
  },
  {
    id: "applied",
    label: "Postulado",
    dropStatus: "applied",
    statuses: ["applied"],
    accent: "bg-blue-500",
  },
  {
    id: "in-process",
    label: "En proceso",
    dropStatus: IN_PROCESS_STATUS.value,
    statuses: [IN_PROCESS_STATUS.value],
    accent: "bg-violet-500",
  },
  {
    id: "interview",
    label: "Entrevista",
    dropStatus: "interview",
    statuses: ["interview"],
    accent: "bg-amber-500",
  },
  {
    id: "offer",
    label: "Oferta",
    dropStatus: "offer",
    statuses: ["offer", "offer-accepted", "offer-declined"],
    accent: "bg-emerald-500",
  },
  {
    id: "closed",
    label: "Rechazado / Cerrado",
    dropStatus: "rejected",
    statuses: ["rejected", "expired", "archived", "withdrawn"],
    accent: "bg-rose-500",
  },
];

export function stageForStatus(statusValue?: string | null): PipelineStage {
  return (
    PIPELINE_STAGES.find((s) => statusValue && s.statuses.includes(statusValue)) ??
    PIPELINE_STAGES[0]
  );
}
