import { User } from "lucide-react";
import { Link, useLocation } from "wouter";
import logoPath from "@assets/1_1751287471931.png";

export default function Navigation() {
  const [location] = useLocation();
  
  const isHomeActive = location === "/";
  const isProductsActive = location === "/products";
  const isSuppliersActive = location === "/suppliers";
  const isContractorsActive = location === "/contractors";
  const isDocumentsActive = location === "/documents";
  const isInventoryActive = location === "/inventory";

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
              <h1 className="text-lg md:text-xl font-semibold text-gray-900 hidden sm:block">
                iGrape Group
              </h1>
            </div>
            <div className="ml-4 md:ml-8 flex space-x-2 md:space-x-8">
              <Link 
                href="/"
                className={`py-2 px-1 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                  isHomeActive 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Главная
              </Link>
              <Link 
                href="/products"
                className={`py-2 px-1 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                  isProductsActive 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Товары
              </Link>
              <Link 
                href="/suppliers"
                className={`py-2 px-1 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                  isSuppliersActive 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Поставщики
              </Link>
              <Link 
                href="/contractors"
                className={`py-2 px-1 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                  isContractorsActive 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Контрагенты
              </Link>
              <Link 
                href="/documents"
                className={`py-2 px-1 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                  isDocumentsActive 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Документы
              </Link>
              <Link 
                href="/inventory"
                className={`py-2 px-1 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                  isInventoryActive 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Остатки
              </Link>
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
