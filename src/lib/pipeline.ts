// Application Pipeline: the Kanban stages Jobilea shows, mapped onto the
// underlying JobStatus values. A card sits in the first stage whose
// `statuses` contains its status; dropping a card on a stage sets the
// stage's `dropStatus`.

export type PipelineStage = {
  id: string;
  label: string;
  // One plain-language line under the column name, for people who have never
  // used a tracker: what kind of application belongs here.
  hint: string;
  empty: string;
  dropStatus: string;
  statuses: string[];
  // Tailwind classes: the stage dot, and the tinted column header.
  dot: string;
  tint: string;
};

export const IN_PROCESS_STATUS = {
  label: "In Process",
  value: "in-process",
} as const;

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "to-apply",
    label: "Por aplicar",
    hint: "Trabajos que te interesan y todavía no enviaste",
    empty: "Guardá acá los avisos que te gustaron",
    dropStatus: "draft",
    statuses: ["new", "draft"],
    dot: "bg-slate-400",
    tint: "bg-slate-100 dark:bg-slate-800/70",
  },
  {
    id: "applied",
    label: "Postulado",
    hint: "Ya mandaste tu CV",
    empty: "Cuando te postules, arrastrá la tarjeta acá",
    dropStatus: "applied",
    statuses: ["applied"],
    dot: "bg-sky-500",
    tint: "bg-sky-50 dark:bg-sky-950/60",
  },
  {
    id: "in-process",
    label: "En proceso",
    hint: "Te contactaron o están revisando tu perfil",
    empty: "Si te llaman o te escriben, movela acá",
    dropStatus: IN_PROCESS_STATUS.value,
    statuses: [IN_PROCESS_STATUS.value],
    dot: "bg-violet-500",
    tint: "bg-violet-50 dark:bg-violet-950/60",
  },
  {
    id: "interview",
    label: "Entrevista",
    hint: "Tenés una entrevista agendada o ya la hiciste",
    empty: "Tus entrevistas van a aparecer acá",
    dropStatus: "interview",
    statuses: ["interview"],
    dot: "bg-teal-500",
    tint: "bg-teal-50 dark:bg-teal-950/60",
  },
  {
    id: "offer",
    label: "Oferta",
    hint: "¡Te ofrecieron el puesto!",
    empty: "Acá llegan las buenas noticias",
    dropStatus: "offer",
    statuses: ["offer", "offer-accepted", "offer-declined"],
    dot: "bg-[#FFB020]",
    tint: "bg-[#FFF4DB] dark:bg-[#3A2A05]",
  },
  {
    id: "closed",
    label: "Rechazado / Cerrado",
    hint: "No siguió adelante. También es parte del camino",
    empty: "Nada por acá, y está bien",
    dropStatus: "rejected",
    statuses: ["rejected", "expired", "archived", "withdrawn"],
    dot: "bg-rose-400",
    tint: "bg-rose-50 dark:bg-rose-950/50",
  },
];

export function stageForStatus(statusValue?: string | null): PipelineStage {
  return (
    PIPELINE_STAGES.find((s) => statusValue && s.statuses.includes(statusValue)) ??
    PIPELINE_STAGES[0]
  );
}
