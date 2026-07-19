import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { useSupplier, useCreateSupplier, useUpdateSupplier } from '../../services/procurementApi';
import '../../styles/Procurement.css';

const EMPTY = {
supplier_name: '', contact_person: '', phone: '', email: '',
address: '', company_reg: '', tax_id: '',
payment_terms: 'Select Payment Terms', credit_limit: '', status: 'Active',
};

const fieldVariants = {
hidden: { opacity: 0, y: 14 },
visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3 } }),
};

export default function SupplierForm() {
const navigate = useNavigate();
const { id } = useParams();
const isEdit = Boolean(id);
const [form, setForm] = useState(EMPTY);
const [error, setError] = useState('');

const { data: supplier, isLoading: fetching } = useSupplier(isEdit ? id : null);
const createMutation = useCreateSupplier();
const updateMutation = useUpdateSupplier();
const saving = createMutation.isPending || updateMutation.isPending;

useEffect(() => {
if (supplier) {
setForm({
supplier_name: supplier.supplier_name || '',
contact_person: supplier.contact_person || supplier.contact || '',
phone: supplier.phone || '',
email: supplier.email || '',
address: supplier.address || '',
company_reg: supplier.company_reg || '',
tax_id: supplier.tax_id || '',
payment_terms: supplier.payment_terms || 'Select Payment Terms',
credit_limit: supplier.credit_limit || '',
status: supplier.status || 'Active',
});
}
}, [supplier]);

const set = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

const handleSubmit = async (e) => {
e.preventDefault();
setError('');
if (form.payment_terms === 'Select Payment Terms') {
  setError('Please select payment terms');
  return;
}
const payload = { ...form, credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : null };
try {
if (isEdit) await updateMutation.mutateAsync({ id, data: payload });
else await createMutation.mutateAsync(payload);
navigate('/procurement/suppliers');
} catch (err) {
setError(err.response?.data?.error || 'Failed to save supplier');
}
};

if (fetching) return (
<div className="proc-container">
<div className="proc-loading-wrap">
{[...Array(6)].map((_, i) => (
<motion.div key={i} className="proc-skeleton"
animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }} />
))}
</div>
</div>
);

const FIELDS = [
{ label: 'Supplier Name', name: 'supplier_name', placeholder: 'Enter supplier name', required: true, full: true },
{ label: 'Contact Person', name: 'contact_person', placeholder: 'Contact person name' },
{ label: 'Phone', name: 'phone', placeholder: '+94 71 234 5678' },
{ label: 'Email', name: 'email', type: 'email', placeholder: 'supplier@example.com' },
{ label: 'Status', name: 'status', type: 'select', options: ['Active','Inactive'] },
{ label: 'Address', name: 'address', type: 'textarea', placeholder: 'Full address', full: true },
{ label: 'Company Registration No.', name: 'company_reg', placeholder: 'e.g. PV00012345' },
{ label: 'Tax ID / VAT No.', name: 'tax_id', placeholder: 'e.g. 123456789V' },
{
  label: 'Payment Terms',
  name: 'payment_terms',
  type: 'select',
  options: [
    'Select Payment Terms',
    'Advance Payment (Pay at Order)',
    'Payment on Delivery',
    'Payment After Sale (Consignment)',
    'Flexible Payment Agreement'
  ]
},{ label: 'Credit Limit (LKR)', name: 'credit_limit', type: 'number', placeholder: '0.00' },
];

return (
<div className="proc-container">

{/* Header */}
<motion.div className="proc-header"
initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
<motion.button className="proc-back-btn" onClick={() => navigate('/procurement/suppliers')}
whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
<ArrowLeft size={16} />
</motion.button>
<div>
<h1>{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h1>
<p>{isEdit ? 'Update supplier information' : 'Add a new supplier to your directory'}</p>
</div>
</div>
</motion.div>

<motion.div className="proc-form-card"
initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
<div className="proc-form-card-header">
<h2>Supplier Information</h2>
<p>Fields marked with * are required</p>
</div>

{error && (
<motion.div className="proc-error-banner" style={{ margin: '1rem 1.5rem 0' }}
initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
{error}
</motion.div>
)}

<form onSubmit={handleSubmit} className="proc-form">
<div className="proc-form-grid">
{FIELDS.map((f, i) => (
<motion.div key={f.name}
className={`proc-field ${f.full ? 'proc-field-full' : ''}`}
custom={i} variants={fieldVariants} initial="hidden" animate="visible">
<label>{f.label}{f.required && <span className="req"> *</span>}</label>
{f.type === 'select' ? (
<select name={f.name} value={form[f.name]} onChange={set} className="proc-input">
{f.options.map((o, index) => (
  <option
    key={o}
    value={o}
    disabled={index === 0}
  >
    {o}
  </option>
))}
</select>
) : f.type === 'textarea' ? (
<textarea name={f.name} value={form[f.name]} onChange={set}
placeholder={f.placeholder} rows={3} className="proc-input proc-textarea" />
) : (
<input name={f.name} type={f.type || 'text'} value={form[f.name]} onChange={set}
placeholder={f.placeholder} required={f.required} className="proc-input"
min={f.type === 'number' ? '0' : undefined} />
)}
</motion.div>
))}
</div>

<motion.div className="proc-form-footer"
initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
<motion.button type="button" className="proc-btn-outline"
whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
onClick={() => navigate('/procurement/suppliers')}>
Cancel
</motion.button>
<motion.button type="submit" className="proc-btn-primary" disabled={saving}
whileHover={{ scale: saving ? 1 : 1.03 }} whileTap={{ scale: saving ? 1 : 0.97 }}>
<Save size={15} />
{saving ? 'Saving...' : isEdit ? 'Update Supplier' : 'Add Supplier'}
</motion.button>
</motion.div>
</form>
</motion.div>
</div>
);
}
