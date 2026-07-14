import { Link } from "react-router";
import { Button } from "../components/ui";

export function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-[1440px] place-items-center px-5 py-24 text-center">
      <div>
        <p className="font-mono text-[11px] tracking-[0.2em] text-[#49685d]">ERROR 404</p>
        <h1 className="mt-4 font-serif text-6xl leading-none sm:text-8xl">Out of frame.</h1>
        <p className="mx-auto mt-5 max-w-md text-[#59645f]">
          The page you're looking for isn't in the archive. Let's get you back to the imagery.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/"><Button>Back home</Button></Link>
          <Link to="/search"><Button variant="outline">Explore the library</Button></Link>
        </div>
      </div>
    </div>
  );
}
