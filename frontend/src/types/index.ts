export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  product_count?: number;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  categoryId: number | null;
  categoryName?: string;
  costPrice: number;
  salePrice: number;
  stockQuantity: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: number;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  orderHistory?: Order[];
}

export interface OrderItem {
  id?: number;
  productId: number;
  productSku?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: number;
  orderCode: string;
  customerId: number | null;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  createdByName: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  note?: string;
  createdAt: string;
  itemCount?: number;
  items?: OrderItem[];
}

export interface StockMovement {
  id: number;
  productId: number;
  productSku: string;
  productName: string;
  userName: string;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  referenceCode: string;
  note: string;
  createdAt: string;
}

export interface UserAccount {
  id: number;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  isActive: boolean;
  createdAt: string;
}

export interface TopProductItem {
  productId: number;
  productName: string;
  productSku: string;
  totalSold: number;
  totalRevenue: number;
  currentStock: number;
}

export interface RecentOrderItem {
  id: number;
  orderCode: string;
  customerName: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  createdAt: string;
}

export interface TrendItem {
  date: string;
  revenue: number;
  orders: number;
}

export interface DashboardData {
  revenue: {
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
  };
  inventory: {
    totalProducts: number;
    lowStockCount: number;
  };
  customers: {
    totalCustomers: number;
  };
  topSellingProducts: TopProductItem[];
  recentOrders: RecentOrderItem[];
  trend: TrendItem[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

