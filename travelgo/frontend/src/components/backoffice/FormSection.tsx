import React from 'react';

export interface FormSectionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  columns?: 1 | 2;
  actions?: React.ReactNode;
  id?: string;
}

/** Card nhóm trường. columns=2: lưới 2 cột từ 1024, dưới đó 1 cột. */
export const FormSection: React.FC<FormSectionProps> = ({ title, description, children, columns = 1, actions, id }) => (
  <section className="hgbo-fs" id={id} aria-labelledby={id ? `${id}-title` : undefined}>
    <div className="hgbo-section-head">
      <div>
        <h2 className="hgbo-fs__title" id={id ? `${id}-title` : undefined}>{title}</h2>
        {description && <p className="hgbo-fs__desc">{description}</p>}
      </div>
      {actions}
    </div>
    <div className={`hgbo-fs__body ${columns === 2 ? 'hgbo-fs__body--2' : ''}`.trim()}>
      {children}
    </div>
  </section>
);
