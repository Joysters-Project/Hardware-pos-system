const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('projects', {
    project_id:   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    project_name:  { type: DataTypes.STRING(200), allowNull: false },
    project_owner: { type: DataTypes.STRING(150), allowNull: true },
    location:      { type: DataTypes.STRING(255), allowNull: true },
    project_type: {
      type: DataTypes.ENUM('Welding', 'Timber', 'Hardware', 'Other'),
      allowNull: false, defaultValue: 'Hardware'
    },
    project_departments: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
    },
    description:  { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('Active', 'Completed', 'On Hold', 'Cancelled'),
      allowNull: false, defaultValue: 'Active'
    },
    start_date:   { type: DataTypes.DATEONLY, allowNull: false },
    deadline:     { type: DataTypes.DATEONLY, allowNull: true },
    end_date:     { type: DataTypes.DATEONLY, allowNull: true },
    final_cost:   { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: null },
    amount_paid:  { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    created_by:   { type: DataTypes.INTEGER, allowNull: false }, // user_id
    created_at:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'projects',
    timestamps: false,
  });
};
