import { User, Menu, X, ChevronDown, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";

export default function Navigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isHomeActive = location === "/";
  const isProductsActive = location === "/products";
  const isSuppliersActive = location === "/suppliers";
  const isContractorsActive = location === "/contractors";
  const isWarehousesActive = location === "/warehouses";
  const isDocumentsActive = location === "/documents";
  const isInventoryActive = location === "/inventory";
  const isOrdersActive = location === "/orders";
  const isShipmentsActive = location === "/shipments";
  const isResponsiveTestActive = location === "/responsive-test";

  const isSettingsActive =
    location.startsWith("/suppliers") ||
    location.startsWith("/contractors") ||
    location.startsWith("/warehouses") ||
    location === "/responsive-test";

  const mainNavItems = [
    { href: "/", label: "Главная", isActive: isHomeActive },
    { href: "/products", label: "Товары", isActive: isProductsActive },
    { href: "/documents", label: "Документы", isActive: isDocumentsActive },
    { href: "/inventory", label: "Остатки", isActive: isInventoryActive },
    { href: "/orders", label: "Заказы", isActive: isOrdersActive },
    { href: "/shipments", label: "Отгрузки", isActive: isShipmentsActive },
  ];

  const settingsItems = [
    { href: "/suppliers", label: "Поставщики", isActive: isSuppliersActive },
    { href: "/contractors", label: "Контрагенты", isActive: isContractorsActive },
    { href: "/warehouses", label: "Склады", isActive: isWarehousesActive },
    { href: "/responsive-test", label: "Тест адаптивности", isActive: isResponsiveTestActive },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200hidden md:flex">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16">
          <div className="flex items-center min-w-0">
            <div className="flex-shrink-0 flex items-center space-x-2 sm:space-x-3">
              <User className="h-6 w-6 sm:h-8 sm:w-8" />
              <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate">
                iGrape Group
              </h1>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:ml-4 lg:ml-8 md:flex md:space-x-4 lg:space-x-8">
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`py-2 px-1 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    item.isActive
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              {/* Settings Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`py-2 px-1 text-xs md:text-sm font-medium border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${
                    isSettingsActive
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Настройки
                  {isSettingsOpen ? (
                    <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
                  ) : (
                    <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                </button>

                {isSettingsOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[160px] md:min-w-[180px]">
                    {settingsItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block px-4 py-2 text-sm transition-colors first:rounded-t-md last:rounded-b-md ${
                          item.isActive
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                        onClick={() => setIsSettingsOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
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
            {/* Main navigation items */}
            {mainNavItems.map((item) => (
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

            {/* Settings section */}
            <div className="pt-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Настройки
              </div>
              {settingsItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-6 py-2 rounded-md text-base font-medium transition-colors ${
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
        </div>
      )}
    </nav>
  );
}
