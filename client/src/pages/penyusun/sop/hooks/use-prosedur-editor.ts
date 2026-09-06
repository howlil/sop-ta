/** Procedure editor mutations over the canonical SOP editor model. */

import { useState, useCallback } from "react";
import type { ProsedurRow } from "@/types/ui/sop";

export interface UseProsedurEditorReturn {
  isDecisionDialogOpen: boolean;
  setIsDecisionDialogOpen: (open: boolean) => void;
  decisionStepIndex: number | null;
  setDecisionStepIndex: (index: number | null) => void;
  decisionYesId: string;
  setDecisionYesId: (id: string) => void;
  decisionNoId: string;
  setDecisionNoId: (id: string) => void;

  handleAddRow: (
    index: number,
    implementers: { id: string; name: string }[],
  ) => void;
  handleDeleteRow: (index: number) => void;
  handleTypeChange: (
    index: number,
    type: ProsedurRow["type"],
    terminatorRole?: "start" | "end",
  ) => void;
  handleKegiatanChange: (index: number, kegiatan: string) => void;
  handlePelaksanaChange: (
    index: number,
    implementerId: string,
    implementers: { id: string; name: string }[],
  ) => void;
  handleKelengkapanChange: (index: number, value: string) => void;
  handleWaktuChange: (index: number, amount: string, unit: string) => void;
  handleKeluaranChange: (index: number, value: string) => void;
  handleKeteranganChange: (index: number, value: string) => void;
  handleDecisionConfig: (index: number, yesId: string, noId: string) => void;
}

export function useProsedurEditor(
  _prosedurRows: ProsedurRow[],
  setProsedurRows: React.Dispatch<React.SetStateAction<ProsedurRow[]>>,
): UseProsedurEditorReturn {
  const [isDecisionDialogOpen, setIsDecisionDialogOpen] = useState(false);
  const [decisionStepIndex, setDecisionStepIndex] = useState<number | null>(null);
  const [decisionYesId, setDecisionYesId] = useState<string>("");
  const [decisionNoId, setDecisionNoId] = useState<string>("");

  const handleAddRow = useCallback(
    (index: number, implementers: { id: string; name: string }[]) => {
      setProsedurRows((prev) => {
        const idBase = crypto.randomUUID();
        const newRow: ProsedurRow = {
          id: `${idBase}-${index + 1}`,
          urutan: index + 2,
          kegiatan: "",
          pelaksana: implementers[0]?.id ?? "",
          pelaksanaMapping: implementers.reduce(
            (acc, impl, i) => ({
              ...acc,
              [impl.id]: i === 0 ? "√" : "",
            }),
            {} as Record<string, string>,
          ),
          kelengkapan: "",
          keluaran: "",
          keterangan: "",
        };
        const next = [...prev];
        next.splice(index + 1, 0, newRow);
        return next.map((row, i) => ({ ...row, urutan: i + 1 }));
      });
    },
    [setProsedurRows],
  );

  const handleDeleteRow = useCallback(
    (index: number) => {
      setProsedurRows((prev) =>
        prev
          .filter((_, i) => i !== index)
          .map((row, i) => ({ ...row, urutan: i + 1 })),
      );
    },
    [setProsedurRows],
  );

  const handleTypeChange = useCallback(
    (
      index: number,
      type: ProsedurRow["type"],
      terminatorRole?: "start" | "end",
    ) => {
      setProsedurRows((prev) =>
        prev.map((row, i) =>
          i === index
            ? {
                ...row,
                type,
                terminatorRole: type === "terminator" ? terminatorRole : undefined,
              }
            : row,
        ),
      );
    },
    [setProsedurRows],
  );

  const handleKegiatanChange = useCallback(
    (index: number, kegiatan: string) => {
      setProsedurRows((prev) =>
        prev.map((row, i) => (i === index ? { ...row, kegiatan } : row)),
      );
    },
    [setProsedurRows],
  );

  const handlePelaksanaChange = useCallback(
    (
      index: number,
      implementerId: string,
      implementers: { id: string; name: string }[],
    ) => {
      setProsedurRows((prev) =>
        prev.map((row, i) => {
          if (i !== index) return row;
          const pelaksanaMapping: Record<string, string> = {};
          implementers.forEach((impl) => {
            pelaksanaMapping[impl.id] = impl.id === implementerId ? "√" : "";
          });
          return {
            ...row,
            pelaksana: implementerId,
            pelaksanaMapping,
          };
        }),
      );
    },
    [setProsedurRows],
  );

  const handleKelengkapanChange = useCallback(
    (index: number, value: string) => {
      setProsedurRows((prev) =>
        prev.map((row, i) => (i === index ? { ...row, kelengkapan: value } : row)),
      );
    },
    [setProsedurRows],
  );

  const handleWaktuChange = useCallback(
    (index: number, amount: string, unit: string) => {
      const normalizedAmount = amount.trim();
      const parsedAmount = Number.parseInt(normalizedAmount, 10);
      const waktu =
        normalizedAmount.length > 0 && Number.isFinite(parsedAmount)
          ? Math.max(0, parsedAmount)
          : undefined;
      const satuanWaktu = ["m", "h", "d", "w", "mo", "y"].includes(unit)
        ? unit
        : "m";

      setProsedurRows((prev) =>
        prev.map((row, i) =>
          i === index
            ? {
                ...row,
                waktu,
                satuanWaktu: waktu !== undefined ? satuanWaktu : undefined,
              }
            : row,
        ),
      );
    },
    [setProsedurRows],
  );

  const handleKeluaranChange = useCallback(
    (index: number, value: string) => {
      setProsedurRows((prev) =>
        prev.map((row, i) => (i === index ? { ...row, keluaran: value } : row)),
      );
    },
    [setProsedurRows],
  );

  const handleKeteranganChange = useCallback(
    (index: number, value: string) => {
      setProsedurRows((prev) =>
        prev.map((row, i) => (i === index ? { ...row, keterangan: value } : row)),
      );
    },
    [setProsedurRows],
  );

  const handleDecisionConfig = useCallback(
    (index: number, yesId: string, noId: string) => {
      setDecisionStepIndex(index);
      setDecisionYesId(yesId);
      setDecisionNoId(noId === yesId && yesId ? "" : noId);
      setIsDecisionDialogOpen(true);
    },
    [],
  );

  return {
    isDecisionDialogOpen,
    setIsDecisionDialogOpen,
    decisionStepIndex,
    setDecisionStepIndex,
    decisionYesId,
    setDecisionYesId,
    decisionNoId,
    setDecisionNoId,
    handleAddRow,
    handleDeleteRow,
    handleTypeChange,
    handleKegiatanChange,
    handlePelaksanaChange,
    handleKelengkapanChange,
    handleWaktuChange,
    handleKeluaranChange,
    handleKeteranganChange,
    handleDecisionConfig,
  };
}
