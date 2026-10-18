import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Warehouse,
  ChartNoAxesCombined,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Store,
} from 'lucide-react';
import { AuthUser } from '../../types';

interface SidebarProps {
  user: AuthUser;
  currentPage: string;
  onNavigate: (page: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  currentPage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onLogout,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'pos', label: 'Bán hàng (POS)', icon: ShoppingCart },
    { id: 'orders', label: 'Đơn hàng', icon: Package },
    { id: 'products', label: 'Sản phẩm', icon: Boxes },
    { id: 'categories', label: 'Danh mục', icon: Boxes },
    { id: 'customers', label: 'Khách hàng', icon: Users },
    { id: 'inventory', label: 'Quản lý kho', icon: Warehouse },
    { id: 'reports', label: 'Báo cáo', icon: ChartNoAxesCombined },
  ];

  if (user.role === 'ADMIN') {
    navItems.push({ id: 'users', label: 'Tài khoản', icon: ShieldCheck });
  }

  const handleNavClick = (pageId: string) => {
    onNavigate(pageId);
    onCloseMobile();
  };

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-wrapper" onClick={() => handleNavClick('dashboard')}>
            <div className="brand-badge">
              <Store size={20} />
            </div>
            {!collapsed && (
              <div className="brand-info">
                <span className="brand-title">Sellio<span>.</span></span>
                <span className="brand-subtitle">Quản Lý Bán Hàng</span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={onToggleCollapse}
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {!collapsed && <div className="nav-section-title">Hệ thống</div>}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
                title={item.label}
              >
                <Icon size={19} />
                <span className="nav-text">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-snippet">
            <div className="user-avatar">{user.fullName.charAt(0).toUpperCase()}</div>
            {!collapsed && (
              <div className="user-info-text">
                <span className="user-name">{user.fullName}</span>
                <span className="user-role-badge">
                  {user.role === 'ADMIN' ? '👑 Quản trị viên' : '👤 Nhân viên'}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="logout-icon-btn"
            onClick={onLogout}
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
};

