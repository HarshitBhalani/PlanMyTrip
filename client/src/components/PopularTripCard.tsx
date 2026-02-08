"use client";

interface Props {
  title: string;
  image: string;
  days: string;
  type: string;
  onClick: () => void;
}

export default function PopularTripCard({
  title,
  image,
  days,
  type,
  onClick,
}: Props) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl overflow-hidden shadow hover:shadow-lg transition bg-white"
    >
      <img
        src={image}
        alt={title}
        className="h-48 w-full object-cover"
      />
      <div className="p-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{days}</p>
        <p className="text-sm text-gray-600 mt-1">{type}</p>
      </div>
    </div>
  );
}
