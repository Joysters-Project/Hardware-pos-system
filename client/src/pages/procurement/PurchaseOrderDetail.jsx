import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, FileText, Calendar, Truck, Building2, Package,
  CheckCircle, Send, XCircle, Edit, Printer, Download, Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { PageTransition } from '@/components/PageTransition';
import { StatusBadge } from '@/components/procurement/StatusBadge';
import { StatusStepper } from '@/components/procurement/StatusStepper';
import { usePurchaseOrder, useUpdatePurchaseOrder, useCancelPurchaseOrder, useExportPurchaseOrderPDF, useSuppliers } from '@/services/procurementApi';
import toast from 'react-hot-toast';

function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  const { data: po, isLoading, error } = usePurchaseOrder(id);
  const { data: suppliers = [] } = useSuppliers();
  const updateMutation = useUpdatePurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();
  const exportPDFMutation = useExportPurchaseOrderPDF();

  // Dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelNotes, setCancelNotes] = useState('');

  // Get supplier name
  const supplier = suppliers.find(s => s.supplier_id === po?.supplier_id);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
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

  const handleStatusUpdate = async (newStatus) => {
    try {
      await updateMutation.mutateAsync({
        id: parseInt(id),
        data: { status: newStatus },
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Check if PO is overdue
  const isOverdue = () => {
    if (!po?.expected_delivery || po.status === 'Received' || po.status === 'Cancelled') {
      return false;
    }
    return new Date(po.expected_delivery) < new Date();
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageTransition>
    );
  }

  if (error || !po) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-16">
          <XCircle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-800">Purchase Order Not Found</h2>
          <p className="text-slate-500 mb-6">The requested purchase order could not be found.</p>
          <Link to="/procurement">
            <Button>Back to Purchase Orders</Button>
          </Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Link to="/procurement">
                <Button variant="outline" size="icon" className="shadow-md hover:shadow-lg">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                  {po.po_number}
                </h1>
                <StatusBadge status={po.status} />
                {isOverdue() && (
                  <Badge variant="destructive" className="gap-1">
                    <Truck className="h-3 w-3" />
                    Overdue
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-slate-500">Purchase Order Details</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => exportPDFMutation.mutate(id)}
              disabled={exportPDFMutation.isPending}
            >
              {exportPDFMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export PDF
            </Button>
          </div>
        </motion.div>

        {/* Status Stepper */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <StatusStepper currentStatus={po.status} />
              
              {/* Action Buttons */}
              {po.status !== 'Received' && po.status !== 'Cancelled' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8 pt-6 border-t border-slate-200"
                >
                  <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-semibold text-slate-800">Order Actions</h3>
                    <div className="flex flex-wrap gap-3">
                      {po.status === 'Pending' || po.status === 'Open' ? (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={() => handleStatusUpdate('Approved')}
                            className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25"
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Approve Order
                          </Button>
                        </motion.div>
                      ) : null}

                      {po.status === 'Approved' && (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={() => handleStatusUpdate('Shipped')}
                            className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/25"
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Truck className="h-4 w-4" />
                            )}
                            Mark as Shipped
                          </Button>
                        </motion.div>
                      )}

                      {po.status === 'Shipped' && (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={() => handleStatusUpdate('Received')}
                            className="gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25"
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Package className="h-4 w-4" />
                            )}
                            Mark as Received
                          </Button>
                        </motion.div>
                      )}

                      {/* Cancel Order Button */}
                      {po.status !== 'Cancelled' && po.status !== 'Received' && (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            variant="outline"
                            onClick={() => setShowCancelDialog(true)}
                            className="gap-2 text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 shadow-md"
                            disabled={cancelMutation.isPending}
                          >
                            <XCircle className="h-4 w-4" />
                            Cancel Order
                          </Button>
                        </motion.div>
                      )}

                      {/* Export PDF Button */}
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          variant="outline"
                          onClick={() => exportPDFMutation.mutate(id)}
                          className="gap-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-md"
                          disabled={exportPDFMutation.isPending}
                        >
                          {exportPDFMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Export PDF
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* PO Details Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Order Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PO Number
                      </p>
                      <p className="font-mono font-semibold text-slate-800">{po.po_number}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        PO Date
                      </p>
                      <p className="font-semibold text-slate-800">{formatDate(po.po_date)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Expected Delivery
                      </p>
                      <p className={`font-semibold ${isOverdue() ? 'text-red-600' : 'text-slate-800'}`}>
                        {formatDate(po.expected_delivery)}
                        {isOverdue() && <span className="ml-2 text-xs">(Overdue)</span>}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Supplier
                      </p>
                      <p className="font-semibold text-slate-800">
                        {supplier?.supplier_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-slate-500">{supplier?.contact}</p>
                    </div>
                  </div>
                  
                  {po.notes && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <p className="text-sm text-slate-500 mb-2">Notes</p>
                      <p className="text-slate-700">{po.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Line Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Line Items
                    </CardTitle>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                      {po.items?.length || 0} item{(po.items?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {po.items && po.items.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50">
                          <TableHead className="font-semibold">#</TableHead>
                          <TableHead className="font-semibold">Product</TableHead>
                          <TableHead className="font-semibold text-center">Quantity</TableHead>
                          <TableHead className="font-semibold text-right">Unit Price</TableHead>
                          <TableHead className="font-semibold text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {po.items.map((item, index) => (
                          <tr key={item.id || index} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="py-3">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-3">
                              <p className="font-medium text-slate-800">Product #{item.product_id}</p>
                            </td>
                            <td className="py-3 text-center font-mono">{item.quantity}</td>
                            <td className="py-3 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                            <td className="py-3 text-right font-mono font-semibold">{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      No items found for this order.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="sticky top-8"
            >
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Supplier Card */}
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-blue-100 p-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Supplier</p>
                        <p className="font-semibold text-slate-800">{supplier?.supplier_name || 'Unknown'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total Items</span>
                      <span className="font-semibold">{po.items?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total Quantity</span>
                      <span className="font-semibold">
                        {po.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                      </span>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">Grand Total</span>
                      <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {formatCurrency(po.total_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Order Timeline</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <div>
                          <p className="text-sm font-medium">Created</p>
                          <p className="text-xs text-slate-500">{formatDate(po.po_date)}</p>
                        </div>
                      </div>
                      {po.expected_delivery && (
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isOverdue() ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                          <div>
                            <p className="text-sm font-medium">Expected Delivery</p>
                            <p className="text-xs text-slate-500">{formatDate(po.expected_delivery)}</p>
                          </div>
                        </div>
                      )}
                      {po.actual_delivery_date && (
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <div>
                            <p className="text-sm font-medium">Delivered</p>
                            <p className="text-xs text-slate-500">{formatDate(po.actual_delivery_date)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Cancel Order Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Cancel Purchase Order
              </CardTitle>
              <CardDescription>
                Are you sure you want to cancel purchase order {po.po_number}? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cancellation Reason (Optional)</label>
                <Textarea
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  placeholder="Enter reason for cancellation..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCancelDialog(false);
                    setCancelNotes('');
                  }}
                  className="flex-1"
                >
                  Keep Order
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await cancelMutation.mutateAsync({
                      id: parseInt(id),
                      notes: cancelNotes.trim() || undefined
                    });
                    setShowCancelDialog(false);
                    setCancelNotes('');
                  }}
                  disabled={cancelMutation.isPending}
                  className="flex-1"
                >
                  {cancelMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Cancel Order
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageTransition>
  );
}

export default PurchaseOrderDetail;
