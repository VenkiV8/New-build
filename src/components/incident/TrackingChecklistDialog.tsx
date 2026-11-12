import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatInr } from "@/utils/format";

const STEPS = [
  "Conversion pixel fires on the order-confirmation page (use Tag Assistant / test order)",
  "No site deploy changed checkout in the last 24h",
  "Test conversion recorded in reporting",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** resolves the alert (credits "Protected this session") */
  onMarkFixed: () => void;
  campaign: string;
  /** ₹ that "Mark fixed" will credit (rest of today, capped at the daily budget) */
  creditInr: number;
}

export function TrackingChecklistDialog({ open, onOpenChange, onMarkFixed, campaign, creditInr }: Props) {
  // Lives with the incident page, so ticks survive closing and reopening the dialog.
  const [done, setDone] = useState<boolean[]>(() => STEPS.map(() => false));
  const allDone = done.every(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tracking checklist</DialogTitle>
          <DialogDescription>
            {campaign}: acknowledged. Work through these, then mark the tracking break fixed.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-1">
          {STEPS.map((step, i) => (
            <li key={step}>
              <label className="flex min-h-10 cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                <Checkbox
                  className="mt-0.5"
                  checked={done[i]}
                  onCheckedChange={(v) => setDone((d) => d.map((x, j) => (j === i ? v === true : x)))}
                />
                <span className="text-sm text-slate-700">{step}</span>
              </label>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button variant="outline" className="h-10 md:h-8" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            className="h-10 md:h-8"
            disabled={!allDone}
            onClick={() => {
              onMarkFixed();
              onOpenChange(false);
            }}
          >
            Mark fixed
            {allDone && <span className="opacity-80">· ≈ {formatInr(creditInr)} rest of today</span>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
