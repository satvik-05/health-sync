const { DataTypes, Model } = require('sequelize');

class Pharmacy extends Model {
    static init(sequelize, DataTypes) {
        return super.init({
            pharmacy_id: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false
            },
            pharmacy_name: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            location: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            pharmacist_id: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
                references: {
                    model: 'Pharmacists', // This should match the table name
                    key: 'pharmacist_id'
                }
            },
            password: {
                type: DataTypes.STRING(100),
                allowNull: false
            }
        }, {
            sequelize,
            modelName: 'Pharmacy',
            tableName: 'Pharmacies',
            timestamps: true
        });
    }


    static associate(models) {
        // Define associations here if needed
        // Example: this.belongsTo(models.Pharmacist, { foreignKey: 'pharmacist_id' });
    }
}

// Export both the model and an init function
const initPharmacy = (sequelize, DataTypes) => {
    return Pharmacy.init(sequelize, DataTypes);
};

module.exports = {
    Pharmacy,
    initPharmacy
};