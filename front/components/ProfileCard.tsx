interface ProfileCardProps {
  firstName: string;
  lastName: string;
  email: string;
  matricule: string;
  photo?: string | null;
}

export default function ProfileCard({
  firstName,
  lastName,
  email,
  matricule,
  photo,
}: ProfileCardProps) {
  return (
    <div
      className="
      bg-white
      rounded-3xl
      shadow-sm
      border
      border-slate-100
      p-8
      "
    >
      <div className="flex flex-col md:flex-row gap-8 items-center">

        <div className="w-40 h-40">

          {photo ? (
            <img
              src={photo}
              alt="profile"
              className="
              w-full
              h-full
              rounded-full
              object-cover
              border-4
              border-white
              shadow-lg
              "
            />
          ) : (
            <div
              className="
              w-full
              h-full
              rounded-full
              bg-[#00122D]
              text-white
              flex
              items-center
              justify-center
              text-5xl
              font-bold
              "
            >
              {firstName[0]}
              {lastName[0]}
            </div>
          )}

        </div>

        <div className="flex-1">

          <h2 className="text-3xl font-bold text-[#00122D]">
            {firstName} {lastName}
          </h2>

          <p className="text-gray-500 mt-2">
            {email}
          </p>

          <div className="mt-6">

            <p className="text-sm text-gray-500">
              Matricule
            </p>

            <p className="font-bold text-xl text-[#00122D]">
              {matricule}
            </p>

          </div>

        </div>

      </div>
    </div>
  );
}