"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import type { ClubSlug } from "../domain/club";
import { createInitialState, loadTournamentState, type TournamentState } from "./tournament-store";

export function useTournamentState(clubSlug?: ClubSlug): [TournamentState, Dispatch<SetStateAction<TournamentState>>] {
  const [state, setState] = useState<TournamentState>(() => createInitialState());

  useEffect(() => {
    setState(loadTournamentState(clubSlug));
  }, [clubSlug]);

  return [state, setState];
}
