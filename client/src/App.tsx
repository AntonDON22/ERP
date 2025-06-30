import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "@/components/Navigation";
import ProductsList from "@/pages/ProductsList";
import ProductDetail from "@/pages/ProductDetail";
import AddProduct from "@/pages/AddProduct";
import EditProduct from "@/pages/EditProduct";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ProductsList} />
      <Route path="/products/add" component={AddProduct} />
      <Route path="/products/:id" component={ProductDetail} />
      <Route path="/products/:id/edit" component={EditProduct} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
