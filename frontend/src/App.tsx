import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Spinner } from "./components/Spinner";

const DetectorPage = lazy(() => import("./pages/DetectorPage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const DevComponentsPage = lazy(() => import("./pages/DevComponentsPage"));

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-bg-page text-text-body font-sans">
        <Navbar />
        <main className="flex-1 w-full flex flex-col">
          <Suspense
            fallback={
              <div className="py-20 flex justify-center items-center" role="status">
                <Spinner size="lg" label="Loading page..." />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<DetectorPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/dev/components" element={<DevComponentsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;
