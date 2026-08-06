import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { TournamentCreateForm } from "./TournamentCreateForm";

it("renders explained tournament type choices", () => {
  const action = vi.fn();
  render(<TournamentCreateForm action={action} clubSlug="stc" />);

  const values = screen.getAllByRole("radio").map((radio) => (radio as HTMLInputElement).value);
  expect(values).toEqual(["general", "fixed-pair-league", "monthly", "team-battle", "tournament"]);
});