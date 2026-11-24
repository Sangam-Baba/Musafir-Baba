// @ts-check
/**
 * The rating engine — pure (plan Stage 13 §3.6). Turns what a client owes into invoice lines and GST:
 * - plan fees and prorated upgrade charges come in as `charges` (made by the subscription, each billed once);
 * - overage for a closed month = extra queries × the per-query price (OVERAGE plans only; BLOCK plans never pay
 *   overage — a few queries let through by counter lag are free);
 * - GST 18 % on the taxable total: CGST + SGST (9 % + 9 %) when the client is in MusafirBaba's state (or has no
 *   GSTIN), IGST otherwise. Integer paise; totals = Σ lines + GST; never negative.
 */
export const GST_BPS = 1800;

/**
 * @typedef {{ kind: string, description: string, quantity: number, unitPaise: number, amountPaise: number, ref: string | null }} InvoiceLine
 */

/**
 * The overage line for a closed month (none when within the allowance or on a BLOCK plan).
 * @param {{ used: number, allowance: number, behaviour: 'BLOCK' | 'OVERAGE', overagePricePerQueryPaise: number, planName: string, month: string }} a
 * @returns {InvoiceLine[]}
 */
export function overageLines(a) {
  const extra = Math.max(0, Math.floor(a.used) - Math.floor(a.allowance));
  if (a.behaviour !== 'OVERAGE' || extra === 0 || a.overagePricePerQueryPaise <= 0) return [];
  return [
    {
      kind: 'OVERAGE',
      description: `${a.planName} — ${extra.toLocaleString('en-IN')} queries above ${Math.floor(a.allowance).toLocaleString('en-IN')} (${a.month})`,
      quantity: extra,
      unitPaise: a.overagePricePerQueryPaise,
      amountPaise: extra * a.overagePricePerQueryPaise,
      ref: `overage:${a.month}`,
    },
  ];
}

/**
 * Subscription charges as invoice lines (negative or broken amounts never become lines).
 * @param {{ id: string, kind: string, description: string, amountPaise: number }[]} charges
 * @returns {InvoiceLine[]}
 */
export const chargeLines = (charges) =>
  charges
    .filter((c) => Number.isSafeInteger(c.amountPaise) && c.amountPaise > 0)
    .map((c) => ({
      kind: c.kind,
      description: c.description,
      quantity: 1,
      unitPaise: c.amountPaise,
      amountPaise: c.amountPaise,
      ref: `charge:${c.id}`,
    }));

/**
 * GST and totals. Rounded once on the taxable total (half up); CGST gets the odd paisa.
 * @param {InvoiceLine[]} lines
 * @param {{ intraState: boolean }} supply
 */
export function invoiceTotals(lines, supply) {
  const taxablePaise = lines.reduce((s, l) => s + Math.max(0, l.amountPaise), 0);
  const gstPaise = Math.round((taxablePaise * GST_BPS) / 10_000);
  const sgstPaise = supply.intraState ? Math.floor(gstPaise / 2) : 0;
  const cgstPaise = supply.intraState ? gstPaise - sgstPaise : 0;
  const igstPaise = supply.intraState ? 0 : gstPaise;
  return { taxablePaise, cgstPaise, sgstPaise, igstPaise, gstPaise, totalPaise: taxablePaise + gstPaise };
}

/**
 * Place of supply: same state as MusafirBaba's registration (or no client GSTIN) → intra-state.
 * @param {string} issuerStateCode e.g. '07' (Delhi)
 * @param {string | null} clientGstin
 */
export const intraState = (issuerStateCode, clientGstin) => !clientGstin || clientGstin.slice(0, 2) === issuerStateCode;
