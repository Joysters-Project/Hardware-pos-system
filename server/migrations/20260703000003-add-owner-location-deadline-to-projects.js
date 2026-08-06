'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const cols = await queryInterface.describeTable('projects');

    if (!cols.project_owner) {
      await queryInterface.addColumn('projects', 'project_owner', {
        type: Sequelize.STRING(150),
        allowNull: true,
        after: 'project_name',
      });
    }
    if (!cols.location) {
      await queryInterface.addColumn('projects', 'location', {
        type: Sequelize.STRING(255),
        allowNull: true,
        after: 'project_owner',
      });
    }
    if (!cols.deadline) {
      await queryInterface.addColumn('projects', 'deadline', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        after: 'start_date',
      });
    }
  },

  async down(queryInterface) {
    const cols = await queryInterface.describeTable('projects');
    if (cols.project_owner) await queryInterface.removeColumn('projects', 'project_owner');
    if (cols.location)      await queryInterface.removeColumn('projects', 'location');
    if (cols.deadline)      await queryInterface.removeColumn('projects', 'deadline');
  },
};
