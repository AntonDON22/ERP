import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Router, Route, Switch } from "wouter";
import { Suspense, lazy } from "react";
import Navigation from "@/components/Navigation";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy загрузка основных страниц
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const ProductsList = lazy(() => import("@/pages/ProductsList"));
const SuppliersList = lazy(() => import("@/pages/SuppliersList"));
const ContractorsList = lazy(() => import("@/pages/ContractorsList"));
const DocumentsList = lazy(() => import("@/pages/DocumentsList"));
const CreateReceiptDocument = lazy(() => import("@/pages/CreateReceiptDocument"));
const EditDocument = lazy(() => import("@/pages/EditDocument"));
const InventoryList = lazy(() => import("@/pages/InventoryList"));
const OrdersList = lazy(() => import("@/pages/OrdersList"));
const CreateOrder = lazy(() => import("@/pages/CreateOrder"));
const EditOrder = lazy(() => import("@/pages/EditOrder"));
const WarehousesList = lazy(() => import("@/pages/WarehousesList"));
const CreateSupplier = lazy(() => import("@/pages/CreateSupplier"));
const CreateContractor = lazy(() => import("@/pages/CreateContractor"));
const CreateWarehouse = lazy(() => import("@/pages/CreateWarehouse"));
const ResponsiveTest = lazy(() => import("@/pages/ResponsiveTest"));

// Компонент загрузки
function PageSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <Suspense fallback={<PageSkeleton />}>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/products" component={ProductsList} />
                <Route path="/suppliers" component={SuppliersList} />
                <Route path="/suppliers/create" component={CreateSupplier} />
                <Route path="/contractors" component={ContractorsList} />
                <Route path="/contractors/create" component={CreateContractor} />
                <Route path="/warehouses" component={WarehousesList} />
                <Route path="/warehouses/create" component={CreateWarehouse} />
                <Route path="/documents" component={DocumentsList} />
                <Route path="/documents/create" component={CreateReceiptDocument} />
                <Route path="/documents/:id" component={EditDocument} />
                <Route path="/inventory" component={InventoryList} />
                <Route path="/orders" component={OrdersList} />
                <Route path="/orders/create" component={CreateOrder} />
                <Route path="/orders/:id" component={EditOrder} />
                <Route path="/responsive-test" component={ResponsiveTest} />
              </Switch>
            </Suspense>
          </div>
        </Router>
        <Toaster />
        <ReactQueryDevtools initialIsOpen={false} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
