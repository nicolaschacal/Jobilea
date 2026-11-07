"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { JobResponse, JobStatus } from "@/models/job.model";
import { CircularScore } from "@/components/CircularScore";
import { CompanyLogo } from "./CompanyLogo";
import { JobActionsMenu } from "./JobActionsMenu";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { PIPELINE_STAGES, PipelineStage, stageForStatus } from "@/lib/pipeline";
import { ensurePipelineStatus } from "@/actions/job/pipeline";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

type MyJobsBoardProps = {
  jobs: JobResponse[];
  jobStatuses: JobStatus[];
  deleteJob: (id: string) => void;
  editJob: (id: string) => void;
  onChangeJobStatus: (id: string, status: JobStatus) => void;
  onAddNote: (jobId: string) => void;
};

function MyJobsBoard({
  jobs,
  jobStatuses,
  deleteJob,
  editJob,
  onChangeJobStatus,
  onAddNote,
}: MyJobsBoardProps) {
  const [alertOpen, setAlertOpen] = useState(false);
  const [jobIdToDelete, setJobIdToDelete] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  // Optimistic placement until the reload after the status update lands.
  const [moved, setMoved] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on touch so horizontal swipes still scroll the board.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor),
  );

  const columns = useMemo(() => {
    const byStage = new Map<string, JobResponse[]>(
      PIPELINE_STAGES.map((s) => [s.id, []]),
    );
    for (const job of jobs) {
      const stage = moved[job.id] ?? stageForStatus(job.Status?.value).id;
      byStage.get(stage)?.push(job);
    }
    return byStage;
  }, [jobs, moved]);

  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : null;
  const boardRef = useRef<HTMLDivElement>(null);

  // On a phone only one column fits, so the journey strip doubles as tabs.
  const scrollToStage = (stageId: string) => {
    const column = boardRef.current?.querySelector<HTMLElement>(
      `[data-stage="${stageId}"]`,
    );
    column?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    column?.focus({ preventScroll: true });
  };

  const onDeleteJob = (jobId: string) => {
    setAlertOpen(true);
    setJobIdToDelete(jobId);
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const jobId = String(e.active.id);
    const stage = PIPELINE_STAGES.find((s) => s.id === e.over?.id);
    const job = jobs.find((j) => j.id === jobId);
    if (!stage || !job) return;
    const current = moved[jobId] ?? stageForStatus(job.Status?.value).id;
    if (current === stage.id) return;

    let status = jobStatuses.find((s) => s.value === stage.dropStatus);
    if (!status) {
      const res = await ensurePipelineStatus(stage.dropStatus);
      if (!res?.success) {
        toastError(res?.message ?? "No se pudo mover la postulación.");
        return;
      }
      status = res.status as JobStatus;
    }
    setMoved((m) => ({ ...m, [jobId]: stage.id }));
    await onChangeJobStatus(jobId, status);
    setMoved((m) => {
      const { [jobId]: _, ...rest } = m;
      return rest;
    });
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <StageJourney
          counts={PIPELINE_STAGES.map((s) => columns.get(s.id)?.length ?? 0)}
          onPick={scrollToStage}
        />
        <div
          ref={boardRef}
          className="-mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-4 md:snap-none"
          data-testid="jobs-board"
        >
          {PIPELINE_STAGES.map((stage) => (
            <BoardColumn
              key={stage.id}
              stage={stage}
              jobs={columns.get(stage.id) ?? []}
              activeId={activeId}
              jobStatuses={jobStatuses}
              editJob={editJob}
              onChangeJobStatus={onChangeJobStatus}
              onAddNote={onAddNote}
              onDeleteJob={onDeleteJob}
            />
          ))}
        </div>
        <DragOverlay>
          {activeJob ? <BoardCardBody job={activeJob} lifted /> : null}
        </DragOverlay>
      </DndContext>
      <DeleteAlertDialog
        pageTitle="job"
        open={alertOpen}
        onOpenChange={setAlertOpen}
        onDelete={() => deleteJob(jobIdToDelete)}
      />
    </>
  );
}

type CardActions = {
  jobStatuses: JobStatus[];
  editJob: (id: string) => void;
  onChangeJobStatus: (id: string, status: JobStatus) => void;
  onAddNote: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
};

function BoardColumn({
  stage,
  jobs,
  activeId,
  ...actions
}: {
  stage: PipelineStage;
  jobs: JobResponse[];
  activeId: string | null;
} & CardActions) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <section
      ref={setNodeRef}
      tabIndex={-1}
      data-stage={stage.id}
      aria-label={`${stage.label}: ${jobs.length}`}
      data-testid={`board-column-${stage.id}`}
      className={cn(
        "flex w-[86vw] max-w-[320px] shrink-0 snap-start flex-col rounded-2xl bg-muted/50 outline-none transition-shadow sm:w-[288px]",
        isOver && "ring-2 ring-primary/60",
      )}
    >
      <header className={cn("rounded-t-2xl px-4 pb-3 pt-3.5", stage.tint)}>
        <div className="flex items-center gap-2">
          <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", stage.dot)} />
          <h3 className="font-display text-[15px] font-semibold tracking-tight">
            {stage.label}
          </h3>
          <span className="ml-auto min-w-6 rounded-full bg-background/80 px-2 text-center text-xs font-semibold tabular-nums">
            {jobs.length}
          </span>
        </div>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">{stage.hint}</p>
      </header>
      <div className="flex min-h-[160px] flex-col gap-2.5 p-2.5">
        {jobs.map((job) => (
          <BoardCard
            key={job.id}
            job={job}
            hidden={activeId === job.id}
            {...actions}
          />
        ))}
        {jobs.length === 0 && (
          <p className="m-1 rounded-xl border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
            {stage.empty}
          </p>
        )}
      </div>
    </section>
  );
}

function StageJourney({
  counts,
  onPick,
}: {
  counts: number[];
  onPick: (stageId: string) => void;
}) {
  return (
    <nav aria-label="Etapas de tu búsqueda" className="mb-4 -mx-2 overflow-x-auto px-2">
      <ol className="flex min-w-max items-stretch gap-1.5">
        {PIPELINE_STAGES.map((stage, i) => (
          <li key={stage.id} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPick(stage.id)}
              className={cn(
                "flex items-center gap-2 rounded-full border bg-card py-1.5 pl-2 pr-3 text-sm transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                counts[i] === 0 && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums",
                  counts[i] > 0 ? cn(stage.dot, "text-white") : "bg-muted",
                )}
              >
                {counts[i]}
              </span>
              <span className="whitespace-nowrap font-medium">{stage.label}</span>
            </button>
            {i < PIPELINE_STAGES.length - 1 && (
              <span aria-hidden className="h-px w-3 bg-border" />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function BoardCard({
  job,
  hidden,
  jobStatuses,
  onChangeJobStatus,
  onAddNote,
}: { job: JobResponse; hidden: boolean } & CardActions) {
  const { setNodeRef, attributes, listeners } = useDraggable({ id: job.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "relative cursor-grab touch-manipulation active:cursor-grabbing",
        hidden && "opacity-30",
      )}
    >
      <BoardCardBody job={job} />
      <div
        className="absolute right-1 top-1"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <JobActionsMenu
          job={job}
          jobStatuses={jobStatuses}
          onChangeJobStatus={onChangeJobStatus}
          onAddNote={onAddNote}
        />
      </div>
    </div>
  );
}

function BoardCardBody({ job, lifted }: { job: JobResponse; lifted?: boolean }) {
  const applied = job.Status?.value !== "new" && job.Status?.value !== "draft";
  const date = applied ? (job.appliedDate ?? job.createdAt) : job.createdAt;
  const when = date
    ? formatDistanceToNowStrict(new Date(date), { addSuffix: true, locale: es })
    : null;
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3.5 pr-10 text-sm",
        lifted ? "rotate-[1.5deg] shadow-xl" : "shadow-[0_1px_0_hsl(var(--border))]",
      )}
    >
      <div className="flex items-start gap-3">
        <CompanyLogo logoUrl={job.Company?.logoUrl} className="h-9 w-9 min-w-9 rounded-lg" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/myjobs/${job.id}`}
            className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground underline-offset-4 hover:underline"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {job.JobTitle?.label}
          </Link>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {job.Company?.label}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        {job.Location?.label && (
          <span className="flex min-w-0 max-w-full items-center gap-1">
            <MapPin aria-hidden className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{job.Location.label}</span>
          </span>
        )}
        {when && (
          <span>
            {applied ? "Te postulaste " : "Guardado "}
            {when}
          </span>
        )}
        {typeof job.matchScore === "number" && (
          <span
            className="ml-auto flex items-center gap-1.5"
            title="Qué tan bien encaja tu CV con este aviso"
          >
            <CircularScore score={job.matchScore} size="sm" />
          </span>
        )}
      </div>
    </div>
  );
}

export default MyJobsBoard;
