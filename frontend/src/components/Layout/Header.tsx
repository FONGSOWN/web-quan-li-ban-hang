import React from 'react';
import { Menu, Plus, Search } from 'lucide-react';
import { AuthUser } from '../../types';

interface HeaderProps {
  user: AuthUser;
  currentPageTitle: string;
  onOpenMobileSidebar: () => void;
  onQuickPos: () => void;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentPageTitle,
  onOpenMobileSidebar,
  onQuickPos,
  searchTerm,
  onSearchChange,
}) => {
  return (
    <header className="header-topbar">
      <div className="header-left">
        <button
          type="button"
          className="mobile-toggle-btn"
          onClick={onOpenMobileSidebar}
          aria-label="Mở menu"
        >
          <Menu size={22} />
        </button>

        <div className="page-breadcrumb">
          <span>Sellio</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{currentPageTitle}</span>
        </div>
      </div>

      <div className="header-right">
        {onSearchChange !== undefined && (
          <div className="search-input-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm nhanh..."
              value={searchTerm || ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        <button type="button" className="btn btn-primary" onClick={onQuickPos}>
          <Plus size={16} />
          <span>Tạo đơn bán nhanh</span>
        </button>

        <div
          className="user-avatar"
          style={{ width: 34, height: 34, fontSize: 13, cursor: 'default' }}
          title={`${user.fullName} (${user.email})`}
        >
          {user.fullName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
};

