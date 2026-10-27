import React from "react";
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import MergeTool from "@/components/pdf-tools/MergeTool";
import SplitTool from "@/components/pdf-tools/SplitTool";
import CompressTool from "@/components/pdf-tools/CompressTool";
import ExportImagesTool from "@/components/pdf-tools/ExportImagesTool";
import ImagesToPdfTool from "@/components/pdf-tools/ImagesToPdfTool";
import RotateTool from "@/components/pdf-tools/RotateTool";
import WatermarkTool from "@/components/pdf-tools/WatermarkTool";
import PageNumberTool from "@/components/pdf-tools/PageNumberTool";
import SignatureTool from "@/components/pdf-tools/SignatureTool";
import PricingModal from "@/components/PricingModal";
import AdBanner from "@/components/AdBanner";

const tools = [
  { path: "/merge", name: "Merge PDF", component: MergeTool },
  { path: "/split", name: "Split PDF", component: SplitTool },
  { path: "/compress", name: "Compress PDF", component: CompressTool },
  { path: "/export-images", name: "PDF to Images", component: ExportImagesTool },
  { path: "/images-to-pdf", name: "Images to PDF", component: ImagesToPdfTool },
  { path: "/rotate", name: "Rotate PDF", component: RotateTool },
  { path: "/watermark", name: "Watermark PDF", component: WatermarkTool },
  { path: "/page-numbers", name: "Add Page Numbers", component: PageNumberTool },
  { path: "/signature", name: "Signature & Sanitize", component: SignatureTool },
];

export default function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <header className="p-4 flex justify-between items-center shadow-md bg-primary-light dark:bg-primary-dark">
          <h1 className="text-2xl font-bold text-white">PDFPulse</h1>
          <nav className="flex space-x-4">
            {tools.map((t) => (
              <NavLink
                key={t.path}
                to={t.path}
                className={({ isActive }) =>
                  isActive ? "text-yellow-300" : "text-white"
                }
              >
                {t.name}
              </NavLink>
            ))}
            <button
              onClick={() => PricingModal.show?.()}
              className="text-white"
            >
              Pricing
            </button>
          </nav>
        </header>
        <main className="flex-grow p-4">
          <AdBanner slot="leaderboard" />
          <Routes>
            {tools.map((t) => (
              <Route key={t.path} path={t.path} element={<t.component />} />
            ))}
            <Route path="*" element={<div>Select a tool from the header.</div>} />
          </Routes>
        </main>
        <footer className="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
          © {new Date().getFullYear()} PDFPulse – All rights reserved.
        </footer>
      </div>
    </Router>
  );
}
