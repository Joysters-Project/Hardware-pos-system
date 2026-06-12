import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, Package, Tag, DollarSign, Boxes, Hash } from 'lucide-react';
import { productService, categoryService, brandService, unitService } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition } from '@/components/PageTransition';
import toast from 'react-hot-toast';

const formVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.08 },
  },
};

const fieldVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    product_name: '',
    unit_price: '',
    cost_price: '',
    stock_quantity: '0',
    min_stock_quantity: '0',
    reorder_level: '',
    type: '',
    batch_no: '',
    expiry_date: '',
    category_id: '',
    brand_id: '',
    unit_id: '',
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReferenceData();
    if (isEdit) {
      fetchProduct();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchReferenceData = async () => {
    try {
      const [categoriesRes, brandsRes, unitsRes] = await Promise.all([
        categoryService.getAll(),
        brandService.getAll(),
        unitService.getAll(),
      ]);
      setCategories(categoriesRes.data);
      setBrands(brandsRes.data);
      setUnits(unitsRes.data);
    } catch (err) {
      toast.error('Failed to load reference data');
      console.error(err);
    }
  };

  const fetchProduct = async () => {
    try {
      setFetching(true);
      const response = await productService.getById(id);
      const product = response.data;
      setFormData({
        product_name: product.product_name || '',
        unit_price: product.unit_price?.toString() || '',
        cost_price: product.cost_price?.toString() || '',
        stock_quantity: product.stock_quantity?.toString() || '0',
        min_stock_quantity: product.min_stock_quantity?.toString() || '0',
        reorder_level: product.reorder_level?.toString() || '',
        type: product.type || '',
        batch_no: product.batch_no || '',
        expiry_date: product.expiry_date ? String(product.expiry_date).slice(0, 10) : '',
        category_id: product.category_id?.toString() || '',
        brand_id: product.brand_id?.toString() || '',
        unit_id: product.unit_id?.toString() || '',
      });
    } catch (err) {
      setError('Failed to fetch product');
      toast.error('Failed to fetch product');
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.product_name || !formData.unit_price || !formData.cost_price || !formData.category_id || !formData.unit_id) {
      setError('Product name, unit price, cost price, category, and unit are required');
      return;
    }

    try {
      setLoading(true);
      const data = {
        product_name: formData.product_name,
        unit_price: parseFloat(formData.unit_price),
        cost_price: parseFloat(formData.cost_price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        min_stock_quantity: parseInt(formData.min_stock_quantity) || 0,
        reorder_level: parseInt(formData.reorder_level) || 0,
        type: formData.type,
        batch_no: formData.batch_no || null,
        expiry_date: formData.expiry_date || null,
        category_id: parseInt(formData.category_id),
        brand_id: formData.brand_id ? parseInt(formData.brand_id) : null,
        unit_id: parseInt(formData.unit_id),
      };

      if (isEdit) {
        await productService.update(id, data);
        toast.success('Product updated successfully');
      } else {
        await productService.create(data);
        toast.success('Product created successfully');
      }
      navigate('/products');
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to save product';
      setError(message);
      toast.error(message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <PageTransition>
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Card className="max-w-3xl border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
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
            <Link to="/products">
              <Button variant="outline" size="icon" className="shadow-md hover:shadow-lg">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              {isEdit ? 'Edit Product' : 'Add Product'}
            </h1>
            <p className="mt-1 text-slate-500">
              {isEdit ? 'Update product information' : 'Add a new product to your inventory'}
            </p>
          </div>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <motion.div
            variants={formVariants}
            initial="hidden"
            animate="visible"
            className="max-w-3xl"
          >
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Information
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Fill in the details for the product. Fields marked with * are required.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Product Name */}
                <motion.div variants={fieldVariants} className="space-y-2">
                  <Label htmlFor="product_name" className="text-slate-700">
                    <Tag className="inline h-4 w-4 mr-1" />
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="product_name"
                    name="product_name"
                    value={formData.product_name}
                    onChange={handleChange}
                    placeholder="Enter product name"
                    required
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </motion.div>

                {/* Type and Batch */}
                <motion.div variants={fieldVariants} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-slate-700">
                      <Package className="inline h-4 w-4 mr-1" />
                      Product Type
                    </Label>
                    <Input
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      placeholder="e.g., Hardware, Electronics"
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batch_no" className="text-slate-700">
                      <Hash className="inline h-4 w-4 mr-1" />
                      Batch Number
                    </Label>
                    <Input
                      id="batch_no"
                      name="batch_no"
                      value={formData.batch_no}
                      onChange={handleChange}
                      placeholder="e.g., BATCH-2024-001"
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiry_date" className="text-slate-700">
                      Expiry Date
                    </Label>
                    <Input
                      id="expiry_date"
                      name="expiry_date"
                      type="date"
                      value={formData.expiry_date}
                      onChange={handleChange}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </motion.div>

                {/* Prices */}
                <motion.div variants={fieldVariants} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cost_price" className="text-slate-700">
                      <DollarSign className="inline h-4 w-4 mr-1" />
                      Cost Price <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cost_price"
                      name="cost_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cost_price}
                      onChange={handleChange}
                      placeholder="0.00"
                      required
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit_price" className="text-slate-700">
                      <DollarSign className="inline h-4 w-4 mr-1" />
                      Unit Price <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="unit_price"
                      name="unit_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unit_price}
                      onChange={handleChange}
                      placeholder="0.00"
                      required
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </motion.div>

                {/* Category, Brand, Unit */}
                <motion.div variants={fieldVariants} className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="category_id" className="text-slate-700">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      id="category_id"
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleChange}
                      required
                      className="border-slate-200 focus:border-blue-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brand_id" className="text-slate-700">
                      Brand
                    </Label>
                    <Select
                      id="brand_id"
                      name="brand_id"
                      value={formData.brand_id}
                      onChange={handleChange}
                      className="border-slate-200 focus:border-blue-500"
                    >
                      <option value="">Select Brand</option>
                      {brands.map((brand) => (
                        <option key={brand.brand_id} value={brand.brand_id}>
                          {brand.brand_name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit_id" className="text-slate-700">
                      Unit <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      id="unit_id"
                      name="unit_id"
                      value={formData.unit_id}
                      onChange={handleChange}
                      required
                      className="border-slate-200 focus:border-blue-500"
                    >
                      <option value="">Select Unit</option>
                      {units.map((unit) => (
                        <option key={unit.unit_id} value={unit.unit_id}>
                          {unit.unit_name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </motion.div>

                {/* Stock Levels */}
                <motion.div variants={fieldVariants} className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="stock_quantity" className="text-slate-700">
                      <Boxes className="inline h-4 w-4 mr-1" />
                      Stock Quantity
                    </Label>
                    <Input
                      id="stock_quantity"
                      name="stock_quantity"
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={handleChange}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min_stock_quantity" className="text-slate-700">
                      <Boxes className="inline h-4 w-4 mr-1" />
                      Min Stock Quantity
                    </Label>
                    <Input
                      id="min_stock_quantity"
                      name="min_stock_quantity"
                      type="number"
                      min="0"
                      value={formData.min_stock_quantity}
                      onChange={handleChange}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reorder_level" className="text-slate-700">
                      <Boxes className="inline h-4 w-4 mr-1" />
                      Reorder Level
                    </Label>
                    <Input
                      id="reorder_level"
                      name="reorder_level"
                      type="number"
                      min="0"
                      value={formData.reorder_level}
                      onChange={handleChange}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </motion.div>

                {/* Actions */}
                <motion.div
                  variants={fieldVariants}
                  className="flex gap-4 pt-6 border-t border-slate-200"
                >
                  <Link to="/products" className="flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full hover:bg-slate-100"
                    >
                      Cancel
                    </Button>
                  </Link>
                  <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      className="w-full gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/25"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isEdit ? 'Update Product' : 'Add Product'}
                    </Button>
                  </motion.div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </form>
      </div>
    </PageTransition>
  );
}

export default ProductForm;
