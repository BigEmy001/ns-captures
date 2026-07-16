import { Link } from "react-router";
import { photos } from "../data/photos";

interface Topic {
  label: string;
  count: string;
  image: string;
}

const popular: Topic[] = [
  { label: "Lagos", count: "48k", image: photos[8].image },
  { label: "Portrait", count: "63k", image: photos[0].image },
  { label: "Architecture", count: "31k", image: photos[10].image },
  { label: "Fashion", count: "22k", image: photos[3].image },
];

const trending: Topic[] = [
  { label: "West Africa", count: "12k", image: photos[5].image },
  { label: "Documentary", count: "9k", image: photos[7].image },
  { label: "Minimal", count: "7k", image: photos[11].image },
  { label: "Golden hour", count: "5k", image: photos[2].image },
];

function Column({ title, topics }: { title: string; topics: Topic[] }) {
  return (
    <div className="border border-[#ececec] bg-[#ffffff] ns-shadow-sm p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-xl">{title}</h3>
        <Link to="/search" className="text-xs font-semibold text-[#1e4a3f] hover:underline">
          See more
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {topics.map((t) => (
          <Link
            key={t.label}
            to={`/search?q=${encodeURIComponent(t.label)}`}
            className="flex items-center gap-2 rounded-full border border-[#ececec] bg-white py-1 pl-1 pr-3 transition hover:border-[#1e4a3f]"
          >
            <img src={t.image} alt="" loading="lazy" className="size-7 rounded-full object-cover" />
            <span className="text-sm font-medium">{t.label}</span>
            <span className="text-xs text-[#8a8f89]">{t.count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function TopicRail() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Column title="Popular" topics={popular} />
      <Column title="Trending" topics={trending} />
    </div>
  );
}
