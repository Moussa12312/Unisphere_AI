"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const data = [
  { month: "Jan", students: 400 },
  { month: "Fév", students: 650 },
  { month: "Mar", students: 900 },
  { month: "Avr", students: 1100 },
  { month: "Mai", students: 1245 },
];

export default function StudentsChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="students"
          stroke="#031B63"
          strokeWidth={4}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}