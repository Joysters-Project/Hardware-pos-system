import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Package, AlertTriangle, XCircle, Search } from 'lucide-react';
import { productService, categoryService, brandService, unitService } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition, staggerContainer, staggerItem } from '@/components/PageTransition';
import toast from 'react-hot-toast';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes, brandsRes, unitsRes] = await Promise.all([
        productService.getAll(),
        categoryService.getAll(),
        brandService.getAll(),
        unitService.getAll(),
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
      setBrands(brandsRes.data);
      setUnits(unitsRes.data);
    } catch (err) {
      toast.error('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (id) => {
    const category = categories.find((c) => c.category_id === id);
    return category ? category.category_name : '-';
  };

  const getBrandName = (id) => {
    const brand = brands.find((b) => b.brand_id === id);
    return brand ? brand.brand_name : '-';
  };

  const getUnitName = (id) => {
    const unit = units.find((u) => u.unit_id === id);
    return unit ? unit.unit_name : '-';
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete product "${name}"?`)) {
      try {
        await productService.delete(id);
        toast.success('Product deleted successfully');
        fetchData();
      } catch (err) {
        toast.error('Failed to delete product');
        console.error(err);
      }
    }
  };

  const getStockStatus = (quantity, minQuantity) => {
    if (quantity <= 0) return { label: 'Out of Stock', variant: 'destructive', icon: XCircle };
    if (quantity <= minQuantity) return { label: 'Low Stock', variant: 'warning', icon: AlertTriangle };
    return { label: 'In Stock', variant: 'success', icon: Package };
  };

  const filteredProducts = products.filter(
    (product) =>
      product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.type && product.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.batch_no && product.batch_no.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalValue = products.reduce((acc, p) => acc + Number(p.unit_price) * p.stock_quantity, 0);
  const lowStockCount = products.filter((p) => p.stock_quantity <= p.min_stock_quantity && p.stock_quantity > 0).length;
  const outOfStockCount = products.filter((p) => p.stock_quantity <= 0).length;

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
              Products
            </h1>
            <p className="mt-1 text-slate-500">Manage your product inventory and stock levels</p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link to="/products/add">
              <Button className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/25">
                <Plus className="h-4 w-4" />
                Add Product
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
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Products</p>
                    <p className="text-2xl font-bold text-slate-800">{products.length}</p>
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
                    <p className="text-sm text-slate-500">Total Value</p>
                    <p className="text-2xl font-bold text-slate-800">${totalValue.toFixed(2)}</p>
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
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Low Stock</p>
                    <p className="text-2xl font-bold text-slate-800">{lowStockCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-rose-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-red-100 p-3">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Out of Stock</p>
                    <p className="text-2xl font-bold text-slate-800">{outOfStockCount}</p>
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
                    <Package className="h-5 w-5 text-blue-500" />
                    Product Inventory
                  </CardTitle>
                  <CardDescription>
                    {filteredProducts.length} of {products.length} product{products.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search products..."
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
                      <Skeleton className="h-10 w-32" />
                      <Skeleton className="h-10 w-24" />
                      <Skeleton className="h-10 w-20" />
                      <Skeleton className="h-10 w-20" />
                      <Skeleton className="h-10 w-24" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
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
                    <Package className="h-12 w-12 text-blue-500" />
                  </motion.div>
                  <h3 className="text-xl font-semibold text-slate-800">No products yet</h3>
                  <p className="text-slate-500 mb-6 mt-1">Get started by adding your first product.</p>
                  <Link to="/products/add">
                    <Button variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Product
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Brand</TableHead>
                      <TableHead className="font-semibold">Unit</TableHead>
                      <TableHead className="font-semibold">Cost Price</TableHead>
                      <TableHead className="font-semibold">Unit Price</TableHead>
                      <TableHead className="font-semibold">Stock</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product, index) => {
                      const stockStatus = getStockStatus(product.stock_quantity, product.min_stock_quantity);
                      return (
                        <motion.tr
                          key={product.product_id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="group border-b hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200"
                        >
                          <TableCell className="font-medium text-slate-800">
                            {product.product_name}
                          </TableCell>
                          <TableCell className="text-slate-600">{getCategoryName(product.category_id)}</TableCell>
                          <TableCell className="text-slate-600">{getBrandName(product.brand_id)}</TableCell>
                          <TableCell className="text-slate-600">{getUnitName(product.unit_id)}</TableCell>
                          <TableCell className="font-mono text-slate-600">
                            ${Number(product.cost_price).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono font-medium text-slate-800">
                            ${Number(product.unit_price).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono">{product.stock_quantity}</TableCell>
                          <TableCell>
                            <Badge variant={stockStatus.variant} className="gap-1 shadow-sm">
                              <stockStatus.icon className="h-3 w-3" />
                              {stockStatus.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link to={`/products/edit/${product.product_id}`}>
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
                                onClick={() => handleDelete(product.product_id, product.product_name)}
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
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

export default ProductList;
