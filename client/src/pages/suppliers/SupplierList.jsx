import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Building2, Search, Filter } from 'lucide-react';
import { supplierService } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition, staggerContainer, staggerItem } from '@/components/PageTransition';
import toast from 'react-hot-toast';

function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await supplierService.getAll();
      setSuppliers(response.data);
    } catch (err) {
      toast.error('Failed to fetch suppliers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete supplier "${name}"?`)) {
      try {
        await supplierService.delete(id);
        toast.success('Supplier deleted successfully');
        fetchSuppliers();
      } catch (err) {
        toast.error('Failed to delete supplier');
        console.error(err);
      }
    }
  };

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.supplier_code && supplier.supplier_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
              Suppliers
            </h1>
            <p className="mt-1 text-slate-500">Manage your supplier directory and relationships</p>
          </div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link to="/suppliers/add">
              <Button className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/25">
                <Plus className="h-4 w-4" />
                Add Supplier
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
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Suppliers</p>
                    <p className="text-2xl font-bold text-slate-800">{suppliers.length}</p>
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
                    <Building2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Active</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {suppliers.filter((s) => s.status === 'Active').length}
                    </p>
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
                    <Building2 className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Inactive</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {suppliers.filter((s) => s.status === 'Inactive').length}
                    </p>
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
                    <Building2 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Avg Rating</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {suppliers.filter((s) => s.performance_rating).length > 0
                        ? (
                            suppliers
                              .filter((s) => s.performance_rating)
                              .reduce((acc, s) => acc + s.performance_rating, 0) /
                            suppliers.filter((s) => s.performance_rating).length
                          ).toFixed(1)
                        : 'N/A'}
                    </p>
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
                    <Building2 className="h-5 w-5 text-blue-500" />
                    Supplier Directory
                  </CardTitle>
                  <CardDescription>
                    {filteredSuppliers.length} of {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search suppliers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64 bg-white border-slate-200"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-20" />
                      <Skeleton className="h-10 w-40" />
                      <Skeleton className="h-10 w-32" />
                      <Skeleton className="h-10 w-24" />
                      <Skeleton className="h-10 w-20" />
                    </div>
                  ))}
                </div>
              ) : filteredSuppliers.length === 0 ? (
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
                    <Building2 className="h-12 w-12 text-blue-500" />
                  </motion.div>
                  <h3 className="text-xl font-semibold text-slate-800">No suppliers yet</h3>
                  <p className="text-slate-500 mb-6 mt-1">Get started by adding your first supplier.</p>
                  <Link to="/suppliers/add">
                    <Button variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Supplier
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="font-semibold">Code</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Contact</TableHead>
                      <TableHead className="font-semibold">Payment Terms</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Rating</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier, index) => (
                      <motion.tr
                        key={supplier.supplier_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="group border-b hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200"
                      >
                        <TableCell className="font-mono text-sm text-slate-600">
                          {supplier.supplier_code || '-'}
                        </TableCell>
                        <TableCell className="font-medium text-slate-800">
                          {supplier.supplier_name}
                        </TableCell>
                        <TableCell className="text-slate-600">{supplier.contact}</TableCell>
                        <TableCell className="text-slate-600">{supplier.payment_terms || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={supplier.status === 'Active' ? 'success' : 'secondary'}
                            className="shadow-sm"
                          >
                            {supplier.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {supplier.performance_rating ? (
                            <div className="flex items-center gap-1">
                              <span className="text-amber-400">★</span>
                              <span className="font-medium">{supplier.performance_rating}</span>
                              <span className="text-slate-400">/5</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link to={`/suppliers/edit/${supplier.supplier_id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-red-600 hover:bg-red-50 hover:border-red-200"
                              onClick={() => handleDelete(supplier.supplier_id, supplier.supplier_name)}
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

export default SupplierList;
