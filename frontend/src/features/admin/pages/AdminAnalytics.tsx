import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AdminShell from "../components/AdminShell";
import Card from "../../../components/ui/Card";
import Skeleton from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import { BarChart3 } from "lucide-react";
import { fetchAdminAnalytics } from "../../../lib/services";
import { formatMoney } from "../../../lib/utils";
import type { AdminAnalyticsData } from "../../../types";

const tooltipStyle = {
  background: "#1A2234",
  border: "1px solid rgba(248,250,252,0.14)",
  borderRadius: 10,
  fontSize: 12.5,
  color: "#F8FAFC",
};

export default function AdminAnalytics() {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);

  useEffect(() => {
    fetchAdminAnalytics().then(setData);
  }, []);

  const hasVolume = (data?.monthly_volume.length ?? 0) > 0;
  const hasMix = (data?.currency_mix.length ?? 0) > 0;

  return (
    <AdminShell>
      <h1 className="font-display text-[24px] text-ink">Analytics</h1>
      <p className="mt-1 text-[13px] text-ink-muted">
        Platform-wide hedging volume and currency exposure, computed from executed pools.
      </p>

      <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <p className="text-[13.5px] font-medium text-ink">Monthly hedged volume</p>
          <div className="mt-5 h-64">
            {data === null ? (
              <Skeleton className="h-full" />
            ) : !hasVolume ? (
              <EmptyState icon={BarChart3} title="No executed pools yet" description="Volume appears here once pools are executed." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthly_volume} margin={{ left: -16, right: 8 }}>
                  <defs>
                    <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00D1C7" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#00D1C7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(248,250,252,0.06)" vertical={false} />
                  <XAxis dataKey="month" stroke="#5B6B84" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#5B6B84"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v / 1000}k`}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [formatMoney(Number(value)), "Volume"]}
                    labelStyle={{ color: "#94A3B8" }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#00D1C7" strokeWidth={2} fill="url(#volumeFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-[13.5px] font-medium text-ink">Currency mix</p>
          <div className="mt-5 h-64">
            {data === null ? (
              <Skeleton className="h-full" />
            ) : !hasMix ? (
              <EmptyState icon={BarChart3} title="No data yet" description="Currency mix appears here once pools are executed." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.currency_mix} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid stroke="rgba(248,250,252,0.06)" horizontal={false} />
                  <XAxis type="number" hide domain={[0, 100]} />
                  <YAxis
                    dataKey="currency"
                    type="category"
                    stroke="#94A3B8"
                    fontSize={12.5}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, "Share"]} />
                  <Bar dataKey="value" fill="#00D1C7" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
