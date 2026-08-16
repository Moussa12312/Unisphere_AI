"use client";

import { useEffect, useState, use } from "react";

export default function StudentCard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const resolvedParams = use(params);

  const [student, setStudent] =
    useState<any>(null);

  useEffect(() => {

    async function fetchStudent() {

      try {

        const response = await fetch(
          `http://127.0.0.1:8000/students/${resolvedParams.id}`
        );

        const data =
          await response.json();

        console.log(data);

        setStudent(data);

      } catch (error) {

        console.log(error);
      }
    }

    fetchStudent();

  }, [resolvedParams.id]);

  if (!student) {

    return (

      <div
        className="
          min-h-screen
          flex
          items-center
          justify-center
          bg-[#020817]
          text-white
          text-3xl
          font-bold
        "
      >
        Loading...
      </div>

    );
  }

  return (

    <div
        className="
            min-h-screen
            bg-[#020817]
            flex
            items-center
            justify-center
            p-10
            font-sans
        "
    >

      <div
        className="
          relative
          w-[1000px]
          h-[560px]
          rounded-[38px]
          overflow-hidden
          shadow-[0_0_80px_rgba(37,99,235,0.35)]
          border
          border-blue-500/20
          bg-gradient-to-br
          from-[#031b63]
          via-[#041a52]
          to-[#020b2d]
        "
      >

        {/* BACKGROUND */}

        <div className="absolute inset-0 opacity-20">

          <div
            className="
              absolute
              top-0
              left-0
              w-[500px]
              h-[500px]
              bg-blue-500
              blur-[140px]
            "
          />

          <div
            className="
              absolute
              bottom-0
              right-0
              w-[400px]
              h-[400px]
              bg-orange-500
              blur-[140px]
            "
          />

        </div>

        {/* CONTENT */}

        <div className="relative z-10 flex h-full">

          {/* LEFT */}

          <div className="w-[35%] p-10 flex flex-col justify-between">

            <div>

              <h1
                className="
                  text-5xl
                  font-extrabold
                  leading-tight
                  text-white
                  break-words
                "
              >
                {student.university?.name ||
                  "UniSphere AI"}
              </h1>

              <p className="text-blue-200 mt-3 text-lg">
                Université intelligente
              </p>

            </div>

            <div className="space-y-5">

              <div className="h-3 w-52 bg-orange-400 rounded-full" />

              <div className="h-3 w-36 bg-sky-400 rounded-full" />

              <div className="h-3 w-64 bg-white/30 rounded-full" />

            </div>

            <div>

              <p className="text-blue-100 text-xl font-medium">
                Smart Student Card
              </p>

              <p className="text-blue-300 text-sm mt-1">
                Academic Identity System
              </p>

            </div>

          </div>

          {/* CENTER */}

          <div
            className="
              flex-1
              flex
              flex-col
              items-center
              justify-center
              px-6
            "
          >

            <div
              className="
                w-52
                h-52
                rounded-full
                overflow-hidden
                border-[6px]
                border-orange-400
                shadow-[0_0_40px_rgba(251,146,60,0.5)]
              "
            >

              <img
                src={
                  student.photo
                    ? `http://127.0.0.1:8000/uploads/${student.photo}`
                    : "https://ui-avatars.com/api/?name=Student"
                }
                alt="Student"
                className="w-full h-full object-cover"
              />

            </div>

            <h2
              className="
                text-white
                text-5xl
                font-extrabold
                mt-8
                text-center
                leading-tight
                max-w-[420px]
                break-words
              "
            >
              {student.first_name}
              {" "}
              {student.last_name}
            </h2>

            <p
              className="
                text-orange-300
                text-3xl
                mt-5
                font-semibold
                tracking-wider
              "
            >
              {student.matricule}
            </p>

          </div>

            {/* RIGHT */}

            <div
                className="
                    w-[28%]
                    p-6
                    flex
                    flex-col
                    justify-center
                    items-center
                    gap-6
                "
            >

                {/* INFO CARD */}

                <div
                    className="
                    w-full
                    bg-white/10
                    backdrop-blur-xl
                    border
                    border-white/10
                    rounded-[28px]
                    p-6
                    shadow-xl
                    "
                >

                    <div className="space-y-6">

                    <div>

                        <p className="text-blue-200 text-base font-medium">
                        Filière
                        </p>

                        <h3
                        className="
                            text-white
                            text-3xl
                            font-bold
                            leading-tight
                            mt-1
                            break-words
                        "
                        >
                        {student.filiere}
                        </h3>

                    </div>

                    <div>

                        <p className="text-blue-200 text-base font-medium">
                        Niveau
                        </p>

                        <h3
                        className="
                            text-white
                            text-3xl
                            font-bold
                            mt-1
                        "
                        >
                        {student.level}
                        </h3>

                    </div>

                    </div>

                </div>

                {/* QR CODE */}

                <div
                    className="
                    bg-white
                    p-4
                    rounded-[24px]
                    shadow-2xl
                    flex
                    items-center
                    justify-center
                    w-[210px]
                    h-[210px]
                    "
                >

                    <img
                    src={`http://127.0.0.1:8000/qr_codes/${student.qr_code}`}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                    />

                </div>

            </div>

        </div>

      </div>

    </div>
  );
}