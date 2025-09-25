import { OrderManagement } from "@/components/trading";

export default function OrdersPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Order Management</h1>
        <p className="text-muted-foreground">
          Place and manage your limit and market orders
        </p>
      </div>

      <OrderManagement />
    </div>
  );
}