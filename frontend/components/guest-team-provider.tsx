"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DATA_SEASON } from "@/lib/season";
import { importTeam, parseEntryId } from "@/lib/guest-team";

const storageKey = `fpl-analyst-team:${DATA_SEASON.key}`;
const Context = createContext<{
  entry: number | null;
  ready: boolean;
  storageError: boolean;
  choose: (entry: number | null, remember?: boolean) => void;
}>({ entry: null, ready: false, storageError: false, choose: () => {} });
export function GuestTeamProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => {
    try {
      setEntry(parseEntryId(localStorage.getItem(storageKey) ?? ""));
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);
  const choose = (next: number | null, remember = false) => {
    setEntry(next);
    queryClient.removeQueries({ queryKey: ["guest-squad"] });
    try {
      if (next && remember) localStorage.setItem(storageKey, String(next));
      else localStorage.removeItem(storageKey);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  };
  return (
    <Context.Provider value={{ entry, ready, storageError, choose }}>
      {children}
    </Context.Provider>
  );
}
export function useGuestTeam() {
  const selection = useContext(Context);
  const squad = useQuery({
    queryKey: ["guest-squad", DATA_SEASON.key, selection.entry],
    queryFn: ({ signal }) => importTeam(selection.entry!, signal),
    enabled: selection.ready && !!selection.entry,
    staleTime: 5 * 60_000,
    retry: false,
  });
  return { ...selection, squad };
}
