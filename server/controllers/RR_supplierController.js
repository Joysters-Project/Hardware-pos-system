const { suppliers, purchase_orders } = require('../models');
const { fn, col } = require('sequelize');

// CREATE Supplier
exports.createSupplier = async (req, res) => {
    try {
        const maxSupplier = await suppliers.max('supplier_id') || 0;
        const nextId = maxSupplier + 1;
        const supplierCode = 'SUP-' + String(nextId).padStart(3, '0');

        const newSupplierData = {
            ...req.body,
            supplier_code: supplierCode,
            status: req.body.status || 'Active'
        };

        const supplier = await suppliers.create(newSupplierData);

        res.status(201).json({
            message: "Supplier created successfully",
            data: supplier
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET All Suppliers (With PO count)
exports.getAllSuppliers = async (req, res) => {
    try {
        const supplierList = await suppliers.findAll({
            order: [['supplier_name', 'ASC']],
            attributes: {
                include: [
                    [fn('COUNT', col('purchase_orders.po_id')), 'po_count']
                ]
            },
            include: [{
                model: purchase_orders,
                attributes: []
            }],
            group: ['suppliers.supplier_id']
        });

        res.status(200).json(supplierList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET Supplier By ID (With PO History)
exports.getSupplierById = async (req, res) => {
    try {
        const supplier = await suppliers.findByPk(req.params.id, {
            include: [purchase_orders]
        });

        if (!supplier) {
            return res.status(404).json({ message: "Supplier not found" });
        }

        res.status(200).json(supplier);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// UPDATE Supplier
exports.updateSupplier = async (req, res) => {
    try {
        const supplier = await suppliers.findByPk(req.params.id);

        if (!supplier) {
            return res.status(404).json({ message: "Supplier not found" });
        }

        // Protect status and rating, they use dedicated routes
        const { status, performance_rating, ...updateFields } = req.body;
        await supplier.update(updateFields);

        res.status(200).json({
            message: "Supplier updated successfully",
            data: supplier
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// UPDATE Supplier Status (PATCH /:id/status)
exports.updateSupplierStatus = async (req, res) => {
    try {
        const supplier = await suppliers.findByPk(req.params.id);

        if (!supplier) {
            return res.status(404).json({ message: "Supplier not found" });
        }

        const { status } = req.body;

        if (status === 'Inactive') {
            const openPoCount = await purchase_orders.count({
                where: { supplier_id: req.params.id, status: 'Open' }
            });

            if (openPoCount > 0) {
                return res.status(400).json({ message: "Cannot deactivate supplier with open POs" });
            }
        }

        await supplier.update({ status: status || 'Active' });

        res.status(200).json({
            message: "Supplier status updated successfully",
            data: supplier
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// UPDATE Supplier Rating (PUT /:id/rating)
exports.updateSupplierRating = async (req, res) => {
    try {
        const supplier = await suppliers.findByPk(req.params.id);

        if (!supplier) {
            return res.status(404).json({ message: "Supplier not found" });
        }

        const { rating } = req.body;

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }

        await supplier.update({ performance_rating: rating });

        res.status(200).json({
            message: "Supplier rating updated successfully",
            data: supplier
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// DELETE Supplier
exports.deleteSupplier = async (req, res) => {
    try {
        const supplier = await suppliers.findByPk(req.params.id);

        if (!supplier) {
            return res.status(404).json({ message: "Supplier not found" });
        }

        await supplier.destroy();

        res.status(200).json({
            message: "Supplier deleted successfully"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
