import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useProfiles } from "@/context/ProfileContext";

export default function VitalsSpark() {
  const { active } = useProfiles();
  const [hr, setHR] = useState([]);
  const [bp, setBP] = useState([]);

  useEffect(() => {
    if (!active) return;
    Promise.all([
      api.get(`/vitals?profile_id=${active.id}&type=heart_rate&limit=14`),
      api.get(`/vitals?profile_id=${active.id}&type=blood_pressure&limit=14`),
    ]).then(([a, b]) => {
      setHR(a.data.slice().reverse());
      setBP(b.data.slice().reverse());
    });
  }, [active?.id]);

  const spark = (rows, extract) => rows.map((r) => ({ v: extract(r) }));

  const HRTrend = ({ rows }) => {
    if (rows.length < 2) return <div className="h-14 flex items-center text-xs text-slate-400">Not enough data</div>;
    const first = rows[0].value, last = rows[rows.length - 1].value;
    const up = last > first;
    return (
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{last}</span>
          <span className="text-xs text-slate-500">bpm</span>
          <span className={`text-xs flex items-center gap-0.5 ${up ? "text-amber-600" : "text-emerald-600"}`}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(last - first).toFixed(0)}
          </span>
        </div>
        <div className="h-10 mt-1">
          <ResponsiveContainer><LineChart data={spark(rows, (r) => r.value)}>
            <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
            <Line type="monotone" dataKey="v" stroke="#dc2626" strokeWidth={2} dot={false} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11, padding: "4px 8px" }} labelFormatter={() => ""} />
          </LineChart></ResponsiveContainer>
        </div>
      </div>
    );
  };

  const BPTrend = ({ rows }) => {
    if (rows.length < 2) return <div className="h-14 flex items-center text-xs text-slate-400">Not enough data</div>;
    const last = rows[rows.length - 1];
    return (
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{last.value}/{last.value2}</span>
          <span className="text-xs text-slate-500">mmHg</span>
        </div>
        <div className="h-10 mt-1">
          <ResponsiveContainer><LineChart data={rows.map((r) => ({ s: r.value, d: r.value2 }))}>
            <YAxis hide />
            <Line type="monotone" dataKey="s" stroke="#2563eb" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="d" stroke="#2563eb" strokeWidth={2} strokeDasharray="3 3" dot={false} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
          </LineChart></ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-6" data-testid="vitals-spark-widget">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center"><Activity className="w-5 h-5 text-blue-600" /></div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white">Vitals trend</h3>
          <p className="text-xs text-slate-500">Last 14 readings</p>
        </div>
        <Link to="/vitals" className="text-xs text-teal-700 hover:underline">Details</Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">Heart rate</div>
          <HRTrend rows={hr} />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">Blood pressure</div>
          <BPTrend rows={bp} />
        </div>
      </div>
    </Card>
  );
}
