import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { GuestRoute, AuthRoute, AdminRoute, AdminGuestRoute, PhotographerRoute, EnterpriseRoute } from "./components/RouteGuards";
import { ErrorBoundary } from "./components/ErrorBoundary";

const Home = lazy(() => import("./pages/Home").then(m => ({ default: m.Home })));
const SearchPage = lazy(() => import("./pages/Search").then(m => ({ default: m.SearchPage })));
const PhotoDetail = lazy(() => import("./pages/PhotoDetail").then(m => ({ default: m.PhotoDetail })));
const Collections = lazy(() => import("./pages/Collections").then(m => ({ default: m.Collections })));
const Requests = lazy(() => import("./pages/Requests").then(m => ({ default: m.Requests })));
const Pricing = lazy(() => import("./pages/Pricing").then(m => ({ default: m.Pricing })));
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Enterprise = lazy(() => import("./pages/Enterprise").then(m => ({ default: m.Enterprise })));
const Contribute = lazy(() => import("./pages/Contribute").then(m => ({ default: m.Contribute })));
const PhotographerProfile = lazy(() => import("./pages/PhotographerProfile").then(m => ({ default: m.PhotographerProfile })));
const Account = lazy(() => import("./pages/Account").then(m => ({ default: m.Account })));
const Admin = lazy(() => import("./pages/Admin").then(m => ({ default: m.Admin })));
const NotFound = lazy(() => import("./pages/NotFound").then(m => ({ default: m.NotFound })));
const SignIn = lazy(() => import("./pages/auth/SignIn").then(m => ({ default: m.SignIn })));
const SignUp = lazy(() => import("./pages/auth/SignUp").then(m => ({ default: m.SignUp })));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword").then(m => ({ default: m.ForgotPassword })));
const AdminLogin = lazy(() => import("./pages/auth/AdminLogin").then(m => ({ default: m.AdminLogin })));

const fallback = (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-pulse text-[#6b716d]">Loading...</div>
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <Suspense fallback={fallback}><Home /></Suspense> },
      { path: "search", element: <Suspense fallback={fallback}><SearchPage /></Suspense> },
      { path: "photo/:id", element: <Suspense fallback={fallback}><PhotoDetail /></Suspense> },
      { path: "photographer/:id", element: <Suspense fallback={fallback}><PhotographerProfile /></Suspense> },
      { path: "collections", element: <Suspense fallback={fallback}><Collections /></Suspense> },
      { path: "requests", element: <Suspense fallback={fallback}><Requests /></Suspense> },
      { path: "pricing", element: <Suspense fallback={fallback}><Pricing /></Suspense> },
      { path: "contribute", element: <Suspense fallback={fallback}><Contribute /></Suspense> },
      {
        path: "signin",
        Component: GuestRoute,
        children: [{ index: true, element: <Suspense fallback={fallback}><SignIn /></Suspense> }],
      },
      {
        path: "signup",
        Component: GuestRoute,
        children: [{ index: true, element: <Suspense fallback={fallback}><SignUp /></Suspense> }],
      },
      {
        path: "forgot-password",
        Component: GuestRoute,
        children: [{ index: true, element: <Suspense fallback={fallback}><ForgotPassword /></Suspense> }],
      },
      {
        path: "account",
        Component: AuthRoute,
        children: [{ index: true, element: <Suspense fallback={fallback}><Account /></Suspense> }],
      },
      {
        path: "dashboard",
        Component: PhotographerRoute,
        children: [{ index: true, element: <Suspense fallback={fallback}><Dashboard /></Suspense> }],
      },
      {
        path: "enterprise",
        Component: EnterpriseRoute,
        children: [{ index: true, element: <Suspense fallback={fallback}><Enterprise /></Suspense> }],
      },
      {
        path: "admin/login",
        Component: AdminGuestRoute,
        children: [{ index: true, element: <Suspense fallback={fallback}><AdminLogin /></Suspense> }],
      },
      {
        path: "admin",
        Component: AdminRoute,
        children: [{ index: true, element: <Suspense fallback={fallback}><Admin /></Suspense> }],
      },
      { path: "*", element: <Suspense fallback={fallback}><NotFound /></Suspense> },
    ],
  },
]);
