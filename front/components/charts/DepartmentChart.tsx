"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const data = [
  { name: "Informatique", value: 40 },
  { name: "Gestion", value: 25 },
  { name: "Finance", value: 20 },
  { name: "Droit", value: 15 },
];

const COLORS = [
  "#031B63",
  "#FF6B00",
  "#2563EB",
  "#10B981",
];

export default function DepartmentChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          outerRadius={90}
          label
        >
          {data.map((_, index) => (
            <Cell
              key={index}
              fill={COLORS[index]}
            />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}