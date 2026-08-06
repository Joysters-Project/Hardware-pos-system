'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('suppliers');

    const addIfMissing = async (col, def) => {
      if (!tableDesc[col]) {
        await queryInterface.addColumn('suppliers', col, def);
      }
    };

    await addIfMissing('performance_score', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    });

    await addIfMissing('performance_tier', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'Bronze'
    });

    await addIfMissing('on_time_delivery_pct', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    });

    await addIfMissing('avg_delay_days', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    });

    await addIfMissing('order_success_rate', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    });

    await addIfMissing('total_purchase_volume', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00
    });
  },

  async down(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('suppliers');

    const removeIfExists = async (col) => {
      if (tableDesc[col]) {
        await queryInterface.removeColumn('suppliers', col);
      }
    };

    await removeIfExists('performance_score');
    await removeIfExists('performance_tier');
    await removeIfExists('on_time_delivery_pct');
    await removeIfExists('avg_delay_days');
    await removeIfExists('order_success_rate');
    await removeIfExists('total_purchase_volume');
  }
};
