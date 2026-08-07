import { createBrowserRouter } from "react-router-dom";
import App from "../App.jsx";
import LandingPage from "../components/LandingPage.jsx";
import Home from "../components/docs-ui/Home.jsx"
import Document from "../components/docs-ui/Document.jsx";
import NotFound from "../components/NotFound.jsx"
import Login from "../components/auth/Login.jsx";
import Register from "../components/auth/Register.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <LandingPage/>,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
      {
        path: "/doc",
        element: <Home/>,
      },
      {
        path: "/doc/:docId",
        element: <Document/>,
      },
      {
        path: "*",
        element: <NotFound/>
      }
    ],
  },
]);

export default router;
