import React from 'react';
import { BoTabItem, BoTabs } from './BoTabs';

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  /** Các nút bên phải (tối đa 2 nút + BoMenu "⋯" trên mobile). */
  actions?: React.ReactNode;
  /** Vd. "Nguồn: cơ sở dữ liệu · cập nhật 10:32" */
  meta?: React.ReactNode;
  tabs?: BoTabItem[];
  tabValue?: string;
  onTabChange?: (key: string) => void;
  tabsLabel?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, eyebrow, actions, meta, tabs, tabValue, onTabChange, tabsLabel }) => (
  <header className="hgbo-ph">
    <div className="hgbo-ph__row">
      <div className="hgbo-ph__titles">
        {eyebrow && <p className="hgbo-ph__eyebrow">{eyebrow}</p>}
        <h1 className="hgbo-ph__title">{title}</h1>
        {subtitle && <p className="hgbo-ph__subtitle">{subtitle}</p>}
        {meta && <p className="hgbo-ph__meta">{meta}</p>}
      </div>
      {actions && <div className="hgbo-ph__actions">{actions}</div>}
    </div>
    {tabs && tabs.length > 0 && (
      <BoTabs
        items={tabs}
        value={tabValue ?? tabs[0].key}
        onChange={onTabChange}
        label={tabsLabel}
      />
    )}
  </header>
);
