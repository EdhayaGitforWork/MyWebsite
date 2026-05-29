"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { enquiriesApi } from "../lib/apiClient";

type Service = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const services: Service[] = [
  {
    id: "01",
    title: "Front-End Development",
    description: "Coding the visual elements users interact with (HTML, CSS, JavaScript) to ensure the site is responsive, fast, and accessible.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    id: "02",
    title: "Back-End Development..",
    description: "Building the server-side infrastructure, managing databases, and developing Application Programming Interfaces (APIs) to ensure data flows securely.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
  },
  {
    id: "03",
    title: "Full-Stack Development",
    description: "Combining both front-end and back-end responsibilities to handle end-to-end project execution.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: "04",
    title: "E-Commerce Development",
    description: "Creating online stores, integrating shopping carts, and securing payment gateways (e.g., Stripe, PayPal).",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    ),
  },
  {
    id: "05",
    title: "Content Management Systems (CMS)",
    description: "Customizing, developing, or migrating platforms like WordPress, Shopify, or Webflow.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
  },
  {
    id: "06",
    title: "Web Applications & SaaS",
    description: "Building complex, browser-based tools that perform dynamic functions similar to desktop software.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
  {
    id: "07",
    title: "Maintenance & Support",
    description: "Providing ongoing technical updates, security patches, performance monitoring, and bug fixes.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: "08",
    title: "SEO & Analytics",
    description: "Implementing technical optimizations to improve search engine rankings and setting up user tracking metrics.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  }
];

export default function ServicesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // State
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [projectDuration, setProjectDuration] = useState("");
  const [domain, setDomain] = useState("Banking");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  const toggleSelection = (id: string) => {
    setSelectedCards((prev) => 
      prev.includes(id) ? prev.filter(cardId => cardId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      userName: user?.email || "Unknown User", // Assuming name might not be set, using email as fallback
      email: user?.email || "Unknown Email",
      mobileNo,
      selectedServices: services.filter(s => selectedCards.includes(s.id)).map(s => s.title),
      companyName,
      projectDuration,
      domain
    };
    
    console.log("Sending to backend:", payload);
    
    try {
      await enquiriesApi.submit(payload, user.token);
    } catch (error) {
      console.error("Failed to submit enquiry:", error);
      alert("There was an error submitting your request. Please try again.");
      return;
    }
    
    // Clear state so that if user clicks back button, it's reset
    setIsModalOpen(false);
    setCompanyName("");
    setMobileNo("");
    setProjectDuration("");
    setDomain("Banking");
    setSelectedCards([]);

    // Redirect to Thank You page
    router.push("/thank-you");
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-pink-200 relative">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center gap-3 text-slate-900">
            <span className="text-pink-500">⚡</span> My Services
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl">
            Providing end-to-end development, strategy, and maintenance to bring your ideas to life.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const isSelected = selectedCards.includes(service.id);
            
            return (
              <div
                key={service.id}
                onClick={() => toggleSelection(service.id)}
                className={`group relative rounded-xl p-6 transition-all duration-500 hover:-translate-y-1 overflow-hidden cursor-pointer ${
                  isSelected 
                    ? "bg-black border-black shadow-[0_15px_40px_rgba(0,0,0,0.2)]" 
                    : "bg-pink-50/70 border border-pink-100 hover:border-purple-300 hover:shadow-[0_15px_40px_rgba(168,85,247,0.12)] hover:bg-white"
                }`}
              >
                {/* Highlight gradient at the top of the card that appears on hover */}
                {!isSelected && (
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                )}

                {/* Top Row: Icon & ID */}
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-14 h-14 rounded-xl border flex items-center justify-center transition-all duration-500 ${
                    isSelected 
                      ? "bg-slate-800 border-slate-700 text-white" 
                      : "border-pink-200 text-pink-500 bg-white group-hover:bg-purple-50 group-hover:border-purple-300 group-hover:text-purple-600 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                  }`}>
                    {service.icon}
                  </div>
                  <div className={`text-5xl font-extrabold transition-colors duration-500 select-none ${
                    isSelected ? "text-slate-800" : "text-pink-200/60 group-hover:text-purple-200"
                  }`}>
                    {service.id}
                  </div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <h3 className={`text-xl font-bold mb-3 transition-colors duration-300 ${
                    isSelected ? "text-white" : "text-slate-800 group-hover:text-purple-700"
                  }`}>
                    {service.title}
                  </h3>
                  <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                    isSelected ? "text-slate-300" : "text-slate-600 group-hover:text-slate-700"
                  }`}>
                    {service.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Us Button */}
        <div className="mt-16 flex justify-center">
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: "16px 48px",
              fontSize: "18px",
              fontWeight: 600,
              background: "linear-gradient(135deg, #a855f7, #ec4899)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              boxShadow: "0 10px 25px -5px rgba(236, 72, 153, 0.4)",
            }}
          >
            Contact Us
          </button>
        </div>
      </main>

      {/* Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">Project Details</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Enter Company Name: (Optional)
                </label>
                <input 
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all text-slate-900"
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Select Domain:
                </label>
                <select 
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all text-slate-900 bg-white"
                >
                  <option value="Banking">Banking</option>
                  <option value="Fintech">Fintech</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Mobile number:
                </label>
                <input 
                  type="tel"
                  required
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all text-slate-900"
                  placeholder="e.g. +1 234 567 8900"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Project duration in months:
                </label>
                <input 
                  type="number"
                  min="1"
                  required
                  value={projectDuration}
                  onChange={(e) => setProjectDuration(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all text-slate-900"
                  placeholder="e.g. 6"
                />
              </div>

              {selectedCards.length > 0 && (
                <div className="mb-6 bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <p className="text-xs font-semibold text-purple-700 mb-1">Selected Services:</p>
                  <p className="text-sm text-purple-600 font-medium">
                    {selectedCards.length} service{selectedCards.length > 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
              
              <button
                type="submit"
                style={{
                  padding: "13px",
                  fontSize: "15px",
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #a855f7, #ec4899)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}