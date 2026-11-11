import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getGoal } from "../../../admin/api/slidesApi";
import { useGoal } from "../../../admin/hooks/useGoal";
import { getCampaigns } from "../../api/campaignsApi";
import { getSelectedCampaign, setSelectedCampaign } from "../../utils/campaignSelection";
import CampaignSelect from "./CampaignSelect";

vi.mock("../../api/campaignsApi", async (importOriginal) => ({ ...(await importOriginal()), getCampaigns: vi.fn() }));
vi.mock("../../../admin/api/slidesApi", async (importOriginal) => ({ ...(await importOriginal()), getGoal: vi.fn() }));

const CAMPAIGNS = [
  { id: "c2", name: "Março", active: false },
  { id: "c1", name: "Campanha Black", active: true },
];

function GoalTotal() {
  const { goal } = useGoal();
  return <p>Total {goal.total}</p>;
}

const renderSelect = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CampaignSelect />
      <Suspense fallback={<p>Carregando meta</p>}>
        <GoalTotal />
      </Suspense>
    </QueryClientProvider>,
  );

describe("CampaignSelect", () => {
  beforeEach(() => {
    getCampaigns.mockResolvedValue(CAMPAIGNS);
    getGoal.mockImplementation(async (campaignId) => ({ total: campaignId === "c2" ? 200 : 100 }));
  });

  afterEach(() => act(() => setSelectedCampaign("")));

  it("abre na campanha ativa e, ao trocar, as telas pedem os dados da campanha escolhida", async () => {
    renderSelect();

    const select = await screen.findByRole("combobox", { name: "Campanha" });
    expect(select).toHaveValue("c1");
    expect(screen.getByRole("option", { name: "Campanha Black (ativa)" })).toBeInTheDocument();
    expect(await screen.findByText("Total 100")).toBeInTheDocument();
    expect(getGoal).toHaveBeenCalledWith("");

    fireEvent.change(select, { target: { value: "c2" } });

    expect(getSelectedCampaign()).toBe("c2");
    expect(await screen.findByText("Total 200")).toBeInTheDocument();
    expect(getGoal).toHaveBeenCalledWith("c2");

    fireEvent.change(select, { target: { value: "c1" } });
    expect(getSelectedCampaign()).toBe("");
  });

  it("escolha guardada de uma campanha que não existe mais volta para a ativa", async () => {
    act(() => setSelectedCampaign("apagada"));
    renderSelect();

    await waitFor(() => expect(getSelectedCampaign()).toBe(""));
    expect(await screen.findByRole("combobox", { name: "Campanha" })).toHaveValue("c1");
  });

  it("sem React Query (telas sem dados), não mostra nada", () => {
    const { container } = render(<CampaignSelect />);
    expect(container).toBeEmptyDOMElement();
  });
});
