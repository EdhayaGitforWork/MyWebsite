"use client";

import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";

export default function ThankYouPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-pink-200 flex flex-col">
      <Navbar />
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-pink-50/70 border border-pink-100 rounded-2xl p-10 text-center shadow-xl">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(168,85,247,0.15)] border border-pink-200 text-purple-500 text-4xl">
            🎉
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-4">
            Thanks for contacting us!
          </h1>
          <p className="text-slate-600 text-lg mb-8 leading-relaxed">
            We have received your enquiry and will contact you soon.
          </p>
          <button
            onClick={() => router.push("/blog")}
            className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:shadow-lg hover:opacity-90 transition-all duration-300"
          >
            Back to Services
          </button>
        </div>
      </main>
    </div>
  );
}
