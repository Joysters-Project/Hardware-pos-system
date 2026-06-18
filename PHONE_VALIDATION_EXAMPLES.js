/**
 * Example implementations of Sri Lankan Phone Number Validation
 * This file demonstrates how to integrate phone validation in different components
 */

// ============================================================================
// Example 1: React Form Component (Client-side)
// ============================================================================

import { useState } from 'react';
import { validateSriLankanPhone } from '../utils/phoneValidation';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function CustomerForm() {
  const [form, setForm] = useState({ name: '', phone_no: '', email: '' });
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneBlur = () => {
    if (!form.phone_no) return; // Optional field
    
    const validation = validateSriLankanPhone(form.phone_no);
    if (!validation.isValid) {
      setPhoneError(validation.message);
    } else {
      setPhoneError('');
      setForm({ ...form, phone_no: validation.formatted });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!form.name) {
      toast.error('Customer name is required');
      return;
    }

    // Validate phone if provided
    if (form.phone_no) {
      const validation = validateSriLankanPhone(form.phone_no);
      if (!validation.isValid) {
        setPhoneError(validation.message);
        toast.error(validation.message);
        return;
      }
      form.phone_no = validation.formatted;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!response.ok) throw new Error('Failed to create customer');
      
      toast.success('Customer created successfully');
      setForm({ name: '', phone_no: '', email: '' });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Customer Name *</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div>
        <label>Phone (Sri Lanka)</label>
        <input
          type="text"
          placeholder="e.g., 071 234 5678"
          value={form.phone_no}
          onChange={(e) => {
            setForm({ ...form, phone_no: e.target.value });
            if (phoneError) setPhoneError('');
          }}
          onBlur={handlePhoneBlur}
          style={phoneError ? { borderColor: 'red', borderWidth: '2px' } : {}}
        />
        {phoneError && (
          <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
            <AlertCircle size={14} style={{ display: 'inline', marginRight: '4px' }} />
            {phoneError}
          </div>
        )}
      </div>

      <div>
        <label>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Customer'}
      </button>
    </form>
  );
}

export default CustomerForm;

// ============================================================================
// Example 2: Supplier Validation (Server-side Controller)
// ============================================================================

const { validateSriLankanPhone } = require('../utils/phoneValidation');

exports.createSupplier = async (req, res) => {
  try {
    const { name, phone_no, email, address } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        success: false,
        message: 'Supplier name is required' 
      });
    }

    // Validate phone if provided
    let validatedPhone = phone_no || null;
    if (phone_no) {
      const phoneValidation = validateSriLankanPhone(phone_no);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ 
          success: false,
          message: `Invalid phone number: ${phoneValidation.message}` 
        });
      }
      validatedPhone = phoneValidation.formatted;
    }

    // Create supplier with validated phone
    const supplier = await Supplier.create({
      name,
      phone_no: validatedPhone,
      email,
      address
    });

    return res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================================================
// Example 3: Phone Search/Filter
// ============================================================================

import { normalizeSriLankanPhone } from '../utils/phoneValidation';

function searchEmployeesByPhone(employees, phoneInput) {
  if (!phoneInput) return employees;

  const normalized = normalizeSriLankanPhone(phoneInput);
  
  return employees.filter(emp =>
    emp.phone_no && emp.phone_no.replace(/\s/g, '') === normalized
  );
}

// ============================================================================
// Example 4: Bulk Phone Validation
// ============================================================================

import { validateSriLankanPhone } from '../utils/phoneValidation';

function validatePhoneList(phoneNumbers) {
  return phoneNumbers.map(phone => ({
    original: phone,
    ...validateSriLankanPhone(phone)
  }));
}

// Usage:
const results = validatePhoneList([
  '0712345678',
  '011 234 5678',
  '07123456',      // Invalid - too short
  '+94712345678'
]);

// Results:
// [
//   { original: '0712345678', isValid: true, formatted: '071 234 5678', type: 'mobile', message: 'Valid mobile number' },
//   { original: '011 234 5678', isValid: true, formatted: '011 234 5678', type: 'landline', message: 'Valid landline number' },
//   { original: '07123456', isValid: false, message: 'Invalid format...', formatted: '' },
//   { original: '+94712345678', isValid: true, formatted: '071 234 5678', type: 'mobile', message: 'Valid mobile number' }
// ]

// ============================================================================
// Example 5: API Request with Phone Validation
// ============================================================================

import api from '../utils/axios';
import { validateSriLankanPhone } from '../utils/phoneValidation';

async function updateEmployee(employeeId, formData) {
  try {
    // Validate phone before sending
    if (formData.phone_no) {
      const validation = validateSriLankanPhone(formData.phone_no);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }
      formData.phone_no = validation.formatted;
    }

    const response = await api.put(`/employees/${employeeId}`, formData);
    return response.data;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// Example 6: Export Data with Formatted Phones
// ============================================================================

function exportEmployeesToCSV(employees) {
  const headers = ['ID', 'Name', 'Position', 'Phone', 'Email'];
  const rows = employees.map(emp => [
    emp.employee_id,
    `${emp.first_name} ${emp.last_name}`,
    emp.position,
    emp.phone_no || '-',  // Already formatted from database
    emp.email
  ]);

  // Generate CSV content
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csv;
}

// ============================================================================
// Example 7: Form Validation with Real-time Feedback
// ============================================================================

import { useState } from 'react';
import { validateSriLankanPhone } from '../utils/phoneValidation';

function PhoneInput({ value, onChange, error, setError }) {
  return (
    <div className="phone-input-wrapper">
      <label>Phone Number (Sri Lanka)</label>
      <input
        type="tel"
        placeholder="071 234 5678"
        value={value}
        onChange={(e) => {
          const newValue = e.target.value;
          onChange(newValue);
          
          // Real-time validation feedback
          if (newValue) {
            const validation = validateSriLankanPhone(newValue);
            setError(validation.isValid ? '' : validation.message);
          } else {
            setError('');
          }
        }}
        className={error ? 'input-error' : ''}
      />
      {error && <span className="error-message">{error}</span>}
      {value && !error && (
        <span className="success-message">✓ Valid phone number</span>
      )}
    </div>
  );
}

// Usage:
function SignupForm() {
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  return (
    <form>
      <PhoneInput
        value={phone}
        onChange={setPhone}
        error={phoneError}
        setError={setPhoneError}
      />
    </form>
  );
}

// ============================================================================
// Example 8: Phone Validation in API Response
// ============================================================================

export async function fetchAndFormatEmployees(departmentId) {
  try {
    const response = await fetch(`/api/employees?department_id=${departmentId}`);
    const employees = await response.json();

    // Ensure all phones are formatted
    return employees.map(emp => ({
      ...emp,
      phone_no: emp.phone_no || 'N/A'
      // Phone should already be formatted from server
    }));
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
}

// ============================================================================
// Example 9: TypeScript Interface (if using TypeScript)
// ============================================================================

/*
interface PhoneValidationResult {
  isValid: boolean;
  message: string;
  formatted: string;
  type?: 'mobile' | 'landline';
}

interface Employee {
  employee_id: number;
  first_name: string;
  last_name: string;
  phone_no?: string;  // Already formatted
  email?: string;
  position?: string;
  salary?: number;
  department_id?: number;
}

function validateEmployeePhone(phone: string): PhoneValidationResult {
  return validateSriLankanPhone(phone);
}
*/
