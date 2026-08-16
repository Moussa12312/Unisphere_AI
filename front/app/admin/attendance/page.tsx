"use client";

import { useEffect, useState } from "react";

export default function AttendancePage() {

  const [attendances, setAttendances] = useState<any[]>([]);

  useEffect(() => {

    fetch("http://127.0.0.1:8000/attendance")
      .then((res) => res.json())
      .then((data) => setAttendances(data));

  }, []);

  return (
    <div className="text-black">

      <div className="mb-8">

        <h1 className="text-4xl font-bold text-[#031B63]">
          Gestion des Présences
        </h1>

        <p className="text-gray-500">
          Historique des présences enregistrées
        </p>

      </div>

      <div className="bg-white rounded-3xl p-6 shadow mb-6">

        <h2 className="text-xl font-bold mb-2">
          Total Présences
        </h2>

        <p className="text-4xl font-bold text-orange-500">
          {attendances.length}
        </p>

      </div>

      <div className="bg-white rounded-3xl shadow overflow-hidden">

        <table className="w-full">

          <thead className="bg-[#031B63] text-white">

            <tr>

              <th className="p-4 text-left">
                Étudiant
              </th>

              <th className="p-4 text-left">
                Matricule
              </th>

              <th className="p-4 text-left">
                Cours
              </th>

              <th className="p-4 text-left">
                Date
              </th>

            </tr>

          </thead>

          <tbody>

            {attendances.map((attendance) => (

              <tr
                key={attendance.id}
                className="border-b hover:bg-gray-50"
              >

                <td className="p-4">
                  {attendance.student_name}
                </td>

                <td className="p-4">
                  {attendance.matricule}
                </td>

                <td className="p-4">
                  {attendance.course}
                </td>

                <td className="p-4">
                  {new Date(
                    attendance.created_at
                  ).toLocaleString()}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}