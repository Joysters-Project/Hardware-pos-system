const { employees } = require('../models');

// CREATE Employee
exports.createEmployee = async (req, res) => {
  try {
    const employee = await employees.create(req.body);

    res.status(201).json({
      message: "Employee created successfully",
      data: employee
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET All Employees
exports.getAllEmployees = async (req, res) => {
  try {
    const employeeList = await employees.findAll();

    res.status(200).json(employeeList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET Employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await employees.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Employee
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await employees.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    await employee.update(req.body);

    res.status(200).json({
      message: "Employee updated successfully",
      data: employee
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Employee
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await employees.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    await employee.destroy();

    res.status(200).json({
      message: "Employee deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};