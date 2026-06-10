import { JsonBadge } from "@/app/components/JsonBadge";

// The same JSON file is imported here in a server component, so it ends up in
// the worker/SSR bundle as well as the client bundle (via JsonBadge).
//
// To reproduce the SECOND failure mode (the `?raw` one), change this import to:
//
//   import sample from "../data/sample.json?raw";
//
// and treat `sample` as a string instead of an object.
import sample from "../data/sample.json";

export const Home = () => {
  return (
    <div>
      <h1>rwsdk JSON import reproduction</h1>
      <p>
        server says: <strong>{sample.greeting}</strong>
      </p>
      <ul>
        {sample.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <JsonBadge />
    </div>
  );
};
