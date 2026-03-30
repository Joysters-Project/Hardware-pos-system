import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, Building2, User, MapPin, CreditCard, Star } from 'lucide-react';
import { supplierService } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTransition } from '@/components/PageTransition';
import toast from 'react-hot-toast';

const formVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.1 },
  },
};

const fieldVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

function SupplierForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    supplier_code: '',
    supplier_name: '',
    contact: '',
    address: '',
    payment_terms: '',
    status: 'Active',
    performance_rating: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEdit) {
      fetchSupplier();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchSupplier = async () => {
    try {
      setFetching(true);
      const response = await supplierService.getById(id);
      const supplier = response.data;
      setFormData({
        supplier_code: supplier.supplier_code || '',
        supplier_name: supplier.supplier_name || '',
        contact: supplier.contact || '',
        address: supplier.address || '',
        payment_terms: supplier.payment_terms || '',
        status: supplier.status || 'Active',
        performance_rating: supplier.performance_rating?.toString() || '',
      });
    } catch (err) {
      setError('Failed to fetch supplier');
      toast.error('Failed to fetch supplier');
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

    if (!formData.supplier_name || !formData.contact) {
      setError('Supplier name and contact are required');
      return;
    }

    try {
      setLoading(true);
      const data = {
        ...formData,
        performance_rating: formData.performance_rating ? parseInt(formData.performance_rating) : null,
      };

      if (isEdit) {
        await supplierService.update(id, data);
        toast.success('Supplier updated successfully');
      } else {
        await supplierService.create(data);
        toast.success('Supplier created successfully');
      }
      navigate('/suppliers');
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to save supplier';
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
          <Card className="max-w-2xl border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {[...Array(6)].map((_, i) => (
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
            <Link to="/suppliers">
              <Button variant="outline" size="icon" className="shadow-md hover:shadow-lg">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              {isEdit ? 'Edit Supplier' : 'Add Supplier'}
            </h1>
            <p className="mt-1 text-slate-500">
              {isEdit ? 'Update supplier information' : 'Add a new supplier to your directory'}
            </p>
          </div>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <motion.div
            variants={formVariants}
            initial="hidden"
            animate="visible"
            className="max-w-2xl"
          >
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Supplier Information
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Fill in the details for the supplier. Fields marked with * are required.
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

                <motion.div variants={fieldVariants} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="supplier_code" className="text-slate-700">
                      Supplier Code
                    </Label>
                    <Input
                      id="supplier_code"
                      name="supplier_code"
                      value={formData.supplier_code}
                      onChange={handleChange}
                      placeholder="e.g., SUP-001"
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-slate-700">
                      Status
                    </Label>
                    <Select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="border-slate-200 focus:border-blue-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </Select>
                  </div>
                </motion.div>

                <motion.div variants={fieldVariants} className="space-y-2">
                  <Label htmlFor="supplier_name" className="text-slate-700">
                    <User className="inline h-4 w-4 mr-1" />
                    Supplier Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="supplier_name"
                    name="supplier_name"
                    value={formData.supplier_name}
                    onChange={handleChange}
                    placeholder="Enter supplier name"
                    required
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </motion.div>

                <motion.div variants={fieldVariants} className="space-y-2">
                  <Label htmlFor="contact" className="text-slate-700">
                    <User className="inline h-4 w-4 mr-1" />
                    Contact <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contact"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    placeholder="Phone number or email"
                    required
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </motion.div>

                <motion.div variants={fieldVariants} className="space-y-2">
                  <Label htmlFor="address" className="text-slate-700">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Address
                  </Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter full address"
                    rows={3}
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </motion.div>

                <motion.div variants={fieldVariants} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="payment_terms" className="text-slate-700">
                      <CreditCard className="inline h-4 w-4 mr-1" />
                      Payment Terms
                    </Label>
                    <Input
                      id="payment_terms"
                      name="payment_terms"
                      value={formData.payment_terms}
                      onChange={handleChange}
                      placeholder="e.g., Net 30, Net 60"
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="performance_rating" className="text-slate-700">
                      <Star className="inline h-4 w-4 mr-1" />
                      Performance Rating
                    </Label>
                    <Select
                      id="performance_rating"
                      name="performance_rating"
                      value={formData.performance_rating}
                      onChange={handleChange}
                      className="border-slate-200 focus:border-blue-500"
                    >
                      <option value="">Not Rated</option>
                      <option value="1">1 - Poor</option>
                      <option value="2">2 - Fair</option>
                      <option value="3">3 - Average</option>
                      <option value="4">4 - Good</option>
                      <option value="5">5 - Excellent</option>
                    </Select>
                  </div>
                </motion.div>

                <motion.div
                  variants={fieldVariants}
                  className="flex gap-4 pt-6 border-t border-slate-200"
                >
                  <Link to="/suppliers" className="flex-1">
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
                      {isEdit ? 'Update Supplier' : 'Add Supplier'}
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

export default SupplierForm;
