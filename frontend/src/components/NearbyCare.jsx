import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api, apiErr } from "@/lib/api";
import { MapPin, Hospital, Droplet, Cross, Loader2, Navigation, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Fix leaflet default icon paths (webpack strips them)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const typedIcon = (color) => L.divIcon({
  className: "medi-marker",
  html: `<div style="background:${color};width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
           <div style="width:8px;height:8px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
         </div>`,
  iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -26],
});
const meIcon = L.divIcon({
  className: "me-marker",
  html: `<div style="width:16px;height:16px;background:#0f766e;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(15,118,110,0.25);"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

const TYPES = [
  { key: "hospital", label: "Hospitals", color: "#dc2626", icon: Hospital },
  { key: "blood_donation", label: "Blood banks", color: "#b91c1c", icon: Droplet },
  { key: "pharmacy", label: "Pharmacies", color: "#059669", icon: Cross },
  { key: "clinic", label: "Clinics", color: "#2563eb", icon: Cross },
];

function FitBounds({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, 13); }, [center, map]);
  return null;
}

export default function NearbyCare() {
  const [pos, setPos] = useState(null);
  const [places, setPlaces] = useState([]);
  const [type, setType] = useState("hospital");
  const [loading, setLoading] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) { setGeoDenied(true); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setPos([p.coords.latitude, p.coords.longitude]),
      () => { setGeoDenied(true); setPos([28.6139, 77.2090]); }, // fallback New Delhi
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (!pos) return;
    setLoading(true);
    api.get(`/places?lat=${pos[0]}&lon=${pos[1]}&radius=5000&type=${type}`)
      .then((r) => setPlaces(r.data))
      .catch((e) => toast.error(apiErr(e, "Could not fetch places")))
      .finally(() => setLoading(false));
  }, [pos, type]);

  const meta = TYPES.find((t) => t.key === type);

  return (
    <Card className="p-0 overflow-hidden" data-testid="nearby-care-widget">
      <div className="p-6 pb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Nearby care</h3>
            <p className="text-xs text-slate-500">{loading ? "Searching…" : `${places.length} within 5 km`}</p>
          </div>
        </div>
        <div className="flex gap-1 flex-wrap">
          {TYPES.map((t) => (
            <button key={t.key} onClick={() => setType(t.key)} data-testid={`place-filter-${t.key}`}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${type === t.key ? "bg-slate-900 text-white border-slate-900" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {geoDenied && <div className="mx-6 mb-3 text-xs p-2 rounded bg-amber-50 border border-amber-200 text-amber-800">Location permission denied. Showing New Delhi as default.</div>}
      <div className="h-72 relative">
        {!pos ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Locating…</div>
        ) : (
          <MapContainer center={pos} zoom={13} className="h-full w-full" scrollWheelZoom={false}>
            <FitBounds center={pos} />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            <Marker position={pos} icon={meIcon}><Popup>You are here</Popup></Marker>
            {places.map((p) => (
              <Marker key={p.id} position={[p.lat, p.lon]} icon={typedIcon(meta.color)}>
                <Popup>
                  <div className="min-w-[180px]">
                    <div className="font-semibold text-sm text-slate-900">{p.name}</div>
                    {p.address && <div className="text-xs text-slate-500 mt-1">{p.address}</div>}
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {p.phone && <a href={`tel:${p.phone}`} className="text-xs text-teal-700 flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</a>}
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`} target="_blank" rel="noreferrer" className="text-xs text-teal-700 flex items-center gap-1"><Navigation className="w-3 h-3" />Directions</a>
                    </div>
                    {p.emergency && <Badge className="mt-2 bg-red-100 text-red-800 hover:bg-red-100 border-red-200 text-[10px]">24×7 Emergency</Badge>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </Card>
  );
}
