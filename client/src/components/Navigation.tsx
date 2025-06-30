import { User } from "lucide-react";
import { Link, useLocation } from "wouter";
import logoPath from "@assets/1_1751287471931.png";

export default function Navigation() {
  const [location] = useLocation();

  const tabs = [
    { path: "/", label: "Главная" },
    { path: "/products", label: "Товары" },
    { path: "/suppliers", label: "Поставщики" }
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center space-x-3">
              <img 
                src={logoPath} 
                alt="iGrape Group Logo" 
                className="h-8 w-8"
              />
              <h1 className="text-xl font-semibold text-gray-900">
                iGrape Group
              </h1>
            </div>
            <div className="hidden md:ml-8 md:flex md:space-x-8">
              {tabs.map((tab) => {
                const isActive = location === tab.path;
                return (
                  <Link
                    key={tab.path}
                    href={tab.path}
                    className={`py-2 px-1 text-sm font-medium border-b-2 ${
                      isActive
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center">
            <button className="bg-gray-50 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
