import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Router, Route, Switch } from "wouter";
import Navigation from "@/components/Navigation";
import Dashboard from "@/pages/Dashboard";
import ProductsList from "@/pages/ProductsList";
import SuppliersList from "@/pages/SuppliersList";
import ContractorsList from "@/pages/ContractorsList";
import DocumentsList from "@/pages/DocumentsList";
import CreateReceiptDocument from "@/pages/CreateReceiptDocument";
import EditDocument from "@/pages/EditDocument";
import InventoryList from "@/pages/InventoryList";
import OrdersList from "@/pages/OrdersList";
import CreateOrder from "@/pages/CreateOrder";
import EditOrder from "@/pages/EditOrder";
import WarehousesList from "@/pages/WarehousesList";


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/products" component={ProductsList} />
              <Route path="/suppliers" component={SuppliersList} />
              <Route path="/contractors" component={ContractorsList} />
              <Route path="/warehouses" component={WarehousesList} />
              <Route path="/documents" component={DocumentsList} />
              <Route path="/documents/create-receipt" component={CreateReceiptDocument} />
              <Route path="/documents/:id" component={EditDocument} />
              <Route path="/inventory" component={InventoryList} />
              <Route path="/orders" component={OrdersList} />
              <Route path="/orders/create" component={CreateOrder} />
              <Route path="/orders/:id" component={EditOrder} />
            </Switch>
          </div>
        </Router>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
