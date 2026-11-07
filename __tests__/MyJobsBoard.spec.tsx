import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyJobsBoard from "@/components/myjobs/MyJobsBoard";
import type { JobResponse, JobStatus } from "@/models/job.model";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/actions/job/pipeline", () => ({ ensurePipelineStatus: vi.fn() }));

const statuses: JobStatus[] = [
  { id: "s1", label: "Draft", value: "draft" },
  { id: "s2", label: "Applied", value: "applied" },
  { id: "s3", label: "Interview", value: "interview" },
];

function makeJob(id: string, title: string, status: JobStatus): JobResponse {
  return {
    id,
    userId: "u1",
    JobTitle: { id, label: title, value: title.toLowerCase() },
    Company: { id: `c${id}`, label: "Supermercado El Sol", value: "el sol", logoUrl: "" },
    Status: status,
    Location: { id: "l1", label: "Montevideo", value: "montevideo" },
    JobSource: { id: "j1", label: "Indeed", value: "indeed" },
    jobType: "FT",
    createdAt: new Date(),
    appliedDate: new Date(),
    dueDate: new Date("2099-01-01"),
    salaryRange: "",
    description: "",
    jobUrl: "",
    applied: true,
  } as JobResponse;
}

function renderBoard(jobs: JobResponse[]) {
  render(
    <MyJobsBoard
      jobs={jobs}
      jobStatuses={statuses}
      deleteJob={vi.fn()}
      editJob={vi.fn()}
      onChangeJobStatus={vi.fn()}
      onAddNote={vi.fn()}
    />,
  );
}

describe("MyJobsBoard", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("shows the six stages and places each application in its column", () => {
    renderBoard([
      makeJob("1", "Cajero/a", statuses[0]),
      makeJob("2", "Repartidor/a", statuses[1]),
      makeJob("3", "Recepcionista", statuses[2]),
    ]);
    for (const id of ["to-apply", "applied", "in-process", "interview", "offer", "closed"]) {
      expect(screen.getByTestId(`board-column-${id}`)).toBeInTheDocument();
    }
    expect(
      within(screen.getByTestId("board-column-to-apply")).getByText("Cajero/a"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("board-column-interview")).getByText("Recepcionista"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("board-column-offer")).getByText(
        "Acá llegan las buenas noticias",
      ),
    ).toBeInTheDocument();
  });

  it("jumps to a column from the stage strip", async () => {
    renderBoard([makeJob("2", "Repartidor/a", statuses[1])]);
    const nav = screen.getByRole("navigation", { name: "Etapas de tu búsqueda" });
    await userEvent.click(within(nav).getByRole("button", { name: /Postulado/ }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
