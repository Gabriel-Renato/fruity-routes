import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CustomerDashboard from "./pages/dashboard/Customer";
import StoreDashboard from "./pages/dashboard/Store";
import RiderDashboard from "./pages/dashboard/Rider";
import Profile from "./pages/profile/Profile";
import NewProduct from "./pages/store/NewProduct";
import NotFound from "./pages/NotFound";
import { CartProvider } from "./context/CartContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CustomerDashboard />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard/customer" element={<CustomerDashboard />} />
          <Route path="/dashboard/store" element={<StoreDashboard />} />
          <Route path="/dashboard/rider" element={<RiderDashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/store/products/new" element={<NewProduct />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
