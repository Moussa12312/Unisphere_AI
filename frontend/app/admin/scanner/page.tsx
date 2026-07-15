"use client";

import { Scanner } from "@yudiel/react-qr-scanner";

export default function ScannerPage() {
  const handleScan = async (result: any) => {
    if (!result?.[0]?.rawValue) return;

    const matricule = result[0].rawValue;

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/attendance/${matricule}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      alert(data.message);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8">
        Scanner QR
      </h1>

      <div className="max-w-lg">
        <Scanner
          onScan={handleScan}
          onError={(error) => console.log(error)}
        />
      </div>
    </div>
  );
}