"use client";
// A bus seat map, one panel per deck (front of the bus at the top). Read-only, or editable: with a tool picked,
// clicking a cell adds / removes a seat, marks it for ladies, changes its type or renumbers it.
import { Armchair, BedSingle, LifeBuoy as Steering } from "lucide-react";

import { SEAT_LABEL, nextSeatNo, type DeckGrid, type Seat, type SeatType } from "../../bus";

export type Tool = "seat" | "ladies" | "type" | "number";
export const TOOLS: { value: Tool; label: string; hint: string }[] = [
  { value: "seat", label: "Add / remove seat", hint: "Click an empty spot to add a seat, or a seat to remove it." },
  { value: "ladies", label: "Ladies seat", hint: "Click a seat to reserve it for women (click again to undo)." },
  { value: "type", label: "Seat type", hint: "Click a seat to switch seat → semi-sleeper → sleeper." },
  { value: "number", label: "Renumber", hint: "Click a seat to give it a new number (letters and digits)." },
];
const NEXT_TYPE: Record<SeatType, SeatType> = { SEATER: "SEMI_SLEEPER", SEMI_SLEEPER: "SLEEPER", SLEEPER: "SEATER" };

/** The seat covering a cell (sleepers may cover two cells along the row). */
export function seatAt(d: DeckGrid, row: number, col: number): Seat | undefined {
  return d.seats.find((s) => s.row === row && col >= s.col && col < s.col + (s.span ?? 1));
}

/** The decks after one click with a tool (pure — returns new arrays). */
export function applyTool(decks: DeckGrid[], deckIndex: number, row: number, col: number, tool: Tool, ask: (current: string) => string | null): DeckGrid[] {
  return decks.map((d, i) => {
    if (i !== deckIndex) return d;
    const hit = seatAt(d, row, col);
    if (tool === "seat") {
      if (hit) return { ...d, seats: d.seats.filter((s) => s !== hit) };
      const type: SeatType = d.seats[0]?.type ?? "SEATER";
      return { ...d, seats: [...d.seats, { no: nextSeatNo(decks), row, col, type }] };
    }
    if (!hit) return d;
    const change = (patch: Partial<Seat>) => ({ ...d, seats: d.seats.map((s) => (s === hit ? { ...s, ...patch } : s)) });
    if (tool === "ladies") return change({ ladies: !hit.ladies });
    if (tool === "type") {
      const type = NEXT_TYPE[hit.type];
      return change({ type, span: type === "SLEEPER" ? hit.span : 1 });
    }
    const no = ask(hit.no)?.trim().toUpperCase();
    return no ? change({ no }) : d;
  });
}

function SeatBox({ seat, onClick, selected }: { seat: Seat; onClick?: () => void; selected?: boolean }) {
  const Icon = seat.type === "SEATER" ? Armchair : BedSingle;
  const colour = seat.taken
    ? "border-slate-400 bg-slate-200 text-slate-500"
    : seat.ladies
      ? "border-pink-300 bg-pink-50 text-pink-700"
      : seat.type === "SEATER"
        ? "border-slate-300 bg-white text-slate-700"
        : "border-sky-300 bg-sky-50 text-sky-700";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={`${seat.no} · ${SEAT_LABEL[seat.type]}${seat.ladies ? " · ladies" : ""}${seat.taken ? " · taken for part or all of the route" : ""}`}
      style={{ gridColumn: `span ${seat.span ?? 1}` }}
      className={`flex h-10 flex-col items-center justify-center rounded-md border text-[10px] font-semibold leading-none ${colour} ${selected ? "ring-2 ring-[#FE5300]" : ""} ${onClick ? "hover:ring-2 hover:ring-[#FE5300]/40" : "cursor-default"}`}
    >
      <Icon className="mb-0.5 h-3.5 w-3.5" />
      {seat.no}
    </button>
  );
}

function DeckPanel({ deck, onCell, selected }: { deck: DeckGrid; onCell?: (row: number, col: number) => void; selected?: string[] }) {
  const cells = [];
  for (let r = 0; r < deck.rows; r += 1)
    for (let c = 0; c < deck.cols; c += 1) {
      const seat = seatAt(deck, r, c);
      if (seat && seat.col !== c) continue; // covered by a sleeper that started in the cell before
      cells.push(
        seat ? (
          <SeatBox key={`${r}-${c}`} seat={seat} selected={selected?.includes(seat.no)} onClick={onCell && (() => onCell(r, c))} />
        ) : (
          <button
            key={`${r}-${c}`}
            type="button"
            disabled={!onCell}
            onClick={onCell && (() => onCell(r, c))}
            aria-label={`Empty spot row ${r + 1} column ${c + 1}`}
            className={`h-10 rounded-md ${onCell ? "border border-dashed border-slate-200 hover:border-[#FE5300]/50" : ""}`}
          />
        ),
      );
    }
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span>{deck.deck === "LOWER" ? "Lower deck" : "Upper deck"}</span>
        {deck.deck === "LOWER" && (
          <span className="inline-flex items-center gap-1 normal-case tracking-normal">
            <Steering className="h-4 w-4" aria-hidden="true" /> Driver · front
          </span>
        )}
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${deck.cols}, minmax(2.25rem, 1fr))` }}>
        {cells}
      </div>
    </div>
  );
}

export function SeatMap({ decks, onCell, selected }: { decks: DeckGrid[]; onCell?: (deckIndex: number, row: number, col: number) => void; selected?: string[] }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 overflow-x-auto">
        {decks.map((d, i) => (
          <div key={d.deck} className="min-w-0 max-w-full">
            <DeckPanel deck={d} selected={selected} onCell={onCell && ((r, c) => onCell(i, r, c))} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded border border-slate-300 bg-white" /> Seat</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded border border-sky-300 bg-sky-50" /> Sleeper / semi-sleeper</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded border border-pink-300 bg-pink-50" /> Ladies</span>
        {decks.some((d) => d.seats.some((s) => s.taken)) && <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded border border-slate-400 bg-slate-200" /> Taken (some or all legs)</span>}
      </div>
    </div>
  );
}
