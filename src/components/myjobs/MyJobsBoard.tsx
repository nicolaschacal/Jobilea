"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
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
        <div
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
      aria-label={stage.label}
      data-testid={`board-column-${stage.id}`}
      className={cn(
        "flex w-[85vw] max-w-[300px] shrink-0 snap-start flex-col rounded-lg border bg-muted/40 sm:w-72",
        isOver && "ring-2 ring-primary/50",
      )}
    >
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <span className={cn("h-2 w-2 rounded-full", stage.accent)} />
        <h3 className="text-sm font-semibold">{stage.label}</h3>
        <span className="ml-auto rounded-full bg-background px-2 text-xs tabular-nums text-muted-foreground">
          {jobs.length}
        </span>
      </header>
      <div className="flex min-h-[120px] flex-col gap-2 p-2">
        {jobs.map((job) => (
          <BoardCard
            key={job.id}
            job={job}
            hidden={activeId === job.id}
            {...actions}
          />
        ))}
        {jobs.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Arrastrá una postulación acá
          </p>
        )}
      </div>
    </section>
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
  const date = job.appliedDate ?? job.createdAt;
  return (
    <div
      className={cn(
        "rounded-md border bg-card p-3 pr-9 text-sm shadow-sm",
        lifted && "rotate-1 shadow-lg",
      )}
    >
      <div className="flex items-start gap-2">
        <CompanyLogo logoUrl={job.Company?.logoUrl} className="h-8 w-8 min-w-8" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/myjobs/${job.id}`}
            className="line-clamp-2 font-medium text-primary underline-offset-4 hover:underline"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {job.JobTitle?.label}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {job.Company?.label}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        {job.Location?.label && (
          <span className="flex min-w-0 items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{job.Location.label}</span>
          </span>
        )}
        {date && (
          <span className="ml-auto shrink-0">{format(new Date(date), "dd/MM")}</span>
        )}
        {typeof job.matchScore === "number" && (
          <CircularScore score={job.matchScore} size="sm" />
        )}
      </div>
    </div>
  );
}

export default MyJobsBoard;
