import { Siren, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SOSCard({ health }) {
  const ec = health?.emergency_contact_phone;
  const ecName = health?.emergency_contact_name;
  return (
    <Card className="p-6 border-l-4 border-l-red-600 bg-gradient-to-br from-red-50/80 to-white dark:from-red-950/30 dark:to-slate-900" data-testid="sos-widget">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center">
          <Siren className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Emergency SOS</h3>
          <p className="text-xs text-slate-500">One tap to call {ecName || "your contact"}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2 flex-wrap">
        {ec ? (
          <a href={`tel:${ec}`} className="flex-1" data-testid="sos-call-contact">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white h-11">
              <Phone className="w-4 h-4 mr-2" />Call {ecName || ec}
            </Button>
          </a>
        ) : (
          <Button disabled className="flex-1 h-11" variant="outline">Set contact in Health Profile</Button>
        )}
        <a href="tel:112" data-testid="sos-call-112">
          <Button variant="outline" className="h-11 border-red-300 text-red-700 hover:bg-red-50">
            112
          </Button>
        </a>
      </div>
      {ec && (
        <p className="mt-3 text-xs text-slate-500">On mobile this dials directly. On desktop your OS may hand off to FaceTime or Skype.</p>
      )}
    </Card>
  );
}
