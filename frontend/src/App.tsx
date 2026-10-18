import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  ChartNoAxesCombined,
  Search,
  Plus,
  TrendingUp,
  AlertTriangle,
  X,
  Warehouse,
  ShieldCheck,
  LogOut,
  Menu,
  Eye,
  Ban,
  Download,
  Boxes,
  ClipboardList,
  Edit,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { apiRequest, getToken, setToken, removeToken } from './api/client';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { DashboardView } from './components/Dashboard/DashboardView';
import {
  AuthUser,
  Category,
  Product,
  Customer,
  Order,
  StockMovement,
  UserAccount,
  DashboardData,
  Pagination,
} from './types';

const money = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);

export default function App() {
  // Auth state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Navigation state
  const [page, setPage] = useState<string>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Common UI states
  const [globalLoading, setGlobalLoading] = useState(false);

  // Data states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsPagination, setProductsPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersPagination, setCustomersPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersPagination, setOrdersPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsPagination, setMovementsPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [usersList, setUsersList] = useState<UserAccount[]>([]);

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('');
  const [inventoryTab, setInventoryTab] = useState<'movements' | 'low-stock'>('movements');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // POS / Create Order Cart state
  const [cartItems, setCartItems] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [posCustomerId, setPosCustomerId] = useState<number | ''>('');
  const [posDiscount, setPosDiscount] = useState<number>(0);
  const [posNote, setPosNote] = useState('');

  // Modals state
  const [activeModal, setActiveModal] = useState<
    'product_add' | 'product_edit' | 'category_add' | 'category_edit' | 'customer_add' | 'customer_edit' |
    'customer_detail' | 'order_detail' | 'stock_action' | 'user_add' | null
  >(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCategoryItem, setSelectedCategoryItem] = useState<Category | null>(null);

  // Form input states
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCatId, setFormCatId] = useState<number | ''>('');
  const [formCost, setFormCost] = useState<number | ''>('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formStock, setFormStock] = useState<number | ''>('');
  const [formDesc, setFormDesc] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formMovementType, setFormMovementType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [formMovementQty, setFormMovementQty] = useState<number>(1);
  const [formMovementNote, setFormMovementNote] = useState('');
  const [formUserRole, setFormUserRole] = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [formUserPassword, setFormUserPassword] = useState('');

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  function toast(text: string, isError = false) {
    setToastMsg({ text, error: isError });
    setTimeout(() => setToastMsg(null), 3000);
  }

  // Check auth session on boot
  useEffect(() => {
    async function checkAuth() {
      const token = getToken();
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const res = await apiRequest('/auth/me');
        if (res.success && res.data) {
          setUser(res.data);
        }
      } catch (err) {
        removeToken();
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();

    const handleExpired = () => {
      setUser(null);
      toast('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.', true);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  // Fetch data per page
  const loadDashboard = useCallback(async () => {
    try {
      setGlobalLoading(true);
      const res = await apiRequest('/reports/dashboard');
      if (res.success) setDashboardData(res.data);
    } catch (err: any) {
      toast(err.message, true);
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async (p = 1, search = '', cat = '') => {
    try {
      setGlobalLoading(true);
      let query = `/products?page=${p}&limit=12`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (cat) query += `&categoryId=${cat}`;
      const res = await apiRequest(query);
      if (res.success) {
        setProducts(res.data);
        if (res.pagination) setProductsPagination(res.pagination);
      }
    } catch (err: any) {
      toast(err.message, true);
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await apiRequest('/categories');
      if (res.success) setCategories(res.data);
    } catch (err: any) {
      toast(err.message, true);
    }
  }, []);

  const loadCustomers = useCallback(async (p = 1, search = '') => {
    try {
      setGlobalLoading(true);
      let query = `/customers?page=${p}&limit=15`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      const res = await apiRequest(query);
      if (res.success) {
        setCustomers(res.data);
        if (res.pagination) setCustomersPagination(res.pagination);
      }
    } catch (err: any) {
      toast(err.message, true);
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async (p = 1, search = '', status = '') => {
    try {
      setGlobalLoading(true);
      let query = `/orders?page=${p}&limit=15`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (status) query += `&status=${status}`;
      const res = await apiRequest(query);
      if (res.success) {
        setOrders(res.data);
        if (res.pagination) setOrdersPagination(res.pagination);
      }
    } catch (err: any) {
      toast(err.message, true);
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  const loadMovements = useCallback(async (p = 1) => {
    try {
      setGlobalLoading(true);
      const res = await apiRequest(`/inventory/movements?page=${p}&limit=15`);
      if (res.success) {
        setMovements(res.data);
        if (res.pagination) setMovementsPagination(res.pagination);
      }
    } catch (err: any) {
      toast(err.message, true);
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  const loadLowStock = useCallback(async () => {
    try {
      const res = await apiRequest('/inventory/low-stock');
      if (res.success) setLowStockProducts(res.data);
    } catch (err: any) {
      toast(err.message, true);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await apiRequest('/users');
      if (res.success) setUsersList(res.data);
    } catch (err: any) {
      toast(err.message, true);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadCategories();
    if (page === 'dashboard') loadDashboard();
    if (page === 'products') loadProducts(1, searchTerm, selectedCategory);
    if (page === 'customers') loadCustomers(1, searchTerm);
    if (page === 'orders') loadOrders(1, searchTerm, orderStatusFilter);
    if (page === 'pos') {
      loadProducts(1, '', '');
      loadCustomers(1, '');
    }
    if (page === 'inventory') {
      loadMovements(1);
      loadLowStock();
    }
    if (page === 'reports') loadDashboard();
    if (page === 'users' && user.role === 'ADMIN') loadUsers();
  }, [user, page, loadDashboard, loadProducts, loadCategories, loadCustomers, loadOrders, loadMovements, loadLowStock, loadUsers]);

  // Auth Handlers
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (res.success && res.data.token) {
        setToken(res.data.token);
        setUser(res.data.user);
        toast(`Xin chào ${res.data.user.fullName}!`);
        setPage('dashboard');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Đăng nhập không thành công.');
    }
  }

  function handleLogout() {
    apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    removeToken();
    setUser(null);
    setPage('dashboard');
    toast('Đã đăng xuất khỏi hệ thống.');
  }

  // Quick Demo account fill
  function fillDemo(email: string, pass: string) {
    setLoginEmail(email);
    setLoginPassword(pass);
    setLoginError('');
  }

  // Navigation items
  const navItems = useMemo(() => {
    const list = [
      { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
      { id: 'pos', label: 'Bán hàng (POS)', icon: Plus },
      { id: 'orders', label: 'Đơn hàng', icon: ShoppingCart },
      { id: 'products', label: 'Sản phẩm', icon: Package },
      { id: 'categories', label: 'Danh mục', icon: Boxes },
      { id: 'customers', label: 'Khách hàng', icon: Users },
      { id: 'inventory', label: 'Quản lý kho', icon: Warehouse },
      { id: 'reports', label: 'Báo cáo', icon: ChartNoAxesCombined },
    ];
    if (user?.role === 'ADMIN') {
      list.push({ id: 'users', label: 'Người dùng', icon: ShieldCheck });
    }
    return list;
  }, [user]);

  // Open modals with pre-fill
  function openAddProduct() {
    setFormSku(`SP-${String(productsPagination.total + 1).padStart(3, '0')}`);
    setFormName('');
    setFormCatId(categories[0]?.id || '');
    setFormCost('');
    setFormPrice('');
    setFormStock('');
    setFormDesc('');
    setActiveModal('product_add');
  }

  function openEditProduct(p: Product) {
    setSelectedProduct(p);
    setFormSku(p.sku);
    setFormName(p.name);
    setFormCatId(p.categoryId || '');
    setFormCost(p.costPrice);
    setFormPrice(p.salePrice);
    setFormDesc(p.description || '');
    setActiveModal('product_edit');
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (activeModal === 'product_add') {
        const res = await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify({
            sku: formSku,
            name: formName,
            categoryId: formCatId ? Number(formCatId) : null,
            costPrice: Number(formCost) || 0,
            salePrice: Number(formPrice) || 0,
            stockQuantity: Number(formStock) || 0,
            description: formDesc,
          }),
        });
        if (res.success) {
          toast('Thêm sản phẩm thành công!');
          setActiveModal(null);
          loadProducts(1, searchTerm, selectedCategory);
        }
      } else if (activeModal === 'product_edit' && selectedProduct) {
        const res = await apiRequest(`/products/${selectedProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: formName,
            categoryId: formCatId ? Number(formCatId) : null,
            costPrice: Number(formCost) || 0,
            salePrice: Number(formPrice) || 0,
            description: formDesc,
          }),
        });
        if (res.success) {
          toast('Cập nhật sản phẩm thành công!');
          setActiveModal(null);
          loadProducts(productsPagination.page, searchTerm, selectedCategory);
        }
      }
    } catch (err: any) {
      toast(err.message, true);
    }
  }

  function handleToggleProductStatus(p: Product) {
    setConfirmDialog({
      title: p.isActive ? 'Ngừng kinh doanh sản phẩm?' : 'Mở bán lại sản phẩm?',
      message: `Bạn có chắc muốn ${p.isActive ? 'ngừng bán' : 'mở bán lại'} sản phẩm "${p.name}" (${p.sku})?`,
      onConfirm: async () => {
        try {
          const res = await apiRequest(`/products/${p.id}/status`, { method: 'PATCH' });
          if (res.success) {
            toast(res.message || 'Cập nhật trạng thái thành công.');
            loadProducts(productsPagination.page, searchTerm, selectedCategory);
          }
        } catch (err: any) {
          toast(err.message, true);
        }
      },
    });
  }

  function handleDeleteProduct(p: Product) {
    setConfirmDialog({
      title: 'Xóa sản phẩm',
      message: `Bạn có chắc chắn muốn xóa sản phẩm "${p.name}"? Nếu sản phẩm đã phát sinh đơn hàng, hệ thống sẽ tự động chuyển sang ngừng kinh doanh để bảo toàn lịch sử.`,
      onConfirm: async () => {
        try {
          const res = await apiRequest(`/products/${p.id}`, { method: 'DELETE' });
          if (res.success) {
            toast(res.message || 'Đã xóa sản phẩm.');
            loadProducts(productsPagination.page, searchTerm, selectedCategory);
          }
        } catch (err: any) {
          toast(err.message, true);
        }
      },
    });
  }

  // Category handlers
  function openAddCategory() {
    setFormName('');
    setFormDesc('');
    setActiveModal('category_add');
  }

  function openEditCategory(c: Category) {
    setSelectedCategoryItem(c);
    setFormName(c.name);
    setFormDesc(c.description || '');
    setActiveModal('category_edit');
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (activeModal === 'category_add') {
        const res = await apiRequest('/categories', {
          method: 'POST',
          body: JSON.stringify({ name: formName, description: formDesc }),
        });
        if (res.success) {
          toast('Thêm danh mục thành công!');
          setActiveModal(null);
          loadCategories();
        }
      } else if (activeModal === 'category_edit' && selectedCategoryItem) {
        const res = await apiRequest(`/categories/${selectedCategoryItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: formName, description: formDesc }),
        });
        if (res.success) {
          toast('Cập nhật danh mục thành công!');
          setActiveModal(null);
          loadCategories();
        }
      }
    } catch (err: any) {
      toast(err.message, true);
    }
  }

  function handleDeleteCategory(c: Category) {
    setConfirmDialog({
      title: 'Xóa danh mục',
      message: `Bạn có chắc muốn xóa danh mục "${c.name}"? Không thể xóa danh mục đang có sản phẩm.`,
      onConfirm: async () => {
        try {
          const res = await apiRequest(`/categories/${c.id}`, { method: 'DELETE' });
          if (res.success) {
            toast('Đã xóa danh mục.');
            loadCategories();
          }
        } catch (err: any) {
          toast(err.message, true);
        }
      },
    });
  }

  // Customer handlers
  function openAddCustomer() {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setActiveModal('customer_add');
  }

  function openEditCustomer(c: Customer) {
    setSelectedCustomer(c);
    setFormName(c.fullName);
    setFormPhone(c.phone);
    setFormEmail(c.email || '');
    setFormAddress(c.address || '');
    setActiveModal('customer_edit');
  }

  async function openCustomerDetail(c: Customer) {
    try {
      const res = await apiRequest(`/customers/${c.id}`);
      if (res.success) {
        setSelectedCustomer(res.data);
        setActiveModal('customer_detail');
      }
    } catch (err: any) {
      toast(err.message, true);
    }
  }

  async function handleSaveCustomer(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (activeModal === 'customer_add') {
        const res = await apiRequest('/customers', {
          method: 'POST',
          body: JSON.stringify({
            fullName: formName,
            phone: formPhone,
            email: formEmail || null,
            address: formAddress || null,
          }),
        });
        if (res.success) {
          toast('Thêm khách hàng thành công!');
          setActiveModal(null);
          loadCustomers(1, searchTerm);
        }
      } else if (activeModal === 'customer_edit' && selectedCustomer) {
        const res = await apiRequest(`/customers/${selectedCustomer.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            fullName: formName,
            phone: formPhone,
            email: formEmail || null,
            address: formAddress || null,
          }),
        });
        if (res.success) {
          toast('Cập nhật khách hàng thành công!');
          setActiveModal(null);
          loadCustomers(customersPagination.page, searchTerm);
        }
      }
    } catch (err: any) {
      toast(err.message, true);
    }
  }

  // Order Handlers
  async function openOrderDetail(orderId: number) {
    try {
      const res = await apiRequest(`/orders/${orderId}`);
      if (res.success) {
        setSelectedOrder(res.data);
        setActiveModal('order_detail');
      }
    } catch (err: any) {
      toast(err.message, true);
    }
  }

  function handleCancelOrder(order: Order) {
    setConfirmDialog({
      title: 'Hủy đơn hàng',
      message: `Bạn có chắc muốn hủy đơn hàng ${order.orderCode}? Toàn bộ số lượng sản phẩm trong đơn sẽ được tự động hoàn trả lại vào tồn kho.`,
      onConfirm: async () => {
        try {
          const res = await apiRequest(`/orders/${order.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'CANCELLED' }),
          });
          if (res.success) {
            toast('Đã hủy đơn hàng và hoàn trả tồn kho.');
            loadOrders(ordersPagination.page, searchTerm, orderStatusFilter);
            if (activeModal === 'order_detail') setActiveModal(null);
          }
        } catch (err: any) {
          toast(err.message, true);
        }
      },
    });
  }

  // POS / Create Order cart operations
  function addToCart(p: Product) {
    if (p.stockQuantity <= 0) {
      toast(`Sản phẩm "${p.name}" đã hết hàng trong kho!`, true);
      return;
    }
    setCartItems((prev) => {
      const exist = prev.find((i) => i.product.id === p.id);
      if (exist) {
        if (exist.quantity >= p.stockQuantity) {
          toast(`Không thể thêm: Đã đạt giới hạn tồn kho (${p.stockQuantity})!`, true);
          return prev;
        }
        return prev.map((i) => (i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product: p, quantity: 1 }];
    });
  }

  function updateCartQty(prodId: number, delta: number) {
    setCartItems((prev) =>
      prev
        .map((i) => {
          if (i.product.id === prodId) {
            const nextQty = i.quantity + delta;
            if (nextQty > i.product.stockQuantity) {
              toast(`Chỉ còn ${i.product.stockQuantity} sản phẩm trong kho.`, true);
              return i;
            }
            return { ...i, quantity: nextQty };
          }
          return i;
        })
        .filter((i) => i.quantity > 0)
    );
  }

  const posSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0),
    [cartItems]
  );
  const posTotal = useMemo(() => Math.max(0, posSubtotal - (posDiscount || 0)), [posSubtotal, posDiscount]);

  async function handleCheckoutOrder(e: React.FormEvent) {
    e.preventDefault();
    if (cartItems.length === 0) {
      toast('Vui lòng chọn ít nhất 1 sản phẩm vào đơn hàng.', true);
      return;
    }

    try {
      const payload = {
        customerId: posCustomerId ? Number(posCustomerId) : null,
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.salePrice,
        })),
        discountAmount: Number(posDiscount) || 0,
        note: posNote || null,
      };

      const res = await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        toast(`Tạo đơn ${res.data.orderCode} thành công! Kho đã được cập nhật.`);
        setCartItems([]);
        setPosDiscount(0);
        setPosNote('');
        setPosCustomerId('');
        setPage('orders');
        loadOrders(1);
      }
    } catch (err: any) {
      toast(err.message, true);
    }
  }

  // Inventory movement handlers
  function openStockAction(p?: Product) {
    if (p) setSelectedProduct(p);
    else setSelectedProduct(products[0] || null);
    setFormMovementType('IN');
    setFormMovementQty(1);
    setFormMovementNote('');
    setActiveModal('stock_action');
  }

  async function handleSaveStockMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      const res = await apiRequest('/inventory/movements', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProduct.id,
          movementType: formMovementType,
          quantity: Number(formMovementQty),
          note: formMovementNote || null,
        }),
      });
      if (res.success) {
        toast('Cập nhật kho thành công!');
        setActiveModal(null);
        loadMovements(1);
        loadLowStock();
        loadProducts(productsPagination.page);
      }
    } catch (err: any) {
      toast(err.message, true);
    }
  }

  // Reports CSV Export
  async function handleExportCsv() {
    try {
      let query = '/reports/export-csv';
      const params = [];
      if (reportStartDate) params.push(`startDate=${reportStartDate}`);
      if (reportEndDate) params.push(`endDate=${reportEndDate}`);
      if (params.length > 0) query += `?${params.join('&')}`;

      const res = await apiRequest(query);
      if (res.data instanceof Blob) {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bao-cao-don-hang-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Đã tải xuống file CSV thành công!');
      }
    } catch (err: any) {
      toast(err.message, true);
    }
  }

  // User Management Handlers (ADMIN)
  function openAddUser() {
    setFormName('');
    setFormEmail('');
    setFormUserPassword('');
    setFormUserRole('STAFF');
    setActiveModal('user_add');
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify({
          fullName: formName,
          email: formEmail,
          password: formUserPassword,
          role: formUserRole,
        }),
      });
      if (res.success) {
        toast('Tạo tài khoản thành công!');
        setActiveModal(null);
        loadUsers();
      }
    } catch (err: any) {
      toast(err.message, true);
    }
  }

  function handleToggleUser(u: UserAccount) {
    setConfirmDialog({
      title: u.isActive ? 'Khóa tài khoản' : 'Kích hoạt tài khoản',
      message: `Bạn có chắc muốn ${u.isActive ? 'tạm khóa' : 'kích hoạt'} tài khoản của ${u.fullName} (${u.email})?`,
      onConfirm: async () => {
        try {
          const res = await apiRequest(`/users/${u.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ isActive: !u.isActive }),
          });
          if (res.success) {
            toast(res.message || 'Cập nhật thành công.');
            loadUsers();
          }
        } catch (err: any) {
          toast(err.message, true);
        }
      },
    });
  }

  // If authenticating initial token
  if (authLoading) {
    return (
      <div className="login-screen">
        <div style={{ textAlign: 'center' }}>
          <div className="brand-mark" style={{ margin: '0 auto 16px', width: 48, height: 48, fontSize: 28 }}>
            S
          </div>
          <p className="muted">Đang kết nối hệ thống Quản Lý Bán Hàng...</p>
        </div>
      </div>
    );
  }

  // If not logged in, render Login Screen
  if (!user) {
    return (
      <div className="login-screen">
        <article className="login-card">
          <div className="login-header">
            <span className="brand-mark" style={{ margin: '0 auto', width: 44, height: 44 }}>
              S
            </span>
            <h1>Đăng nhập Sellio</h1>
            <p className="muted">Hệ thống Quản Lý Bán Hàng & Tồn Kho</p>
          </div>

          {loginError && (
            <div className="login-error">
              <AlertTriangle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="modal-fields">
              <label>
                Địa chỉ Email
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@quanlybanhang.local"
                  required
                />
              </label>
              <label>
                Mật khẩu
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </label>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 20 }}>
              Đăng nhập hệ thống
            </button>
          </form>

          <div className="demo-accounts">
            <p>TÀI KHOẢN DÙNG THỬ (DEMO):</p>
            <div className="demo-btn-group">
              <button
                type="button"
                className="demo-btn"
                onClick={() => fillDemo('admin@quanlybanhang.local', 'Admin@123456')}
              >
                👑 Quản trị (Admin)
              </button>
              <button
                type="button"
                className="demo-btn"
                onClick={() => fillDemo('staff@quanlybanhang.local', 'Staff@123456')}
              >
                👤 Nhân viên (Staff)
              </button>
            </div>
          </div>
        </article>
        {toastMsg && (
          <div className={`toast ${toastMsg.error ? 'toast-error' : ''}`}>
            <span>{toastMsg.error ? '!' : '✓'}</span>
            {toastMsg.text}
          </div>
        )}
      </div>
    );
  }

  const pageTitle = navItems.find((n) => n.id === page)?.label || 'Tổng quan';

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <Sidebar
        user={user}
        currentPage={page}
        onNavigate={(p) => {
          setPage(p);
          setSearchTerm('');
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />

      {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Đóng menu" />}

      {/* Main Container */}
      <main className={`main-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header
          user={user}
          currentPageTitle={pageTitle}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          onQuickPos={() => setPage('pos')}
          searchTerm={page !== 'dashboard' && page !== 'reports' ? searchTerm : undefined}
          onSearchChange={page !== 'dashboard' && page !== 'reports' ? setSearchTerm : undefined}
        />

        {/* 1. DASHBOARD PAGE */}
        {page === 'dashboard' && (
          <DashboardView
            data={dashboardData}
            loading={globalLoading}
            onRefresh={loadDashboard}
            onGoToPos={() => setPage('pos')}
            onGoToOrders={() => setPage('orders')}
            onGoToProducts={() => setPage('products')}
            onViewOrderDetail={openOrderDetail}
            userName={user.fullName}
          />
        )}

        {/* 2. POS / CREATE ORDER PAGE */}
        {page === 'pos' && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">ĐIỂM BÁN HÀNG TẠI QUẦY</p>
                <h1>Tạo đơn bán hàng</h1>
                <p className="muted">Chọn sản phẩm, khách hàng, số lượng và áp dụng chiết khấu.</p>
              </div>
            </div>

            <div className="pos-grid">
              {/* Product selector list */}
              <article className="panel" style={{ padding: 18 }}>
                <div className="toolbar" style={{ marginBottom: 16 }}>
                  <label className="search-field" style={{ flex: 1 }}>
                    <Search size={16} />
                    <input
                      placeholder="Tìm theo tên hoặc mã SKU sản phẩm..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">Tất cả danh mục</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {products
                    .filter((p) => p.isActive)
                    .filter((p) =>
                      searchTerm ? (p.name + p.sku).toLowerCase().includes(searchTerm.toLowerCase()) : true
                    )
                    .filter((p) => (selectedCategory ? p.categoryId === Number(selectedCategory) : true))
                    .map((p) => (
                      <div
                        key={p.id}
                        className="panel"
                        style={{
                          padding: 12,
                          border: '1px solid #e9e9f1',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="mono" style={{ fontSize: 10, color: '#888' }}>
                              {p.sku}
                            </span>
                            <span
                              className="badge"
                              style={{
                                background: p.stockQuantity <= 10 ? '#fef3c7' : '#dcfce7',
                                color: p.stockQuantity <= 10 ? '#b45309' : '#15803d',
                              }}
                            >
                              Tồn: {p.stockQuantity}
                            </span>
                          </div>
                          <b style={{ display: 'block', fontSize: 12, margin: '8px 0 4px' }}>{p.name}</b>
                          <div className="money" style={{ color: '#7565e8', fontSize: 13 }}>
                            {money(p.salePrice)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ marginTop: 12, width: '100%' }}
                          disabled={p.stockQuantity <= 0}
                          onClick={() => addToCart(p)}
                        >
                          <Plus size={14} /> Thêm vào đơn
                        </button>
                      </div>
                    ))}
                </div>
              </article>

              {/* Order Cart & Summary */}
              <article className="panel" style={{ padding: 20 }}>
                <h2 style={{ fontSize: 15, margin: '0 0 16px' }}>Giỏ hàng & Thanh toán</h2>

                <div className="modal-fields" style={{ marginBottom: 16 }}>
                  <label>
                    Khách hàng
                    <select
                      value={posCustomerId}
                      onChange={(e) => setPosCustomerId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">Khách vãng lai (không lưu thông tin)</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} - {c.phone}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="cart-list">
                  {cartItems.length === 0 ? (
                    <Empty text="Chưa có sản phẩm nào trong giỏ hàng." />
                  ) : (
                    cartItems.map((item) => (
                      <div className="cart-item" key={item.product.id}>
                        <div className="cart-item-name">
                          <b>{item.product.name}</b>
                          <small>
                            {money(item.product.salePrice)} · Tồn kho: {item.product.stockQuantity}
                          </small>
                        </div>
                        <div className="cart-item-actions">
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => updateCartQty(item.product.id, -1)}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => updateCartQty(item.product.id, 1)}
                          >
                            +
                          </button>
                          <div className="money" style={{ minWidth: 80, textAlign: 'right' }}>
                            {money(item.product.salePrice * item.quantity)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="modal-fields" style={{ marginTop: 16 }}>
                  <label>
                    Giảm giá / Chiết khấu (VNĐ)
                    <input
                      type="number"
                      min="0"
                      value={posDiscount || ''}
                      onChange={(e) => setPosDiscount(Number(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </label>
                  <label>
                    Ghi chú đơn hàng
                    <input
                      value={posNote}
                      onChange={(e) => setPosNote(e.target.value)}
                      placeholder="Ví dụ: Giao giờ hành chính, khách nhận tại quầy..."
                    />
                  </label>
                </div>

                <div className="cart-summary-box">
                  <div className="summary-line">
                    <span>Tạm tính ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} món):</span>
                    <b>{money(posSubtotal)}</b>
                  </div>
                  <div className="summary-line">
                    <span>Chiết khấu:</span>
                    <b style={{ color: '#d94f69' }}>- {money(posDiscount)}</b>
                  </div>
                  <div className="summary-line total">
                    <span>TỔNG THANH TOÁN:</span>
                    <span className="money" style={{ color: '#7565e8', fontSize: 18 }}>
                      {money(posTotal)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 20, padding: 14 }}
                  disabled={cartItems.length === 0}
                  onClick={handleCheckoutOrder}
                >
                  Xác nhận tạo đơn & Trừ kho
                </button>
              </article>
            </div>
          </section>
        )}

        {/* 3. PRODUCTS PAGE */}
        {page === 'products' && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">QUẢN LÝ KHO HÀNG</p>
                <h1>Danh sách sản phẩm</h1>
                <p className="muted">Quản lý mã SKU, giá bán, giá vốn và trạng thái kinh doanh.</p>
              </div>
              <button className="btn btn-primary" onClick={openAddProduct}>
                <Plus size={16} /> Thêm sản phẩm
              </button>
            </div>

            <div className="toolbar">
              <label className="search-field">
                <Search size={16} />
                <input
                  placeholder="Tìm tên sản phẩm hoặc mã SKU..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    loadProducts(1, e.target.value, selectedCategory);
                  }}
                />
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  loadProducts(1, searchTerm, e.target.value);
                }}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <article className="panel">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>SẢN PHẨM</th>
                      <th>MÃ SKU</th>
                      <th>DANH MỤC</th>
                      <th>GIÁ VỐN</th>
                      <th>GIÁ BÁN</th>
                      <th>TỒN KHO</th>
                      <th>TRẠNG THÁI</th>
                      <th>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="table-product">
                            <div className="product-thumb purple">📦</div>
                            <div>
                              <b>{p.name}</b>
                              <small style={{ color: '#888', display: 'block' }}>{p.description || 'Chưa có mô tả'}</small>
                            </div>
                          </div>
                        </td>
                        <td className="mono">{p.sku}</td>
                        <td>{p.categoryName || 'Chưa phân loại'}</td>
                        <td className="money" style={{ color: '#888' }}>{money(p.costPrice)}</td>
                        <td className="money">{money(p.salePrice)}</td>
                        <td>
                          <span className={`status ${p.stockQuantity <= 10 ? 'status-warn' : 'status-done'}`}>
                            {p.stockQuantity} sản phẩm
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${p.isActive ? 'badge-in' : 'badge-out'}`}>
                            {p.isActive ? 'Đang bán' : 'Ngừng KD'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="row-action"
                              title="Nhập / Xuất kho"
                              onClick={() => openStockAction(p)}
                            >
                              <Warehouse size={15} />
                            </button>
                            <button
                              className="row-action"
                              title="Chỉnh sửa"
                              onClick={() => openEditProduct(p)}
                            >
                              <Edit size={15} />
                            </button>
                            {user.role === 'ADMIN' && (
                              <>
                                <button
                                  className="row-action"
                                  title={p.isActive ? 'Ngừng kinh doanh' : 'Mở bán lại'}
                                  onClick={() => handleToggleProductStatus(p)}
                                >
                                  <Ban size={15} />
                                </button>
                                <button
                                  className="row-action"
                                  title="Xóa sản phẩm"
                                  onClick={() => handleDeleteProduct(p)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {products.length === 0 && <Empty text="Không tìm thấy sản phẩm phù hợp." />}
              </div>

              {/* Pagination */}
              <div className="pagination">
                <span>
                  Hiển thị {products.length} trên tổng số {productsPagination.total} sản phẩm
                </span>
                <div className="page-btns">
                  <button
                    className="page-btn"
                    disabled={productsPagination.page <= 1}
                    onClick={() => loadProducts(productsPagination.page - 1, searchTerm, selectedCategory)}
                  >
                    Trang trước
                  </button>
                  <span>
                    Trang {productsPagination.page} / {productsPagination.totalPages || 1}
                  </span>
                  <button
                    className="page-btn"
                    disabled={productsPagination.page >= productsPagination.totalPages}
                    onClick={() => loadProducts(productsPagination.page + 1, searchTerm, selectedCategory)}
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            </article>
          </section>
        )}

        {/* 4. CATEGORIES PAGE */}
        {page === 'categories' && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">DANH MỤC HÀNG HÓA</p>
                <h1>Danh mục sản phẩm</h1>
                <p className="muted">Phân loại hàng hóa và số lượng sản phẩm liên kết.</p>
              </div>
              <button className="btn btn-primary" onClick={openAddCategory}>
                <Plus size={16} /> Thêm danh mục
              </button>
            </div>

            <article className="panel">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>TÊN DANH MỤC</th>
                      <th>MÔ TẢ</th>
                      <th>SỐ SẢN PHẨM</th>
                      <th>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.id}>
                        <td className="mono">#{c.id}</td>
                        <td><b>{c.name}</b></td>
                        <td>{c.description || 'Chưa có mô tả'}</td>
                        <td>
                          <span className="badge badge-staff">
                            {c.product_count || 0} sản phẩm
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="row-action" title="Chỉnh sửa" onClick={() => openEditCategory(c)}>
                              <Edit size={15} />
                            </button>
                            {user.role === 'ADMIN' && (
                              <button className="row-action" title="Xóa danh mục" onClick={() => handleDeleteCategory(c)}>
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        )}

        {/* 5. CUSTOMERS PAGE */}
        {page === 'customers' && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">QUAN HỆ KHÁCH HÀNG</p>
                <h1>Danh sách khách hàng</h1>
                <p className="muted">Theo dõi lịch sử đơn hàng và tổng chi tiêu của từng khách.</p>
              </div>
              <button className="btn btn-primary" onClick={openAddCustomer}>
                <Plus size={16} /> Thêm khách hàng
              </button>
            </div>

            <div className="toolbar">
              <label className="search-field">
                <Search size={16} />
                <input
                  placeholder="Tìm theo tên, số điện thoại hoặc email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    loadCustomers(1, e.target.value);
                  }}
                />
              </label>
            </div>

            <article className="panel">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>KHÁCH HÀNG</th>
                      <th>SỐ ĐIỆN THOẠI</th>
                      <th>EMAIL</th>
                      <th>ĐỊA CHỈ</th>
                      <th>SỐ ĐƠN MUA</th>
                      <th>TỔNG CHI TIÊU</th>
                      <th>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className="customer-cell">
                            <div className="customer-avatar">{c.fullName.charAt(0)}</div>
                            <b>{c.fullName}</b>
                          </div>
                        </td>
                        <td className="mono">{c.phone}</td>
                        <td>{c.email || '—'}</td>
                        <td>{c.address || '—'}</td>
                        <td>{c.totalOrders || 0} đơn</td>
                        <td className="money" style={{ color: '#16855f' }}>
                          {money(c.totalSpent || 0)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="row-action" title="Xem lịch sử mua" onClick={() => openCustomerDetail(c)}>
                              <Eye size={15} />
                            </button>
                            <button className="row-action" title="Sửa thông tin" onClick={() => openEditCustomer(c)}>
                              <Edit size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {customers.length === 0 && <Empty text="Không tìm thấy khách hàng nào." />}
              </div>

              {/* Pagination */}
              <div className="pagination">
                <span>
                  Hiển thị {customers.length} trên tổng số {customersPagination.total} khách hàng
                </span>
                <div className="page-btns">
                  <button
                    className="page-btn"
                    disabled={customersPagination.page <= 1}
                    onClick={() => loadCustomers(customersPagination.page - 1, searchTerm)}
                  >
                    Trang trước
                  </button>
                  <span>
                    Trang {customersPagination.page} / {customersPagination.totalPages || 1}
                  </span>
                  <button
                    className="page-btn"
                    disabled={customersPagination.page >= customersPagination.totalPages}
                    onClick={() => loadCustomers(customersPagination.page + 1, searchTerm)}
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            </article>
          </section>
        )}

        {/* 6. ORDERS PAGE */}
        {page === 'orders' && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">QUẢN LÝ GIAO DỊCH</p>
                <h1>Danh sách đơn hàng</h1>
                <p className="muted">Quản lý các giao dịch bán hàng, xem chi tiết và hủy đơn.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setPage('pos')}>
                <Plus size={16} /> Tạo đơn bán hàng
              </button>
            </div>

            <div className="toolbar">
              <label className="search-field">
                <Search size={16} />
                <input
                  placeholder="Tìm mã đơn hàng hoặc tên khách hàng..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    loadOrders(1, e.target.value, orderStatusFilter);
                  }}
                />
              </label>
              <select
                value={orderStatusFilter}
                onChange={(e) => {
                  setOrderStatusFilter(e.target.value);
                  loadOrders(1, searchTerm, e.target.value);
                }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="PENDING">Đang xử lý</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>

            <article className="panel">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>MÃ ĐƠN HÀNG</th>
                      <th>KHÁCH HÀNG</th>
                      <th>SỐ ĐIỆN THOẠI</th>
                      <th>THỜI GIAN</th>
                      <th>NGƯỜI TẠO</th>
                      <th>TẠM TÍNH</th>
                      <th>GIẢM GIÁ</th>
                      <th>TỔNG TIỀN</th>
                      <th>TRẠNG THÁI</th>
                      <th>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="mono order-id">{o.orderCode}</td>
                        <td>
                          <b>{o.customerName || 'Khách vãng lai'}</b>
                        </td>
                        <td className="mono">{o.customerPhone || '—'}</td>
                        <td>{new Date(o.createdAt).toLocaleString('vi-VN')}</td>
                        <td>{o.createdByName}</td>
                        <td className="money" style={{ color: '#888' }}>{money(o.subtotal)}</td>
                        <td className="money" style={{ color: '#d94f69' }}>
                          {o.discountAmount > 0 ? `-${money(o.discountAmount)}` : '0 ₫'}
                        </td>
                        <td className="money">{money(o.totalAmount)}</td>
                        <td>
                          <StatusBadge status={o.status} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="row-action"
                              title="Xem chi tiết"
                              onClick={() => openOrderDetail(o.id)}
                            >
                              <Eye size={15} />
                            </button>
                            {o.status !== 'CANCELLED' && (
                              <button
                                className="row-action"
                                title="Hủy đơn (hoàn kho)"
                                onClick={() => handleCancelOrder(o)}
                              >
                                <Ban size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && <Empty text="Không tìm thấy đơn hàng nào." />}
              </div>

              {/* Pagination */}
              <div className="pagination">
                <span>
                  Hiển thị {orders.length} trên tổng số {ordersPagination.total} đơn hàng
                </span>
                <div className="page-btns">
                  <button
                    className="page-btn"
                    disabled={ordersPagination.page <= 1}
                    onClick={() => loadOrders(ordersPagination.page - 1, searchTerm, orderStatusFilter)}
                  >
                    Trang trước
                  </button>
                  <span>
                    Trang {ordersPagination.page} / {ordersPagination.totalPages || 1}
                  </span>
                  <button
                    className="page-btn"
                    disabled={ordersPagination.page >= ordersPagination.totalPages}
                    onClick={() => loadOrders(ordersPagination.page + 1, searchTerm, orderStatusFilter)}
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            </article>
          </section>
        )}

        {/* 7. INVENTORY PAGE */}
        {page === 'inventory' && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">QUẢN TRỊ TỒN KHO</p>
                <h1>Biến động kho & Cảnh báo tồn</h1>
                <p className="muted">Kiểm tra lịch sử nhập, xuất, điều chỉnh và sản phẩm sắp hết hàng.</p>
              </div>
              <button className="btn btn-primary" onClick={() => openStockAction()}>
                <Plus size={16} /> Nhập / Xuất kho thủ công
              </button>
            </div>

            <div className="tabs">
              <button
                className={`tab ${inventoryTab === 'movements' ? 'active' : ''}`}
                onClick={() => setInventoryTab('movements')}
              >
                Lịch sử biến động kho ({movementsPagination.total})
              </button>
              <button
                className={`tab ${inventoryTab === 'low-stock' ? 'active' : ''}`}
                onClick={() => setInventoryTab('low-stock')}
              >
                Cảnh báo sắp hết hàng ({lowStockProducts.length})
              </button>
            </div>

            {inventoryTab === 'movements' ? (
              <article className="panel">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>THỜI GIAN</th>
                        <th>SẢN PHẨM</th>
                        <th>MÃ SKU</th>
                        <th>LOẠI BIẾN ĐỘNG</th>
                        <th>SỐ LƯỢNG</th>
                        <th>MÃ THAM CHIẾU</th>
                        <th>NGƯỜI THỰC HIỆN</th>
                        <th>GHI CHÚ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((m) => (
                        <tr key={m.id}>
                          <td>{new Date(m.createdAt).toLocaleString('vi-VN')}</td>
                          <td><b>{m.productName}</b></td>
                          <td className="mono">{m.productSku}</td>
                          <td>
                            <span
                              className={`badge ${
                                m.movementType === 'IN'
                                  ? 'badge-in'
                                  : m.movementType === 'OUT'
                                  ? 'badge-out'
                                  : 'badge-adj'
                              }`}
                            >
                              {m.movementType === 'IN'
                                ? 'Nhập kho (+)'
                                : m.movementType === 'OUT'
                                ? 'Xuất kho (-)'
                                : 'Điều chỉnh'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{m.quantity}</td>
                          <td className="mono">{m.referenceCode || '—'}</td>
                          <td>{m.userName}</td>
                          <td>{m.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {movements.length === 0 && <Empty text="Chưa có dữ liệu biến động kho." />}
                </div>

                <div className="pagination">
                  <span>
                    Hiển thị {movements.length} trên tổng số {movementsPagination.total} bản ghi
                  </span>
                  <div className="page-btns">
                    <button
                      className="page-btn"
                      disabled={movementsPagination.page <= 1}
                      onClick={() => loadMovements(movementsPagination.page - 1)}
                    >
                      Trang trước
                    </button>
                    <span>
                      Trang {movementsPagination.page} / {movementsPagination.totalPages || 1}
                    </span>
                    <button
                      className="page-btn"
                      disabled={movementsPagination.page >= movementsPagination.totalPages}
                      onClick={() => loadMovements(movementsPagination.page + 1)}
                    >
                      Trang sau
                    </button>
                  </div>
                </div>
              </article>
            ) : (
              <article className="panel">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>SẢN PHẨM</th>
                        <th>MÃ SKU</th>
                        <th>DANH MỤC</th>
                        <th>GIÁ BÁN</th>
                        <th>TỒN KHO HIỆN TẠI</th>
                        <th>GỢI Ý HÀNH ĐỘNG</th>
                        <th>THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockProducts.map((p) => (
                        <tr key={p.id}>
                          <td><b>{p.name}</b></td>
                          <td className="mono">{p.sku}</td>
                          <td>{p.categoryName || 'Chưa phân loại'}</td>
                          <td className="money">{money(p.salePrice)}</td>
                          <td>
                            <span className="status status-warn">{p.stockQuantity} sản phẩm</span>
                          </td>
                          <td>
                            <span style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <AlertTriangle size={15} /> Cần nhập thêm lô mới
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '5px 9px', fontSize: 10 }}
                              onClick={() => openStockAction(p)}
                            >
                              + Nhập thêm
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {lowStockProducts.length === 0 && (
                    <Empty text="Tất cả sản phẩm đều có tồn kho an toàn (> 10 sản phẩm)." />
                  )}
                </div>
              </article>
            )}
          </section>
        )}

        {/* 8. REPORTS PAGE */}
        {page === 'reports' && dashboardData && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">BÁO CÁO DOANH THU & XUẤT DỮ LIỆU</p>
                <h1>Báo cáo kinh doanh</h1>
                <p className="muted">Dữ liệu doanh thu thực nhận (loại trừ các đơn đã hủy) và xuất file CSV.</p>
              </div>
              <button className="btn btn-outline" onClick={handleExportCsv}>
                <Download size={15} /> Xuất file CSV (Excel UTF-8)
              </button>
            </div>

            <div className="toolbar" style={{ background: '#fff', padding: 14, borderRadius: 10, border: '1px solid #e9e9f1' }}>
              <span style={{ fontWeight: 600, fontSize: 11, color: '#444' }}>Lọc theo ngày:</span>
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
              />
              <span>đến</span>
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleExportCsv}>
                <Download size={14} /> Xuất CSV theo ngày
              </button>
            </div>

            <div className="stat-grid" style={{ marginTop: 20 }}>
              <Stat
                label="Doanh thu hoàn thành"
                value={money(dashboardData.revenue.totalRevenue)}
                icon="₫"
                tone="purple"
                note="Chỉ tính đơn Hoàn thành"
                trend="Dữ liệu chính xác"
              />
              <Stat
                label="Đơn đã hoàn tất"
                value={String(dashboardData.revenue.completedOrders)}
                icon="✓"
                tone="mint"
                note="Giao dịch thành công"
                trend=""
              />
              <Stat
                label="Đơn đã hủy"
                value={String(dashboardData.revenue.cancelledOrders)}
                icon="✕"
                tone="red"
                note="Không tính vào doanh thu"
                trend=""
              />
              <Stat
                label="Tổng số khách hàng"
                value={String(dashboardData.customers.totalCustomers)}
                icon="☺"
                tone="blue"
                note="Khách hàng thân thiết"
                trend=""
              />
            </div>

            <article className="panel" style={{ marginTop: 20 }}>
              <div className="panel-heading">
                <div>
                  <h2>Top 5 sản phẩm đóng góp doanh số cao nhất</h2>
                  <p className="muted">Số liệu tính toán từ các chi tiết đơn hàng hoàn thành</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>SẢN PHẨM</th>
                      <th>MÃ SKU</th>
                      <th>SỐ LƯỢNG ĐÃ BÁN</th>
                      <th>TỔNG DOANH SỐ</th>
                      <th>TỒN KHO HIỆN TẠI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.topSellingProducts.map((p: any) => (
                      <tr key={p.productId}>
                        <td><b>{p.productName}</b></td>
                        <td className="mono">{p.productSku}</td>
                        <td style={{ fontWeight: 700 }}>{p.totalSold} chiếc</td>
                        <td className="money" style={{ color: '#7565e8' }}>{money(p.totalRevenue)}</td>
                        <td>{p.currentStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        )}

        {/* 9. USERS PAGE (ADMIN ONLY) */}
        {page === 'users' && user.role === 'ADMIN' && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">QUẢN TRỊ TÀI KHOẢN HỆ THỐNG</p>
                <h1>Người dùng & Phân quyền</h1>
                <p className="muted">Quản lý danh sách tài khoản ADMIN và STAFF được phép thao tác trên hệ thống.</p>
              </div>
              <button className="btn btn-primary" onClick={openAddUser}>
                <Plus size={16} /> Thêm tài khoản người dùng
              </button>
            </div>

            <article className="panel">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>HỌ VÀ TÊN</th>
                      <th>EMAIL ĐĂNG NHẬP</th>
                      <th>VAI TRÒ</th>
                      <th>TRẠNG THÁI</th>
                      <th>NGÀY TẠO</th>
                      <th>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => (
                      <tr key={u.id}>
                        <td className="mono">#{u.id}</td>
                        <td>
                          <div className="customer-cell">
                            <div className="customer-avatar">{u.fullName.charAt(0)}</div>
                            <b>{u.fullName}</b>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge ${u.role === 'ADMIN' ? 'badge-admin' : 'badge-staff'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`status ${u.isActive ? 'status-done' : 'status-cancel'}`}>
                            {u.isActive ? 'Hoạt động' : 'Tạm khóa'}
                          </span>
                        </td>
                        <td>{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                        <td>
                          {user.id !== u.id && (
                            <button
                              className="btn btn-outline"
                              style={{ padding: '4px 8px', fontSize: 10 }}
                              onClick={() => handleToggleUser(u)}
                            >
                              {u.isActive ? 'Khóa' : 'Kích hoạt'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        )}
      </main>

      {/* MODALS */}
      {/* 1. Product Add/Edit Modal */}
      {(activeModal === 'product_add' || activeModal === 'product_edit') && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setActiveModal(null)}>
          <section className="modal">
            <div className="modal-head">
              <h2>{activeModal === 'product_add' ? 'Thêm sản phẩm mới' : 'Chỉnh sửa sản phẩm'}</h2>
              <button className="close-modal" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="modal-fields">
                <div className="form-row">
                  <label>
                    Mã SKU
                    <input
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value)}
                      required
                      disabled={activeModal === 'product_edit'}
                      placeholder="SP-001"
                    />
                  </label>
                  <label>
                    Danh mục
                    <select
                      value={formCatId}
                      onChange={(e) => setFormCatId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Tên sản phẩm
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="Ví dụ: Tai nghe Bluetooth chống ồn"
                  />
                </label>
                <div className="form-row">
                  <label>
                    Giá vốn (VNĐ)
                    <input
                      type="number"
                      min="0"
                      value={formCost}
                      onChange={(e) => setFormCost(Number(e.target.value))}
                      placeholder="0"
                    />
                  </label>
                  <label>
                    Giá bán (VNĐ)
                    <input
                      type="number"
                      min="0"
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      required
                      placeholder="150000"
                    />
                  </label>
                </div>
                {activeModal === 'product_add' && (
                  <label>
                    Số lượng tồn kho ban đầu
                    <input
                      type="number"
                      min="0"
                      value={formStock}
                      onChange={(e) => setFormStock(Number(e.target.value))}
                      required
                      placeholder="10"
                    />
                  </label>
                )}
                <label>
                  Mô tả sản phẩm
                  <textarea
                    rows={3}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Thông số kỹ thuật, xuất xứ..."
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setActiveModal(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {activeModal === 'product_add' ? 'Tạo sản phẩm' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* 2. Category Add/Edit Modal */}
      {(activeModal === 'category_add' || activeModal === 'category_edit') && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setActiveModal(null)}>
          <section className="modal">
            <div className="modal-head">
              <h2>{activeModal === 'category_add' ? 'Thêm danh mục mới' : 'Chỉnh sửa danh mục'}</h2>
              <button className="close-modal" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveCategory}>
              <div className="modal-fields">
                <label>
                  Tên danh mục
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="Ví dụ: Thiết bị âm thanh"
                  />
                </label>
                <label>
                  Mô tả ngắn
                  <input
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Mô tả nhóm sản phẩm..."
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setActiveModal(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Lưu danh mục
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* 3. Customer Add/Edit Modal */}
      {(activeModal === 'customer_add' || activeModal === 'customer_edit') && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setActiveModal(null)}>
          <section className="modal">
            <div className="modal-head">
              <h2>{activeModal === 'customer_add' ? 'Thêm khách hàng mới' : 'Sửa thông tin khách hàng'}</h2>
              <button className="close-modal" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveCustomer}>
              <div className="modal-fields">
                <label>
                  Họ và tên khách hàng
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="Nguyễn Văn A"
                  />
                </label>
                <div className="form-row">
                  <label>
                    Số điện thoại
                    <input
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      required
                      placeholder="0901234567"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="customer@example.com"
                    />
                  </label>
                </div>
                <label>
                  Địa chỉ liên hệ
                  <input
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Số nhà, đường, quận/huyện..."
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setActiveModal(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Lưu khách hàng
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* 4. Customer Purchase History Detail Modal */}
      {activeModal === 'customer_detail' && selectedCustomer && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setActiveModal(null)}>
          <section className="modal modal-lg">
            <div className="modal-head">
              <div>
                <h2>Hồ sơ khách hàng: {selectedCustomer.fullName}</h2>
                <p className="muted">Số điện thoại: {selectedCustomer.phone} · Email: {selectedCustomer.email || '—'}</p>
              </div>
              <button className="close-modal" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span>Tổng số đơn đã mua</span>
                <b>{selectedCustomer.totalOrders} đơn hàng</b>
              </div>
              <div className="detail-item">
                <span>Tổng chi tiêu tích lũy</span>
                <b style={{ color: '#16855f' }}>{money(selectedCustomer.totalSpent)}</b>
              </div>
            </div>

            <h3 style={{ fontSize: 13, margin: '14px 0 8px' }}>Lịch sử mua hàng gần nhất:</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>MÃ ĐƠN</th>
                    <th>THỜI GIAN</th>
                    <th>TỔNG TIỀN</th>
                    <th>TRẠNG THÁI</th>
                    <th>NGƯỜI BÁN</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedCustomer.orderHistory || []).map((oh: any) => (
                    <tr key={oh.id}>
                      <td className="mono order-id">{oh.orderCode}</td>
                      <td>{new Date(oh.createdAt).toLocaleString('vi-VN')}</td>
                      <td className="money">{money(oh.totalAmount)}</td>
                      <td>
                        <StatusBadge status={oh.status} />
                      </td>
                      <td>{oh.createdByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!selectedCustomer.orderHistory || selectedCustomer.orderHistory.length === 0) && (
                <Empty text="Khách hàng chưa phát sinh đơn hàng nào." />
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setActiveModal(null)}>
                Đóng
              </button>
            </div>
          </section>
        </div>
      )}

      {/* 5. Order Detail Modal */}
      {activeModal === 'order_detail' && selectedOrder && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setActiveModal(null)}>
          <section className="modal modal-lg">
            <div className="modal-head">
              <div>
                <h2>Chi tiết đơn hàng {selectedOrder.orderCode}</h2>
                <p className="muted">
                  Thời gian tạo: {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')} · Người tạo: {selectedOrder.createdByName}
                </p>
              </div>
              <button className="close-modal" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span>Khách hàng</span>
                <b>{selectedOrder.customerName || 'Khách vãng lai'}</b>
              </div>
              <div className="detail-item">
                <span>Số điện thoại</span>
                <b>{selectedOrder.customerPhone || '—'}</b>
              </div>
              <div className="detail-item">
                <span>Địa chỉ giao</span>
                <b>{selectedOrder.customerAddress || 'Nhận tại quầy'}</b>
              </div>
              <div className="detail-item">
                <span>Trạng thái đơn</span>
                <div><StatusBadge status={selectedOrder.status} /></div>
              </div>
            </div>

            <h3 style={{ fontSize: 13, margin: '14px 0 8px' }}>Danh sách sản phẩm mua:</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SẢN PHẨM</th>
                    <th>MÃ SKU</th>
                    <th>ĐƠN GIÁ MUA</th>
                    <th>SỐ LƯỢNG</th>
                    <th>THÀNH TIỀN</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.items || []).map((it) => (
                    <tr key={it.id}>
                      <td><b>{it.productName}</b></td>
                      <td className="mono">{it.productSku}</td>
                      <td className="money">{money(it.unitPrice)}</td>
                      <td>{it.quantity}</td>
                      <td className="money">{money(it.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cart-summary-box" style={{ marginTop: 14 }}>
              <div className="summary-line">
                <span>Tạm tính:</span>
                <b>{money(selectedOrder.subtotal)}</b>
              </div>
              <div className="summary-line">
                <span>Chiết khấu:</span>
                <b style={{ color: '#d94f69' }}>- {money(selectedOrder.discountAmount)}</b>
              </div>
              <div className="summary-line total">
                <span>TỔNG CỘNG:</span>
                <b className="money" style={{ color: '#7565e8', fontSize: 17 }}>
                  {money(selectedOrder.totalAmount)}
                </b>
              </div>
            </div>

            {selectedOrder.note && (
              <p className="form-note" style={{ marginTop: 12 }}>
                <b>Ghi chú:</b> {selectedOrder.note}
              </p>
            )}

            <div className="modal-actions">
              {selectedOrder.status !== 'CANCELLED' && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleCancelOrder(selectedOrder)}
                >
                  <Ban size={15} /> Hủy đơn & Hoàn kho
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => window.print()}
              >
                In hóa đơn
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setActiveModal(null)}>
                Đóng
              </button>
            </div>
          </section>
        </div>
      )}

      {/* 6. Manual Stock Movement Modal */}
      {activeModal === 'stock_action' && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setActiveModal(null)}>
          <section className="modal">
            <div className="modal-head">
              <h2>Nhập / Xuất / Điều chỉnh kho</h2>
              <button className="close-modal" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveStockMovement}>
              <div className="modal-fields">
                <label>
                  Sản phẩm
                  <select
                    value={selectedProduct?.id || ''}
                    onChange={(e) => {
                      const found = products.find((p) => p.id === Number(e.target.value));
                      setSelectedProduct(found || null);
                    }}
                    required
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — Hiện tồn: {p.stockQuantity}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="form-row">
                  <label>
                    Loại thao tác
                    <select
                      value={formMovementType}
                      onChange={(e: any) => setFormMovementType(e.target.value)}
                    >
                      <option value="IN">Nhập kho (+) — Nhập thêm hàng</option>
                      <option value="OUT">Xuất kho (-) — Xuất hủy / lỗi / kiểm kê</option>
                      <option value="ADJUSTMENT">Điều chỉnh — Đặt lại chính xác số lượng</option>
                    </select>
                  </label>
                  <label>
                    Số lượng
                    <input
                      type="number"
                      min="1"
                      value={formMovementQty}
                      onChange={(e) => setFormMovementQty(Number(e.target.value))}
                      required
                    />
                  </label>
                </div>

                <label>
                  Lý do / Ghi chú
                  <input
                    value={formMovementNote}
                    onChange={(e) => setFormMovementNote(e.target.value)}
                    placeholder="Ví dụ: Nhập hàng lô từ nhà phân phối, kiểm kê cuối tháng..."
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setActiveModal(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Cập nhật kho
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* 7. User Add Modal (ADMIN) */}
      {activeModal === 'user_add' && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setActiveModal(null)}>
          <section className="modal">
            <div className="modal-head">
              <h2>Thêm tài khoản người dùng</h2>
              <button className="close-modal" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-fields">
                <label>
                  Họ và tên
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="Nguyễn Văn B"
                  />
                </label>
                <label>
                  Email đăng nhập
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                    placeholder="nhanvien@quanlybanhang.local"
                  />
                </label>
                <div className="form-row">
                  <label>
                    Mật khẩu
                    <input
                      type="password"
                      value={formUserPassword}
                      onChange={(e) => setFormUserPassword(e.target.value)}
                      required
                      placeholder="Tối thiểu 6 ký tự"
                    />
                  </label>
                  <label>
                    Vai trò
                    <select
                      value={formUserRole}
                      onChange={(e: any) => setFormUserRole(e.target.value)}
                    >
                      <option value="STAFF">Nhân viên (STAFF)</option>
                      <option value="ADMIN">Quản trị viên (ADMIN)</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setActiveModal(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Reusable Confirmation Dialog */}
      {confirmDialog && (
        <div className="modal-backdrop">
          <section className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <h2>{confirmDialog.title}</h2>
              <button className="close-modal" onClick={() => setConfirmDialog(null)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: '#555', margin: '0 0 20px' }}>
              {confirmDialog.message}
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setConfirmDialog(null)}>
                Hủy bỏ
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
              >
                Xác nhận
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Toast Alert */}
      {toastMsg && (
        <div className={`toast ${toastMsg.error ? 'toast-error' : ''}`}>
          <span>{toastMsg.error ? '!' : '✓'}</span>
          {toastMsg.text}
        </div>
      )}
    </div>
  );
}

// Sub-components
function Stat({
  label,
  value,
  icon,
  tone,
  note,
  trend,
}: {
  label: string;
  value: string;
  icon: string;
  tone: string;
  note: string;
  trend: string;
}) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <strong>{value}</strong>
      <p className="stat-note">{note}</p>
      {trend && <p className="stat-trend">{trend}</p>}
    </article>
  );
}

function StatusBadge({ status }: { status: 'PENDING' | 'COMPLETED' | 'CANCELLED' }) {
  if (status === 'COMPLETED') {
    return <span className="status status-done">Hoàn thành</span>;
  }
  if (status === 'PENDING') {
    return <span className="status status-pending">Đang xử lý</span>;
  }
  return <span className="status status-cancel">Đã hủy</span>;
}

function Empty({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <ClipboardList size={28} />
      <p>{text}</p>
    </div>
  );
}
