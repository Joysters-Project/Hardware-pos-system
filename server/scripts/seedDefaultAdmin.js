const bcrypt = require('bcrypt');
const db = require('../models');

async function ensureDepartment() {
  const departmentName = process.env.DEFAULT_DEPARTMENT_NAME || 'Administration';

  let department = await db.departments.findOne({ where: { department_name: departmentName } });
  if (!department) {
    department = await db.departments.create({ department_name: departmentName, budget: 0 });
  }

  return department;
}

async function ensureEmployee(roleLabel, username) {
  const department = await ensureDepartment();
  const email = `${username}@mathumithan.local`;
  const nic = `${roleLabel.toUpperCase()}0001`;
  const phoneMap = {
    Admin: '0771111111',
    Manager: '0772222222',
    Cashier: '0773333333',
  };
  const phoneNo = phoneMap[roleLabel] || '0779999999';

  let employee = await db.employees.findOne({ where: { email } });
  if (!employee) {
    employee = await db.employees.create({
      first_name: roleLabel,
      last_name: 'User',
      nic,
      phone_no: phoneNo,
      email,
      address: `Default ${roleLabel} account`,
      position: roleLabel,
      salary: 0,
      join_date: new Date(),
      hire_date: new Date(),
      status: 'Active',
      department_id: department.department_id,
    });
  }

  return employee;
}

async function ensureDefaultUser(roleLabel, username, password) {
  const existing = await db.users.findOne({ where: { user_name: username } });
  if (existing) {
    return existing;
  }

  const employee = await ensureEmployee(roleLabel, username);
  const hashedPassword = await bcrypt.hash(password, 10);

  return db.users.create({
    user_name: username,
    first_name: roleLabel,
    last_name: 'User',
    password: hashedPassword,
    role: roleLabel,
    status: 'Active',
    employee_id: employee.employee_id,
    failed_attempts: 0,
    is_locked: false,
    lock_time: null,
  });
}

async function seedDefaultAdmin() {
  try {
    const admin = await ensureDefaultUser('Admin', process.env.DEFAULT_ADMIN_USERNAME || 'admin', process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123');
    const manager = await ensureDefaultUser('Manager', process.env.DEFAULT_MANAGER_USERNAME || 'manager', process.env.DEFAULT_MANAGER_PASSWORD || 'Manager@123');
    const cashier = await ensureDefaultUser('Cashier', process.env.DEFAULT_CASHIER_USERNAME || 'cashier', process.env.DEFAULT_CASHIER_PASSWORD || 'Cashier@123');

    console.log('🔐 Default accounts are ready:');
    console.log(`   Admin   -> ${admin.user_name} / Admin@123`);
    console.log(`   Manager -> ${manager.user_name} / Manager@123`);
    console.log(`   Cashier -> ${cashier.user_name} / Cashier@123`);
  } catch (error) {
    console.error('⚠️ Default account seed failed:', error.message);
  }
}

module.exports = seedDefaultAdmin;
