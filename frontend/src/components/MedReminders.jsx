import { Pill, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Extracts dose text like "500mg" or "twice daily" from a medication string
function parseDose(m) {
  const dose = m.match(/(\d+\s?(mg|g|mcg|ml|iu))/i)?.[0];
  const freq = m.match(/(once|twice|three times|thrice|four times|\d+x)\s?(a|per)?\s?(day|daily|week)?/i)?.[0];
  return { name: m.replace(dose || "", "").replace(freq || "", "").trim() || m, dose, freq };
}

export default function MedReminders({ medications = [] }) {
  return (
    <Card className="p-6" data-testid="meds-widget">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
          <Pill className="w-5 h-5 text-teal-700" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Medication schedule</h3>
          <p className="text-xs text-slate-500">{medications.length} active med{medications.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
      {medications.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Add current medications on the Health Profile to see them here.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {medications.slice(0, 6).map((m, i) => {
            const p = parseDose(m);
            return (
              <li key={i} className="flex items-center gap-3 py-2.5" data-testid={`med-row-${i}`}>
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0"><Pill className="w-4 h-4 text-teal-700" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    {p.dose && <span>{p.dose}</span>}
                    {p.freq && <><Clock className="w-3 h-3" />{p.freq}</>}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">Active</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
