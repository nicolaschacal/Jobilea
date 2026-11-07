import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyJobsTable from "@/components/myjobs/MyJobsTable";
import type { JobResponse, JobStatus } from "@/models/job.model";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const chat = { busy: false };
vi.mock("@/components/agent/AgentChatProvider", () => ({
  useAgentChat: () => chat,
}));

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

const mockStatuses: JobStatus[] = [
  { id: "1", label: "Applied", value: "applied" },
  { id: "2", label: "Interview", value: "interview" },
  { id: "3", label: "Draft", value: "draft" },
];

function makeJob(overrides: Partial<JobResponse> = {}): JobResponse {
  return {
    id: "job-1",
    userId: "user-1",
    JobTitle: { id: "1", label: "Software Engineer", value: "software engineer" },
    Company: { id: "1", label: "Acme Corp", value: "acme corp", logoUrl: "" },
    Status: { id: "1", label: "Applied", value: "applied" },
    Location: { id: "1", label: "Remote", value: "remote" },
    JobSource: { id: "1", label: "Indeed", value: "indeed" },
    jobType: "FT",
    createdAt: new Date("2024-06-01"),
    appliedDate: new Date("2024-06-01"),
    dueDate: new Date("2099-01-01"),
    salaryRange: "",
    description: "",
    jobUrl: "",
    applied: true,
    ...overrides,
  } as JobResponse;
}

function renderTable(jobs: JobResponse[], overrides: Partial<React.ComponentProps<typeof MyJobsTable>> = {}) {
  const deleteJob = vi.fn();
  const editJob = vi.fn();
  const onChangeJobStatus = vi.fn();
  const onAddNote = vi.fn();
  const props: React.ComponentProps<typeof MyJobsTable> = {
    jobs,
    jobStatuses: mockStatuses,
    deleteJob,
    editJob,
    onChangeJobStatus,
    onAddNote,
    sort: null,
    onSort: vi.fn(),
    ...overrides,
  };
  const result = render(<MyJobsTable {...props} />);
  return { ...result, deleteJob, editJob, onChangeJobStatus, onAddNote };
}

describe("MyJobsTable", () => {
  it("renders a row per job with title, company, and location", () => {
    renderTable([makeJob()]);

    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Remote")).toBeInTheDocument();
    const statusButton = screen.getByRole("button", { name: /Cambiar estado/ });
    expect(within(statusButton).getByText("Postulado")).toBeInTheDocument();
  });

  it("shows a Dismissed badge for discovered jobs regardless of status", () => {
    renderTable([makeJob({ discoveryStatus: "dismissed", Status: { id: "1", label: "Applied", value: "applied" } })]);

    expect(screen.getByText("Dismissed")).toBeInTheDocument();
    const statusButton = screen.getByRole("button", { name: /Cambiar estado/ });
    expect(within(statusButton).queryByText("Postulado")).not.toBeInTheDocument();
  });

  it("shows an Expired badge for past-due draft jobs", () => {
    renderTable([
      makeJob({
        dueDate: new Date("2000-01-01"),
        Status: { id: "3", label: "Draft", value: "draft" },
      }),
    ]);

    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("does not show Expired for past-due jobs that are not drafts", () => {
    renderTable([
      makeJob({
        dueDate: new Date("2000-01-01"),
        Status: { id: "1", label: "Applied", value: "applied" },
      }),
    ]);

    expect(screen.queryByText("Expired")).not.toBeInTheDocument();
    const statusButton = screen.getByRole("button", { name: /Cambiar estado/ });
    expect(within(statusButton).getByText("Postulado")).toBeInTheDocument();
  });

  it("renders a match score when present, and a Match button otherwise", () => {
    const { rerender } = renderTable([makeJob({ matchScore: 87 })]);
    expect(screen.getByText("87%")).toBeInTheDocument();

    rerender(
      <MyJobsTable
        jobs={[makeJob({ matchScore: null })]}
        jobStatuses={mockStatuses}
        deleteJob={vi.fn()}
        editJob={vi.fn()}
        onChangeJobStatus={vi.fn()}
        onAddNote={vi.fn()}
        sort={null}
        onSort={vi.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: /match/i })).toHaveAttribute(
      "href",
      "/dashboard/myjobs/job-1?tab=match&match=1",
    );
  });

  it("disables the Match button while the assistant is busy", () => {
    chat.busy = true;
    try {
      renderTable([makeJob({ matchScore: null })]);
      expect(
        screen.queryByRole("link", { name: /match/i }),
      ).not.toBeInTheDocument();
      // The sortable "Match" column header is also a button named /match/i now.
      const matchButtons = screen.getAllByRole("button", { name: /match/i });
      expect(matchButtons.some((b) => (b as HTMLButtonElement).disabled)).toBe(
        true,
      );
    } finally {
      chat.busy = false;
    }
  });

  it("shows a notes count badge only when the job has notes", () => {
    const { rerender } = renderTable([makeJob({ _count: { Notes: 3 } })]);
    expect(screen.getByText("3")).toBeInTheDocument();

    rerender(
      <MyJobsTable
        jobs={[makeJob({ _count: { Notes: 0 } })]}
        jobStatuses={mockStatuses}
        deleteJob={vi.fn()}
        editJob={vi.fn()}
        onChangeJobStatus={vi.fn()}
        onAddNote={vi.fn()}
        sort={null}
        onSort={vi.fn()}
      />,
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  describe("row actions menu", () => {
    const user = userEvent.setup();

    it("navigates to job details when Ver detalle is clicked", async () => {
      renderTable([makeJob()]);

      await user.click(screen.getByTestId("job-actions-menu-btn"));
      await user.click(screen.getByText("Ver detalle"));

      expect(mockPush).toHaveBeenCalledWith("/dashboard/myjobs/job-1");
    });

    it("calls editJob with the job id when Edit Job is clicked", async () => {
      const { editJob } = renderTable([makeJob()]);

      await user.click(screen.getByRole("button", { name: "Editar" }));

      expect(editJob).toHaveBeenCalledWith("job-1");
    });

    it("calls onAddNote with the job id when Agregar nota is clicked", async () => {
      const { onAddNote } = renderTable([makeJob()]);

      await user.click(screen.getByTestId("job-actions-menu-btn"));
      await user.click(screen.getByText("Agregar nota"));

      expect(onAddNote).toHaveBeenCalledWith("job-1");
    });

    it("opens the delete confirmation dialog and calls deleteJob on confirm", async () => {
      const { deleteJob } = renderTable([makeJob()]);

      await user.click(screen.getByRole("button", { name: "Eliminar" }));

      expect(
        screen.getByText("¿Seguro que querés eliminarlo?"),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Eliminar" }));

      expect(deleteJob).toHaveBeenCalledWith("job-1");
    });

    // The "Cambiar estado" item is a Radix submenu trigger; opening/selecting
    // via pointer clicks is flaky in jsdom, so drive it with the keyboard,
    // which is how Radix menus are designed to be operated.
    const openChangeStatusSubmenu = async () => {
      await user.click(screen.getByTestId("job-actions-menu-btn"));
      await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
      await user.keyboard("{ArrowRight}");
      await screen.findByText("Entrevista");
    };

    it("disables the current status option in the Cambiar estado submenu", async () => {
      renderTable([makeJob({ Status: { id: "1", label: "Applied", value: "applied" } })]);

      await openChangeStatusSubmenu();

      const appliedOption = screen.getAllByText("Postulado").find(
        (el) => el.closest('[role="menuitem"]'),
      );
      expect(appliedOption?.closest('[role="menuitem"]')).toHaveAttribute(
        "data-disabled",
      );
    });

    it("calls onChangeJobStatus with the job id and selected status", async () => {
      const { onChangeJobStatus } = renderTable([
        makeJob({ Status: { id: "1", label: "Applied", value: "applied" } }),
      ]);

      await openChangeStatusSubmenu();
      await user.keyboard("{Enter}");

      expect(onChangeJobStatus).toHaveBeenCalledWith("job-1", {
        id: "2",
        label: "Interview",
        value: "interview",
      });
    });
  });

  describe("status badge menu", () => {
    const user = userEvent.setup();

    it("opens a status menu when the badge is clicked", async () => {
      renderTable([makeJob()]);

      await user.click(
        screen.getByRole("button", { name: "Cambiar estado (ahora: Postulado)" }),
      );

      expect(await screen.findByText("Entrevista")).toBeInTheDocument();
    });

    it("calls onChangeJobStatus with the job id and selected status", async () => {
      const { onChangeJobStatus } = renderTable([makeJob()]);

      await user.click(
        screen.getByRole("button", { name: "Cambiar estado (ahora: Postulado)" }),
      );
      await user.click(await screen.findByText("Entrevista"));

      expect(onChangeJobStatus).toHaveBeenCalledWith("job-1", {
        id: "2",
        label: "Interview",
        value: "interview",
      });
    });

    it("checks and disables the current status", async () => {
      renderTable([makeJob()]);

      await user.click(
        screen.getByRole("button", { name: "Cambiar estado (ahora: Postulado)" }),
      );

      const appliedOption = (await screen.findAllByText("Postulado")).find((el) =>
        el.closest('[role="menuitem"]'),
      );
      expect(appliedOption?.closest('[role="menuitem"]')).toHaveAttribute(
        "data-disabled",
      );
    });
  });
});
