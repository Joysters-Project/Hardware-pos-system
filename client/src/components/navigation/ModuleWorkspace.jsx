import React from 'react';
import '../../styles/ProcurementWorkspace.css';

export default function ModuleWorkspace({ nav: TopNav, children }) {
  return (
    <div className="procurement-workspace">
      {TopNav && <TopNav />}
      <div className="procurement-workspace-content" style={{ padding: '24px' }}>
        {children}
      </div>
    </div>
  );
}
