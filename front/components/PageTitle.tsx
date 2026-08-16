export default function PageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-[#00122D]">
        {title}
      </h1>

      {subtitle && (
        <p className="text-gray-500 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}