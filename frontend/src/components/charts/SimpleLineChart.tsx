import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  month: string;
  bookings: number;
}

function SimpleLineChart({
  chartData,
  xData,
  yData,
}: {
  chartData: ChartData[];
  xData: string;
  yData: string;
}) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FE5300" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#FE5300" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey={xData} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#64748b' }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#64748b' }} 
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Area
            type="monotone"
            dataKey={yData}
            stroke="#FE5300"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorBookings)"
            activeDot={{ r: 6, fill: '#FE5300', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SimpleLineChart;
