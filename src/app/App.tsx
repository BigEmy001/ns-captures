import { RouterProvider } from "react-router";
import { router } from "./routes";
import { GlobalErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <GlobalErrorBoundary>
      <RouterProvider router={router} />
    </GlobalErrorBoundary>
  );
}
