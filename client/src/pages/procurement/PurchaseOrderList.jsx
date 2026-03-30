import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Search, Filter, Eye, Pencil, Trash2, ShoppingCart,
  Clock, CheckCircle, Truck, Package, AlertTriangle, DollarSign
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition, staggerContainer, staggerItem } from '@/components/PageTransition';
import { StatusBadge } from '@/components/procurement/StatusBadge';
import { usePurchaseOrders, useDeletePurchaseOrder } from '@/services/procurementApi';
import toast from 'react-hot-toast';

function PurchaseOrderList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: purchaseOrders = [], isLoading } = usePurchaseOrders();
  const deleteMutation = useDeletePurchaseOrder();

  // Filter and sort POs
  const filteredPOs = useMemo(() => {
    return purchaseOrders
      .filter((po) => {
        const matchesSearch =
          po.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          po.status?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.po_date) - new Date(a.po_date));
  }, [purchaseOrders, searchTerm, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: purchaseOrders.length,
    pending: purchaseOrders.filter((po) => po.status === 'Pending' || po.status === 'Open').length,
    approved: purchaseOrders.filter((po) => po.status === 'Approved').length,
    shipped: purchaseOrders.filter((po) => po.status === 'Shipped').length,
    received: purchaseOrders.filter((po) => po.status === 'Received').length,
    totalValue: purchaseOrders.reduce((sum, po) => sum + Number(po.total_amount || 0), 0),
  }), [purchaseOrders]);

  const handleDelete = async (id, poNumber) => {
    if (window.confirm(`Are you sure you want to delete ${poNumber}?`)) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting PO:', error);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Purchase Orders
            </h1>
            <p className="mt-1 text-slate-500">Manage and track your purchase orders</p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link to="/procurement/create">
              <Button className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/25">
                <Plus className="h-4 w-4" />
                Create PO
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <motion.div variants={staggerItem}>
            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-blue-100 p-3">
                    <ShoppingCart className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Orders</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-orange-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-amber-100 p-3">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Pending</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-green-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-emerald-100 p-3">
                    <Package className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Received</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.received}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-violet-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-purple-100 p-3">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Value</p>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalValue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Main Table Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <ShoppingCart className="h-5 w-5 text-blue-500" />
                    Purchase Orders
                  </CardTitle>
                  <CardDescription>
                    {filteredPOs.length} of {purchaseOrders.length} orders
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Received">Received</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full sm:w-64 bg-white border-slate-200"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-32" />
                      <Skeleton className="h-10 w-24" />
                      <Skeleton className="h-10 w-24" />
                      <Skeleton className="h-10 w-28" />
                      <Skeleton className="h-10 w-20" />
                    </div>
                  ))}
                </div>
              ) : filteredPOs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                    className="rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 p-6 mb-4"
                  >
                    <ShoppingCart className="h-12 w-12 text-blue-500" />
                  </motion.div>
                  <h3 className="text-xl font-semibold text-slate-800">No purchase orders yet</h3>
                  <p className="text-slate-500 mb-6 mt-1">Create your first purchase order to get started.</p>
                  <Link to="/procurement/create">
                    <Button variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Purchase Order
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="font-semibold">PO Number</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Expected Delivery</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Total Amount</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPOs.map((po, index) => (
                      <motion.tr
                        key={po.po_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="group border-b hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200"
                      >
                        <TableCell className="font-mono font-medium text-blue-600">
                          <Link to={`/procurement/${po.po_id}`} className="hover:underline">
                            {po.po_number || '-'}
                          </Link>
                        </TableCell>
                        <TableCell className="text-slate-600">{formatDate(po.po_date)}</TableCell>
                        <TableCell className="text-slate-600">{formatDate(po.expected_delivery)}</TableCell>
                        <TableCell>
                          <StatusBadge status={po.status} />
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-slate-800">
                          {formatCurrency(po.total_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link to={`/procurement/${po.po_id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-red-600 hover:bg-red-50 hover:border-red-200"
                              onClick={() => handleDelete(po.po_id, po.po_number)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  );
}

export default PurchaseOrderList;
