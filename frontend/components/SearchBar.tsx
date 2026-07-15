

"use client";

import { Search } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Rechercher...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div
      className="
      flex
      items-center
      gap-3
      bg-white
      border
      border-slate-200
      rounded-2xl
      px-4
      py-3
      shadow-sm
      "
    >
      <Search
        size={18}
        className="text-slate-400"
      />

      <input
        type="text"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="
        flex-1
        outline-none
        bg-transparent
        "
      />
    </div>
  );
}