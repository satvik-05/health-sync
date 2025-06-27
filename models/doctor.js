const { DataTypes, Model } = require('sequelize');

class Doctor extends Model {
    static init(sequelize) {
        super.init({
            doctor_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            specialization: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            password: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            email: {
                type: DataTypes.STRING(100),
                allowNull: false,
                unique: true,
                validate: {
                    isEmail: true
                }
            },
            phone_number: {
                type: DataTypes.STRING(15),
                allowNull: false,
                validate: {
                    isNumeric: true,
                    len: [10, 15]
                }
            },
            address: {
                type: DataTypes.STRING(255),
                allowNull: true
            },
            gender: {
                type: DataTypes.ENUM('Male', 'Female', 'Other'),
                allowNull: false
            },
            date_of_birth: {
                type: DataTypes.DATEONLY,
                allowNull: false
            },
            license_number: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true
            },
            status: {
                type: DataTypes.ENUM('Active', 'Inactive'),
                defaultValue: 'Active'
            }
        }, {
            sequelize,
            modelName: 'Doctor',
            tableName: 'Doctors',
            timestamps: true
        });
        
        return Doctor;
    }
    
    static associate(models) {
        // Define associations here
        this.hasMany(models.PatientConsultationHistory, { foreignKey: 'doctor_id' });
    }
}

const initDoctor = (sequelize) => {
    return Doctor.init(sequelize);
};

module.exports = {
    Doctor,
    initDoctor
};