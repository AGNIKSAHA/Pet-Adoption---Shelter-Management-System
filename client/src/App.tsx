import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { store, useAppDispatch } from "./store/store";
import { setUser, setLoading } from "./store/slices/authSlice";
import api from "./lib/api";

import { router } from "./routes";
import SocketHandler from "./components/SocketHandler";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function AppInitialiser() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await api.get("/auth/me");
        dispatch(setUser(response.data.data.user));
      } catch (error) {
        dispatch(setLoading(false));
      }
    };

    initAuth();
  }, [dispatch]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        window.location.reload();
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      window.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return (
    <>
      <SocketHandler />
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </>
  );
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AppInitialiser />
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
