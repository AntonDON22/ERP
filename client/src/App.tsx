import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import Navigation from "@/components/Navigation";
import Dashboard from "@/pages/Dashboard";
import ProductsList from "@/pages/ProductsList";
import SuppliersList from "@/pages/SuppliersList";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/products" component={ProductsList} />
            <Route path="/suppliers" component={SuppliersList} />
          </Switch>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
