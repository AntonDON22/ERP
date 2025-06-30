import { User, Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import logoPath from "@assets/1_1751287471931.png";

export default function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isHomeActive = location === "/";
  const isProductsActive = location === "/products";
  const isSuppliersActive = location === "/suppliers";
  const isContractorsActive = location === "/contractors";
  const isDocumentsActive = location === "/documents";
  const isInventoryActive = location === "/inventory";

  const navItems = [
    { href: "/", label: "Главная", isActive: isHomeActive },
    { href: "/products", label: "Товары", isActive: isProductsActive },
    { href: "/suppliers", label: "Поставщики", isActive: isSuppliersActive },
    { href: "/contractors", label: "Контрагенты", isActive: isContractorsActive },
    { href: "/documents", label: "Документы", isActive: isDocumentsActive },
    { href: "/inventory", label: "Остатки", isActive: isInventoryActive },
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
              <h1 className="text-lg md:text-xl font-semibold text-gray-900">
                iGrape Group
              </h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-8 md:flex md:space-x-8">
              {navItems.map((item) => (
                <Link 
                  key={item.href}
                  href={item.href}
                  className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                    item.isActive 
                      ? "border-blue-600 text-blue-600" 
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="bg-gray-50 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100">
              <User className="w-5 h-5" />
            </button>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  item.isActive
                    ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
