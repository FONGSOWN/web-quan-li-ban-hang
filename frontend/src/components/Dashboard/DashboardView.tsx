import React from 'react';
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Award,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { DashboardData, TrendItem, RecentOrderItem, TopProductItem } from '../../types';

interface DashboardProps {
  data: DashboardData | null;
  loading: boolean;
  onRefresh: () => void;
  onGoToPos: () => void;
  onGoToOrders: () => void;
  onGoToProducts: () => void;
  onViewOrderDetail: (orderId: number) => void;
  userName: string;
}

export const DashboardView: React.FC<DashboardProps> = ({
  data,
  loading,
  onRefresh,
  onGoToPos,
  onGoToOrders,
  onGoToProducts,
  onViewOrderDetail,
  userName,
}) => {
  const money = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);

  if (loading && !data) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 12px' }} />
          <p>Đang tải dữ liệu tổng quan kinh doanh...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-container">
        <div className="empty-box">
          <p>Không có dữ liệu kinh doanh hoặc chưa kết nối được máy chủ.</p>
          <button type="button" className="btn btn-outline" onClick={onRefresh} style={{ marginTop: 12 }}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // Chuẩn bị dữ liệu cho biểu đồ tròn trạng thái đơn
  const orderStatusData = [
    { name: 'Hoàn thành', value: data.revenue.completedOrders, color: '#10b981' },
    { name: 'Đang xử lý', value: data.revenue.pendingOrders, color: '#f59e0b' },
    { name: 'Đã hủy', value: data.revenue.cancelledOrders, color: '#ef4444' },
  ].filter((item) => item.value > 0);

  // Format trend data cho Recharts
  const formattedTrend = (data.trend || []).map((t: TrendItem) => ({
    date: t.date ? t.date.slice(5) : '',
    revenue: t.revenue,
    orders: t.orders,
  }));

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Chào {userName} 👋</h1>
          <p className="page-subtitle">
            Hệ thống quản lý bán hàng & dữ liệu giao dịch thời gian thực từ MySQL
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={onGoToPos}>
            <Plus size={16} />
            <span>Tạo đơn bán hàng</span>
          </button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="stats-grid-4">
        {/* Doanh thu */}
        <div className="stat-card-modern">
          <div className="stat-card-header">
            <span className="stat-card-title">Doanh thu thực nhận</span>
            <div className="stat-icon-pill indigo">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="stat-value">{money(data.revenue.totalRevenue)}</div>
          <div className="stat-footer">
            <span className="stat-trend-tag positive">
              <TrendingUp size={14} /> Hoàn tất
            </span>
            <span>{data.revenue.completedOrders} đơn hàng</span>
          </div>
        </div>

        {/* Tổng đơn hàng */}
        <div className="stat-card-modern">
          <div className="stat-card-header">
            <span className="stat-card-title">Tổng đơn hàng</span>
            <div className="stat-icon-pill emerald">
              <ShoppingCart size={20} />
            </div>
          </div>
          <div className="stat-value">{data.revenue.totalOrders}</div>
          <div className="stat-footer">
            <span>{data.revenue.pendingOrders} đang xử lý</span>
            <span style={{ color: '#ef4444' }}>{data.revenue.cancelledOrders} đã hủy</span>
          </div>
        </div>

        {/* Mặt hàng đang bán */}
        <div className="stat-card-modern">
          <div className="stat-card-header">
            <span className="stat-card-title">Sản phẩm đang bán</span>
            <div className="stat-icon-pill amber">
              <Package size={20} />
            </div>
          </div>
          <div className="stat-value">{data.inventory.totalProducts}</div>
          <div className="stat-footer">
            <span>Khách hàng: {data.customers.totalCustomers}</span>
            <span style={{ color: '#6366f1' }}>Đang hoạt động</span>
          </div>
        </div>

        {/* Cảnh báo tồn kho */}
        <div className="stat-card-modern">
          <div className="stat-card-header">
            <span className="stat-card-title">Cảnh báo tồn kho thấp</span>
            <div className="stat-icon-pill rose">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ color: data.inventory.lowStockCount > 0 ? '#e11d48' : '#0f172a' }}>
            {data.inventory.lowStockCount}
          </div>
          <div className="stat-footer">
            <span>Mức an toàn ≤ 10 sản phẩm</span>
            {data.inventory.lowStockCount > 0 ? (
              <span className="stat-trend-tag negative">Cần nhập kho</span>
            ) : (
              <span className="stat-trend-tag positive">Kho ổn định</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="dashboard-grid-2">
        {/* Biểu đồ doanh thu Recharts */}
        <div className="card-panel">
          <div className="card-panel-header">
            <div>
              <h3 className="card-panel-title">Xu hướng doanh thu (7 ngày gần nhất)</h3>
              <p className="card-panel-desc">Biểu đồ tổng hợp doanh thu thực tế từ đơn hoàn thành</p>
            </div>
            <span className="badge-pill primary">
              <TrendingUp size={13} /> Thời gian thực
            </span>
          </div>
          <div className="card-panel-body" style={{ height: 300, padding: '16px 8px 10px 0' }}>
            {formattedTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedTrend} margin={{ top: 10, right: 25, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => [money(Number(value)), 'Doanh thu']}
                    labelFormatter={(label) => `Ngày: ${label}`}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: 8,
                      border: 'none',
                      color: '#fff',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-box">
                <p>Chưa có dữ liệu giao dịch 7 ngày qua.</p>
              </div>
            )}
          </div>
        </div>

        {/* Tỉ lệ trạng thái đơn hàng */}
        <div className="card-panel">
          <div className="card-panel-header">
            <div>
              <h3 className="card-panel-title">Cơ cấu đơn hàng</h3>
              <p className="card-panel-desc">Phân bố trạng thái giao dịch</p>
            </div>
          </div>
          <div className="card-panel-body" style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {orderStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value} đơn`, name]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: 8,
                      border: 'none',
                      color: '#fff',
                      fontSize: 12,
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-box">
                <p>Chưa có dữ liệu đơn hàng.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top sản phẩm & Đơn hàng gần đây */}
      <div className="dashboard-grid-2">
        {/* Đơn hàng gần đây */}
        <div className="card-panel">
          <div className="card-panel-header">
            <div>
              <h3 className="card-panel-title">Đơn hàng mới nhất</h3>
              <p className="card-panel-desc">5 giao dịch bán hàng vừa hoàn tất hoặc đang xử lý</p>
            </div>
            <button type="button" className="btn btn-outline" onClick={onGoToOrders} style={{ padding: '6px 12px', fontSize: 12 }}>
              Xem tất cả ↗
            </button>
          </div>
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o: RecentOrderItem) => (
                  <tr key={o.id}>
                    <td className="font-mono" style={{ color: '#4f46e5', fontWeight: 600 }}>
                      {o.orderCode}
                    </td>
                    <td>{o.customerName || 'Khách vãng lai'}</td>
                    <td className="price-text">{money(o.totalAmount)}</td>
                    <td>
                      {o.status === 'COMPLETED' && (
                        <span className="badge-pill success">
                          <CheckCircle2 size={12} /> Hoàn thành
                        </span>
                      )}
                      {o.status === 'PENDING' && (
                        <span className="badge-pill warning">
                          <Clock size={12} /> Đang xử lý
                        </span>
                      )}
                      {o.status === 'CANCELLED' && (
                        <span className="badge-pill danger">
                          <XCircle size={12} /> Đã hủy
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '4px 8px' }}
                        onClick={() => onViewOrderDetail(o.id)}
                        title="Xem chi tiết đơn"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {data.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                      Chưa có giao dịch đơn hàng nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 5 sản phẩm bán chạy */}
        <div className="card-panel">
          <div className="card-panel-header">
            <div>
              <h3 className="card-panel-title">Top sản phẩm bán chạy</h3>
              <p className="card-panel-desc">Theo số lượng bán ra thực tế</p>
            </div>
            <button type="button" className="btn btn-outline" onClick={onGoToProducts} style={{ padding: '6px 12px', fontSize: 12 }}>
              Kho hàng ↗
            </button>
          </div>
          <div className="card-panel-body" style={{ padding: '12px 18px' }}>
            {data.topSellingProducts.map((p: TopProductItem, index: number) => (
              <div
                key={p.productId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: index < data.topSellingProducts.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: index === 0 ? '#fef3c7' : '#f1f5f9',
                      color: index === 0 ? '#b45309' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {index === 0 ? <Award size={16} /> : index + 1}
                  </div>
                  <div>
                    <strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>{p.productName}</strong>
                    <span className="font-mono" style={{ fontSize: 11, color: '#94a3b8' }}>
                      {p.productSku} · Đã bán: {p.totalSold}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="price-text" style={{ fontSize: 13, display: 'block' }}>
                    {money(p.totalRevenue)}
                  </span>
                  <span style={{ fontSize: 11, color: p.currentStock <= 10 ? '#ef4444' : '#64748b' }}>
                    Tồn: {p.currentStock}
                  </span>
                </div>
              </div>
            ))}
            {data.topSellingProducts.length === 0 && (
              <div className="empty-box" style={{ padding: '24px 0' }}>
                <p>Chưa có sản phẩm nào phát sinh doanh số.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

