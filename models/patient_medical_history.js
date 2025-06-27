const { DataTypes, Model } = require('sequelize');

class PatientMedicalHistory extends Model {
    static init(sequelize) {
        super.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            medical_id: {
                type: DataTypes.STRING(12),
                allowNull: false
            },
            doctor_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            known_allergies: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            chronic_diseases: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            past_surgeries: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            previous_hospitalizations: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            family_medical_history: {
                type: DataTypes.TEXT,
                allowNull: true
            }
        }, {
            sequelize,
            modelName: 'PatientMedicalHistory',
            tableName: 'PatientMedicalHistory',
            timestamps: true
        });
        
        return PatientMedicalHistory;
    }
    
    static associate(models) {
        // Define associations here
        this.belongsTo(models.Patient, { 
            foreignKey: 'medical_id',
            targetKey: 'medical_id'
        });
        
        this.belongsTo(models.Doctor, { 
            foreignKey: 'doctor_id',
            targetKey: 'doctor_id'
        });
    }
}

const initPatientMedicalHistory = (sequelize) => {
    return PatientMedicalHistory.init(sequelize);
};

module.exports = {
    PatientMedicalHistory,
    initPatientMedicalHistory
};
