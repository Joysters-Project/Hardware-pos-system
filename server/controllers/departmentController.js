const { departments } = require('../models');

// CREATE Department
exports.createDepartment = async (req, res) => {
  try {
    const department = await departments.create(req.body);
    res.status(201).json({
      message: "Department created successfully",
      data: department
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ All Departments
exports.getAllDepartments = async (req, res) => {
  try {
    const departmentList = await departments.findAll();
    res.status(200).json(departmentList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ Department by ID
exports.getDepartmentById = async (req, res) => {
  try {
    const department = await departments.findByPk(req.params.id);

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.status(200).json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE Department
exports.updateDepartment = async (req, res) => {
  try {
    const department = await departments.findByPk(req.params.id);

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    await department.update(req.body);

    res.status(200).json({
      message: "Department updated successfully",
      data: departments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE Department
exports.deleteDepartment = async (req, res) => {
  try {
    const department = await departments.findByPk(req.params.id);

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    await department.destroy();

    res.status(200).json({
      message: "Department deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};