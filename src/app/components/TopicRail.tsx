import { Link } from "react-router";

interface Topic {
  label: string;
  count: string;
  image: string;
}

const popular: Topic[] = [
  { label: "Lagos", count: "48k", image: "https://images.unsplash.com/photo-1593351799227-75df2026356b?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150" },
  { label: "Portrait", count: "63k", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150" },
  { label: "Architecture", count: "31k", image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150" },
  { label: "Fashion", count: "22k", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150" },
];

const trending: Topic[] = [
  { label: "West Africa", count: "12k", image: "https://images.unsplash.com/photo-1542385151-efd9000785a0?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150" },
  { label: "Documentary", count: "9k", image: "https://images.unsplash.com/photo-1541944743827-e04aa6427c33?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150" },
  { label: "Minimal", count: "7k", image: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150" },
  { label: "Golden hour", count: "5k", image: "https://images.unsplash.com/photo-1472141521881-95d0e87e2e39?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150" },
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
