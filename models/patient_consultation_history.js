const { DataTypes, Model } = require('sequelize');

class PatientConsultationHistory extends Model {
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
            consultation_date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            prescription: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            report_link: {
                type: DataTypes.STRING,
                allowNull: true
            }
        }, {
            sequelize,
            modelName: 'PatientConsultationHistory',
            tableName: 'PatientConsultationHistory',
            timestamps: true
        });
        
        return PatientConsultationHistory;
    }
    
    static associate(models) {
        // Define associations here
        this.belongsTo(models.Patient, { foreignKey: 'medical_id' });
        this.belongsTo(models.Doctor, { foreignKey: 'doctor_id' });
    }
}

const initPatientConsultationHistory = (sequelize) => {
    return PatientConsultationHistory.init(sequelize);
};

module.exports = {
    PatientConsultationHistory,
    initPatientConsultationHistory
};