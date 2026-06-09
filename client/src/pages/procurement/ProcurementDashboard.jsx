import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { useProcurementDashboard } from '../../services/procurementApi';
import '../../styles/Procurement.css';

const STATUS_COLORS = { Pending:'#e65100', Approved:'#1565c0', Shipped:'#7b1fa2', Received:'#1d7e42', Cancelled:'#c62828' };

function ProcurementDashboard() {
  const { data, isLoading, refetch } = useProcurementDashboard();
  const { cards = {}, statusChart = [], monthlyVolume = [], topSuppliers = [] } = data || {};

  return (
    <div className="proc-container">
      <div className="proc-header">
        <div>
          <h1>Procurement Dashboard</h1>
          <p>Overview of suppliers, purchase orders and spending</p>
        </div>
        <div className="proc-header-actions">
          <button className="proc-btn-outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="proc-stats proc-stats-5">
        {[
          { label: 'Total Suppliers',  value: cards.totalSuppliers,  color: '#8b3a3a' },
          { label: 'Active Suppliers', value: cards.activeSuppliers, color: '#1d7e42' },
          { label: 'Pending Orders',   value: cards.pendingOrders,   color: '#e65100' },
          { label: 'Received Orders',  value: cards.receivedOrders,  color: '#1565c0' },
          { label: 'Overdue Orders',   value: cards.overdueOrders,   color: '#c62828' },
        ].map(({ label, value, color }) => (
          <div className="proc-stat-card" key={label}>
            <div className="proc-stat-value" style={{ color }}>{isLoading ? '—' : (value ?? 0)}</div>
            <div className="proc-stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="proc-charts-row">
        {/* PO Status Pie */}
        <div className="proc-card proc-chart-card">
          <div className="proc-card-header"><h2>PO Status Distribution</h2></div>
          <div className="proc-card-body">
            {statusChart.length === 0 ? (
              <div className="proc-empty" style={{ height: 220 }}>No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusChart.map(entry => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="proc-card proc-chart-card">
          <div className="proc-card-header"><h2>Top Suppliers by Spend</h2></div>
          <div className="proc-card-body">
            {topSuppliers.length === 0 ? (
              <div className="proc-empty" style={{ height: 220 }}>No received orders yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topSuppliers} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => `LKR${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="supplier_name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => [`LKR ${Number(v).toFixed(2)}`, 'Spend']} />
                  <Bar dataKey="total_spend" fill="#8b3a3a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Volume */}
      <div className="proc-card">
        <div className="proc-card-header"><h2>Monthly Purchase Volume</h2></div>
        <div className="proc-card-body">
          {monthlyVolume.length === 0 ? (
            <div className="proc-empty" style={{ height: 220 }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyVolume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left"  tickFormatter={v => `LKR${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, name) => name === 'total' ? [`LKR ${Number(v).toFixed(2)}`, 'Value'] : [v, 'Orders']} />
                <Legend />
                <Bar yAxisId="left"  dataKey="total" name="Purchase Value" fill="#8b3a3a" radius={[4,4,0,0]} />
                <Bar yAxisId="right" dataKey="count" name="Orders"         fill="#a84545" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProcurementDashboard;
