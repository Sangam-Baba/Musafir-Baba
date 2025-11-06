import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
    <div className="w-full h-96 bg-white rounded-xl shadow p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey={xData} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey={yData}
            stroke="#FE5300"
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SimpleLineChart;
