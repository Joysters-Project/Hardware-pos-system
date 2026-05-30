import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Save, Send, Loader2, ShoppingCart, Calendar, Truck,
  Plus, Package, FileText, AlertCircle, Building2
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition } from '@/components/PageTransition';
import { LineItemRow } from '@/components/procurement/LineItemRow';
import { useSuppliers, useProducts, useCreatePurchaseOrder } from '@/services/procurementApi';
import { cn } from '@/lib/utils';

// Zod Schema for line items
const lineItemSchema = z.object({
  product_id: z.number().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  cost_price: z.number().min(0, 'Price is required'),
  total_price: z.number(),
});

// Zod Schema for the form
const purchaseOrderSchema = z.object({
  supplier_id: z.number().min(1, 'Supplier is required'),
  expected_delivery: z.date().nullable().optional(),
  notes: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one item is required'),
});

// Generate PO Number
function generatePONumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `PO-${year}-${random}`;
}

function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const [poNumber] = useState(generatePONumber());
  const [poDate] = useState(new Date());

  // Fetch suppliers and products
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const createMutation = useCreatePurchaseOrder();

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplier_id: '',
      expected_delivery: null,
      notes: '',
      items: [{ product_id: null, quantity: 1, cost_price: 0, total_price: 0 }],
    },
  });

  // Field array for line items
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'items',
  });

  // Watch items for calculations
  const watchedItems = watch('items');
  const watchedSupplier = watch('supplier_id');

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return watchedItems?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
  }, [watchedItems]);

  // Handle product selection
  const handleProductSelect = (index, productId, product) => {
    if (product) {
      update(index, {
        ...watchedItems[index],
        product_id: productId,
        cost_price: Number(product.cost_price),
        total_price: (watchedItems[index].quantity || 1) * Number(product.cost_price),
      });
    } else {
      update(index, {
        ...watchedItems[index],
        product_id: null,
        cost_price: 0,
        total_price: 0,
      });
    }
  };

  // Handle quantity change
  const handleQuantityChange = (index, quantity) => {
    const item = watchedItems[index];
    update(index, {
      ...item,
      quantity: quantity || 1,
      total_price: (quantity || 1) * (item.cost_price || 0),
    });
  };

  // Add new row
  const addNewRow = () => {
    append({ product_id: null, quantity: 1, cost_price: 0, total_price: 0 });
  };

  // Form submission
  const onSubmit = async (data, status = 'Pending') => {
    try {
      const payload = {
        supplier_id: parseInt(data.supplier_id),
        po_date: poDate.toISOString().split('T')[0],
        expected_delivery: data.expected_delivery
          ? data.expected_delivery.toISOString().split('T')[0]
          : null,
        status: status,
        total_amount: grandTotal,
        notes: data.notes || null,
        items: data.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.cost_price,
          total_price: item.total_price,
        })),
      };

      await createMutation.mutateAsync(payload);
      navigate('/procurement');
    } catch (error) {
      console.error('Error creating PO:', error);
    }
  };

  const isLoading = suppliersLoading || productsLoading;

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
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500">
                  <Skeleton className="h-6 w-48 bg-white/20" />
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
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
          className="flex items-center gap-4"
        >
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Link to="/procurement">
              <Button variant="outline" size="icon" className="shadow-md hover:shadow-lg">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Create Purchase Order
            </h1>
            <p className="mt-1 text-slate-500">Create a new purchase order for your suppliers</p>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit((data) => onSubmit(data, 'Pending'))}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* PO Details Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-0 shadow-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Purchase Order Details
                    </CardTitle>
                    <CardDescription className="text-blue-100">
                      Enter the basic information for this purchase order
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* PO Number and Date */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-slate-700 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          PO Number
                        </Label>
                        <Input
                          value={poNumber}
                          readOnly
                          className="bg-slate-50 font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          PO Date
                        </Label>
                        <Input
                          value={poDate.toLocaleDateString()}
                          readOnly
                          className="bg-slate-50"
                        />
                      </div>
                    </div>

                    {/* Supplier */}
                    <div className="space-y-2">
                      <Label className="text-slate-700 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        Supplier <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        {...register('supplier_id', { valueAsNumber: true })}
                        className={cn(
                          "border-slate-200",
                          errors.supplier_id && "border-red-500"
                        )}
                      >
                        <option value="">Select a supplier...</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.supplier_id} value={supplier.supplier_id}>
                            {supplier.supplier_name} - {supplier.contact}
                          </option>
                        ))}
                      </Select>
                      {errors.supplier_id && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.supplier_id.message}
                        </p>
                      )}
                    </div>

                    {/* Expected Delivery */}
                    <div className="space-y-2">
                      <Label className="text-slate-700 flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-500" />
                        Expected Delivery Date
                      </Label>
                      <div className="relative">
                        <DatePicker
                          selected={watch('expected_delivery')}
                          onChange={(date) => setValue('expected_delivery', date)}
                          minDate={new Date()}
                          dateFormat="MMMM d, yyyy"
                          placeholderText="Select expected delivery date"
                          className="w-full h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label className="text-slate-700">Notes</Label>
                      <Textarea
                        {...register('notes')}
                        placeholder="Add any additional notes or instructions..."
                        rows={3}
                        className="border-slate-200 focus:border-blue-500"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Line Items Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-0 shadow-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5" />
                          Line Items
                        </CardTitle>
                        <CardDescription className="text-blue-100">
                          Add products to this purchase order
                        </CardDescription>
                      </div>
                      <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                        {fields.length} item{fields.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="relative overflow-visible">
                      <table className="w-full">
                        {/* Table Header */}
                        <thead>
                          <tr className="bg-slate-50 border-b text-sm font-semibold text-slate-600">
                            <th className="py-3 px-6 text-left w-1/2">Product</th>
                            <th className="py-3 px-6 text-center w-32">Quantity</th>
                            <th className="py-3 px-6 text-right w-32">Unit Cost</th>
                            <th className="py-3 px-6 text-right w-32">Total</th>
                            <th className="py-3 px-6 text-center w-16"></th>
                          </tr>
                        </thead>

                        {/* Line Items */}
                        <tbody className="divide-y divide-slate-100">
                          <AnimatePresence>
                            {fields.map((field, index) => (
                              <LineItemRow
                                key={field.id}
                                index={index}
                                products={products}
                                field={watchedItems[index]}
                                onProductSelect={handleProductSelect}
                                onUpdateQuantity={handleQuantityChange}
                                onRemove={remove}
                                errors={errors.items?.[index]}
                              />
                            ))}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>

                    {/* Add Row Button */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addNewRow}
                        className="w-full gap-2 border-dashed border-2 hover:border-blue-400 hover:bg-blue-50"
                      >
                        <Plus className="h-4 w-4" />
                        Add New Row
                      </Button>
                      {errors.items?.message && (
                        <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.items.message}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
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
                    {/* Supplier Info */}
                    {watchedSupplier && (
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-500 mb-1">Supplier</p>
                        <p className="font-semibold text-slate-800">
                          {suppliers.find(s => s.supplier_id === parseInt(watchedSupplier))?.supplier_name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {suppliers.find(s => s.supplier_id === parseInt(watchedSupplier))?.contact}
                        </p>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Total Items</span>
                        <span className="font-semibold">{fields.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Total Quantity</span>
                        <span className="font-semibold">
                          {watchedItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                        </span>
                      </div>
                    </div>

                    {/* Grand Total */}
                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">Grand Total</span>
                        <motion.span
                          key={grandTotal}
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                          className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                        >
                          LKR{grandTotal.toFixed(2)}
                        </motion.span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-4">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="submit"
                          className="w-full gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/25"
                          disabled={isSubmitting || createMutation.isPending}
                        >
                          {isSubmitting || createMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save as Draft
                        </Button>
                      </motion.div>

                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                          disabled={isSubmitting || createMutation.isPending}
                          onClick={handleSubmit((data) => onSubmit(data, 'Approved'))}
                        >
                          {isSubmitting || createMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Approve & Send
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}

export default CreatePurchaseOrder;
