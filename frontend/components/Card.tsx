import { ReactNode } from "react";

export default function Card({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <div
      className="
      bg-white
      rounded-3xl
      border
      border-slate-100
      shadow-sm
      p-6
      "
    >
      {title && (
        <h2 className="text-xl font-bold text-[#00122D] mb-6">
          {title}
        </h2>
      )}

      {children}
    </div>
  );
}