import { Droplet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const COMPAT = {
  "O-":  { give: ["O-","O+","A-","A+","B-","B+","AB-","AB+"], receive: ["O-"] },
  "O+":  { give: ["O+","A+","B+","AB+"], receive: ["O-","O+"] },
  "A-":  { give: ["A-","A+","AB-","AB+"], receive: ["O-","A-"] },
  "A+":  { give: ["A+","AB+"], receive: ["O-","O+","A-","A+"] },
  "B-":  { give: ["B-","B+","AB-","AB+"], receive: ["O-","B-"] },
  "B+":  { give: ["B+","AB+"], receive: ["O-","O+","B-","B+"] },
  "AB-": { give: ["AB-","AB+"], receive: ["O-","A-","B-","AB-"] },
  "AB+": { give: ["AB+"], receive: ["O-","O+","A-","A+","B-","B+","AB-","AB+"] },
};

export default function BloodCompatibility({ bloodGroup }) {
  const bg = bloodGroup || null;
  const c = bg ? COMPAT[bg] : null;
  return (
    <Card className="p-6" data-testid="blood-compat-widget">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
          <Droplet className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Blood compatibility</h3>
          <p className="text-xs text-slate-500">Your donor and recipient chart</p>
        </div>
        {bg && <div className="ml-auto text-3xl font-bold text-red-700 font-mono">{bg}</div>}
      </div>
      {!bg ? (
        <p className="mt-4 text-sm text-slate-500">Set your blood group in Health Profile to see who you can donate to and receive from.</p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">Can donate to</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.give.map((g) => <Badge key={g} className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 font-mono">{g}</Badge>)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">Can receive from</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.receive.map((g) => <Badge key={g} className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 font-mono">{g}</Badge>)}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
