const { DataTypes, Model } = require('sequelize');

class Pharmacist extends Model {
    static init(sequelize, DataTypes) {
        return super.init({
            pharmacist_id: {
                type: DataTypes.STRING(50),
                primaryKey: true,
                allowNull: false
            },
            pharmacist_name: {
                type: DataTypes.STRING(50),
                allowNull: false
            },
            mobile_number: {
                type: DataTypes.STRING(15),
                allowNull: false,
                unique: true
            },
            license_number: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true
            },
            aadhaar_number: {
                type: DataTypes.STRING(12),
                allowNull: false,
                unique: true
            },
            email_id: {
                type: DataTypes.STRING(100),
                allowNull: false,
                unique: true,
                validate: {
                    isEmail: true
                }
            },
            password: {
                type: DataTypes.STRING(100),
                allowNull: false
            }
        }, {
            sequelize,
            modelName: 'Pharmacist',
            tableName: 'Pharmacists',
            timestamps: true // Enables createdAt & updatedAt automatically
        });
    }


    static associate(models) {
        // Define associations here if needed
        // Example: this.hasOne(models.Pharmacy, { foreignKey: 'pharmacist_id' });
    }
}

// Export both the model and an init function
const initPharmacist = (sequelize, DataTypes) => {
    return Pharmacist.init(sequelize, DataTypes);
};

module.exports = {
    Pharmacist,
    initPharmacist
};