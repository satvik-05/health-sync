const express = require('express');
const session = require('express-session');
const { DataTypes, Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Import models and database connection
const db = require('./models');
const { sequelize } = db;

// Use db object directly for models to avoid reference issues

const app = express();

// Enable JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up session
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Serve static files
app.use(express.static('public'));

// Test the database connection and sync models
async function initializeDatabase() {
    try {
        // Test the connection
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');

        // Import all models
        const models = require('./models');
        
        // Setup associations
        Object.keys(models).forEach(modelName => {
            if (models[modelName].associate) {
                models[modelName].associate(models);
            }
        });

        // Sync all models with the database
        // First, sync without altering tables
        await sequelize.sync({ force: false });
        
        console.log('Database synchronized.');
        
        // Check and update schema if needed
        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('Patients');
        
        // Add password column if it doesn't exist
        if (!tableInfo.password) {
            try {
                await queryInterface.addColumn('Patients', 'password', {
                    type: DataTypes.STRING,
                    allowNull: false,
                    defaultValue: '1111'
                });
                console.log('Added password column to Patients table');
            } catch (error) {
                console.log('Error adding password column:', error.message);
            }
        }
        
        console.log('Database synchronized.');

        // Start the server after syncing
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

// Initialize the database and start the server
initializeDatabase();

// Middleware to check if user is admin
function isAdmin(req, res, next) {
    if (req.session.isAdmin) {
        return next();
    }
    res.status(403).send('Access denied. Admin privileges required.');
}

// Middleware to check if user is doctor
function isDoctor(req, res, next) {
    if (req.session.userId && req.session.userType === 'doctor') {
        return next();
    }
    res.status(403).send('Access denied. Doctor privileges required.');
}

// Middleware to check if user is pharmacy
function isPharmacy(req, res, next) {
    if (req.session.userId && req.session.role === 'pharmacy') {
        return next();
    }
    res.status(403).send('Access denied. Pharmacy privileges required.');
}

// Middleware to check if user is pharmacist
function isPharmacist(req, res, next) {
    if (req.session.userId && req.session.role === 'pharmacist') {
        return next();
    }
    res.status(403).send('Access denied. Pharmacist privileges required.');
}


// Route for main page
// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});






// Admin login routes
// Admin login page
app.get('/admin', (req, res) => {
    if (req.session.isAdmin) {
        res.redirect('/admin/dashboard');
    } else {
        res.sendFile(__dirname + '/public/admin_login.html');
    }
});

// Admin login handler
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        req.session.isAdmin = true;
        req.session.userId = 'admin';
        req.session.role = 'admin';
        res.redirect('/admin/dashboard');
    } else {
        res.redirect('/admin?error=Invalid credentials');
    }
});

// Admin logout
app.get('/admin/logout', (req, res) => {
    req.session.isAdmin = false;
    res.redirect('/admin');
});

// Admin dashboard route - Return only the counts
app.get('/api/admin/dashboard', isAdmin, async (req, res) => {
    try {
        // Use the models from the db object
        const [
            patientsCount,
            doctorsCount,
            pharmaciesCount,
            pharmacistsCount,
            consultationsCount
        ] = await Promise.all([
            db.Patient.count(),
            db.Doctor.count(),
            db.Pharmacy ? db.Pharmacy.count() : 0,
            db.Pharmacist ? db.Pharmacist.count() : 0,
            db.PatientConsultationHistory ? db.PatientConsultationHistory.count() : 0
        ]);

        res.json({
            patients: patientsCount || 0,
            doctors: doctorsCount || 0,
            pharmacies: pharmaciesCount || 0,
            pharmacists: pharmacistsCount || 0,
            consultations: consultationsCount || 0
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Return default counts in case of error
        res.json({
            patients: 0,
            doctors: 0,
            pharmacies: 0,
            pharmacists: 0,
            consultations: 0
        });
    }
});

// Serve the admin dashboard HTML page
app.get('/admin/dashboard', isAdmin, (req, res) => {
    res.sendFile(__dirname + '/public/admin_dashboard.html');
});













// admin routes for managing patients
// Function to generate random 12-digit number
function generateMedicalId() {
    const min = 100000000000; // 12 digits
    const max = 999999999999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

// Function to check if medical ID exists
async function isMedicalIdUnique(medical_id) {
    const existingPatient = await db.Patient.findOne({ where: { medical_id } });
    return !existingPatient;
}

// Admin patients data API route
app.get('/api/admin/patients', isAdmin, async (req, res) => {
    try {
        console.log('Fetching all patients');
        const patients = await db.Patient.findAll();
        res.json(patients);  // Send data as JSON
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ error: 'Failed to load patients' });
    }
});

// Serve the Admin Patients HTML page
app.get('/admin/patients', isAdmin, (req, res) => {
    res.sendFile(__dirname + '/public/admin_patients.html');
});

// Delete patient route
app.delete('/api/admin/delete_patient', isAdmin, async (req, res) => {
    try {
        const { medical_id } = req.query;
        console.log('Deleting patient with medical_id:', medical_id);

        // Delete related medical history records first
        await db.PatientConsultationHistory.destroy({ where: { medical_id } });

        // Now delete the patient
        const result = await db.Patient.destroy({ where: { medical_id } });

        if (result === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        console.log('Patient deleted successfully');
        res.json({ message: 'Patient deleted successfully' });
    } catch (error) {
        console.error('Error deleting patient:', error);
        res.status(500).json({ error: 'Failed to delete patient' });
    }
});


// Edit patient route
app.post('/admin/edit_patient', isAdmin, async (req, res) => {
    try {
        const { medical_id, name, aadhaar_number, mobile_number, date_of_birth, gender, blood_group, address } = req.body;

        // Validate required fields
        if (!medical_id || !name || !aadhaar_number || !mobile_number || !date_of_birth || !gender || !blood_group || !address) {
            throw new Error('All fields are required');
        }

        // Update with new fields
        const [updatedRowsCount] = await db.Patient.update(
            { name, aadhaar_number, mobile_number, date_of_birth, gender, blood_group, address },
            { where: { medical_id } }
        );

        if (updatedRowsCount === 0) throw new Error('Patient not found');
        res.redirect('/admin/patients');
    } catch (error) {
        console.error('Error editing patient:', error);
        const patients = await db.Patient.findAll();
        res.render('admin_patients', { 
            patients, 
            error: error.message 
        });
    }
});


// Add patient route
app.post('/admin/add_patient', isAdmin, async (req, res) => {
    try {
        console.log('Received request to add new patient');
        const { name, aadhaar_number, mobile_number, date_of_birth, gender, blood_group, address, password } = req.body;
        
        // Validation
        if (!name || !aadhaar_number || !mobile_number || !date_of_birth || !gender || !blood_group || !address) {
            throw new Error('All fields are required');
        }

        // Generate medical ID (use your existing function)
        let medical_id;
        do {
            medical_id = generateMedicalId();
        } while (!(await isMedicalIdUnique(medical_id)));

        // Create patient with new fields
        await db.Patient.create({
            medical_id,
            name,
            aadhaar_number,
            mobile_number,
            date_of_birth,
            gender,
            blood_group,
            address,
            password
        });

        res.redirect('/admin/patients');
    } catch (error) {
        console.error('Error adding patient:', error);
        const patients = await db.Patient.findAll();
        res.render('admin_patients', { 
            patients, 
            error: error.message || 'Failed to add patient' 
        });
    }
});

// Reset patient password route
app.post('/admin/reset_patient_password', isAdmin, async (req, res) => {
    try {
        const { medical_id } = req.body;

        // Generate a random 8-character password
        const newPassword = Math.random().toString(36).slice(-8);

        // Update the patient's password
        await db.Patient.update(
            { password: newPassword },
            { where: { medical_id } }
        );

        // Fetch all patients (if needed for the frontend)
        const patients = await db.Patient.findAll();

        // Return JSON response
        res.json({
            success: `Password reset successful. New password: ${newPassword}`,
            patients: patients // Send the updated list of patients
        });
    } catch (error) {
        console.error('Error:', error);

        // Return JSON response with error
        res.json({
            error: 'Failed to reset password'
        });
    }
});


















// Admin routes for managing doctors
// Function to generate random 12-digit doctor ID
function generateDoctorId() {
    const min = 100000000000; // 12 digits
    const max = 999999999999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

// Function to check if doctor ID exists
async function isDoctorIdUnique(doctor_id) {
    const existingDoctor = await db.Doctor.findOne({ where: { doctor_id } });
    return !existingDoctor;
}

// Serve the admin doctors page
app.get('/admin/doctors', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_doctors.html'));  // Serve the HTML page for managing doctors
});

// API to get all doctors
app.get('/api/doctors', isAdmin, async (req, res) => {
    try {
        const doctors = await db.Doctor.findAll(); // Fetch from SQLite database
        res.json({ doctors });
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API to add a new doctor
app.post('/api/add_doctor', isAdmin, async (req, res) => {
    try {
        const { name, specialization, password, email, phone_number, address, gender, date_of_birth, license_number, status } = req.body;

        // Generate a random 12-digit doctor ID
        let doctor_id;
        let isUnique = false;

        while (!isUnique) {
            doctor_id = generateDoctorId();
            isUnique = await isDoctorIdUnique(doctor_id);
        }

        // Create a new doctor in the database
        const newDoctor = await db.Doctor.create({
            doctor_id,
            name,
            specialization,
            password,
            email,
            phone_number,
            address,
            gender,
            date_of_birth,
            license_number,
            status: status || 'Active' // Default to Active if not provided
        });

        res.json({ success: 'Doctor added successfully', doctor: newDoctor });
    } catch (error) {
        console.error('Error adding doctor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API to delete a doctor
app.delete('/api/delete_doctor/:doctor_id', isAdmin, async (req, res) => {
    try {
        const { doctor_id } = req.params;

        // Find the doctor by ID
        const doctor = await db.Doctor.findByPk(doctor_id);

        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        // Delete the doctor
        await doctor.destroy();

        res.json({ success: 'Doctor deleted successfully' });

    } catch (error) {
        console.error('Error deleting doctor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API to edit doctor details
app.post('/api/edit_doctor', isAdmin, async (req, res) => {
    try {
        const { doctor_id, name, specialization, password, email, phone_number, address, gender, date_of_birth, license_number, status } = req.body;
        const doctor = await db.Doctor.findByPk(doctor_id);

        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        // Update only the provided fields
        await doctor.update({
            name: name || doctor.name,
            specialization: specialization || doctor.specialization,
            password: password || doctor.password,
            email: email || doctor.email,
            phone_number: phone_number || doctor.phone_number,
            address: address || doctor.address,
            gender: gender || doctor.gender,
            date_of_birth: date_of_birth || doctor.date_of_birth,
            license_number: license_number || doctor.license_number,
            status: status || doctor.status
        });

        res.json({ success: 'Doctor updated successfully' });
    } catch (error) {
        console.error('Error editing doctor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API to reset doctor password
app.post('/api/reset_doctor_password', isAdmin, async (req, res) => {
    try {
        const { doctor_id, new_password } = req.body;

        // Find the doctor by ID
        const doctor = await db.Doctor.findByPk(doctor_id);
        
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        // Update the password
        await doctor.update({ password: new_password });

        res.json({ success: 'Doctor password reset successfully' });

    } catch (error) {
        console.error('Error resetting doctor password:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});























// admin routes for managing pharmacies
// Function to generate random 12-digit pharmacy ID
function generatePharmacyId() {
    const min = 100000000000; // 12 digits
    const max = 999999999999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

// Function to check if pharmacy ID exists
async function isPharmacyIdUnique(pharmacy_id) {
    const existingPharmacy = await db.Pharmacy.findOne({ where: { pharmacy_id } });
    return !existingPharmacy;
}


// Serve the admin pharmacies page
app.get('/admin/pharmacies', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_pharmacies.html'));  // Serve the HTML page for managing pharmacies
});

// API to get all pharmacies
app.get('/api/pharmacies', isAdmin, async (req, res) => {
    try {
        const pharmacies = await db.Pharmacy.findAll(); // Fetch from SQLite database
        res.json({ pharmacies });
    } catch (error) {
        console.error('Error fetching pharmacies:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API to add a new pharmacy
app.post('/api/add_pharmacy', isAdmin, async (req, res) => {
    try {
        const { pharmacy_name, location, password, pharmacist_id } = req.body;

        // Generate unique pharmacy ID and pharmacist ID
        let pharmacy_id;
        let isUnique = false;

        while (!isUnique) {
            pharmacy_id = generatePharmacyId();
            isUnique = await isPharmacyIdUnique(pharmacy_id);
        }

        // Insert into database
        const newPharmacy = await db.Pharmacy.create({
            pharmacy_id,
            pharmacy_name,
            location,
            pharmacist_id,
            password
        });

        res.json({ success: 'Pharmacy added successfully', pharmacy: newPharmacy });
    } catch (error) {
        console.error('Error adding pharmacy:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API to delete a pharmacy
app.delete('/api/delete_pharmacy/:pharmacy_id', isAdmin, async (req, res) => {
    try {
        const { pharmacy_id } = req.params;

        // Find the pharmacy by ID
        const pharmacy = await db.Pharmacy.findByPk(pharmacy_id);

        if (!pharmacy) {
            return res.status(404).json({ error: 'Pharmacy not found' });
        }

        // Delete the pharmacy
        await pharmacy.destroy();

        res.json({ success: 'Pharmacy deleted successfully' });

    } catch (error) {
        console.error('Error deleting pharmacy:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// API to edit pharmacy details
app.post('/api/edit_pharmacy', isAdmin, async (req, res) => {
    try {
        const { pharmacy_id, pharmacy_name, location, password, pharmacist_id } = req.body;
        console.log('Pharmacy ID:', pharmacy_id);

        // Find the pharmacy by ID
        const pharmacy = await db.Pharmacy.findByPk(pharmacy_id);
        if (!pharmacy) return res.status(404).json({ error: 'Pharmacy not found' });

        // Update the data
        const updateData = {};
        if (pharmacy_name) updateData.pharmacy_name = pharmacy_name;
        if (location) updateData.location = location;
        if (pharmacist_id) updateData.pharmacist_id = pharmacist_id;
        if (password) updateData.password = password;  

        await pharmacy.update(updateData);
        res.json({ success: 'Pharmacy updated successfully' });

    } catch (error) {
        console.error('Error editing pharmacy:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API to reset pharmacy password
app.post('/api/reset_pharmacy_password/:pharmacy_id', async (req, res) => {
    const { pharmacy_id } = req.params;
    const { password } = req.body;

    // Validate password length, etc. as necessary

    try {
        const pharmacy = await db.Pharmacy.findByPk(pharmacy_id);
        if (pharmacy) {
            pharmacy.password = password;  // Update password
            await pharmacy.save();
            res.json({ success: 'Password reset successfully' });
        } else {
            res.status(404).json({ error: 'Pharmacy not found' });
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});










// Function to generate random 12-digit pharmacist ID
function generatePharmacistId() {
    const min = 100000000000; // 12 digits
    const max = 999999999999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

// Function to check if pharmacist ID is unique
async function isPharmacistIdUnique(pharmacist_id) {
    const existingPharmacist = await db.Pharmacist.findOne({ where: { pharmacist_id } });
    return !existingPharmacist;
}

// Serve the admin pharmacists page
app.get('/admin/pharmacists', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_pharmacists.html'));  // Serve the HTML page for managing pharmacists
});

// API to get all pharmacists
app.get('/api/pharmacists', isAdmin, async (req, res) => {
    try {
        const pharmacists = await db.Pharmacist.findAll(); // Fetch from SQLite database
        res.json({ pharmacists });
    } catch (error) {
        console.error('Error fetching pharmacists:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API to add a new pharmacist
app.post('/api/add_pharmacist', isAdmin, async (req, res) => {
    try {
        const { pharmacist_name, mobile_number, license_number, aadhaar_number, email_id, password } = req.body;

        // Check if email already exists
        const existingPharmacist = await db.Pharmacist.findOne({ where: { email_id } });
        if (existingPharmacist) {
            return res.status(400).json({ error: 'Email ID already exists. Please use a different email.' });
        }

        // Generate unique pharmacist ID
        let pharmacist_id;
        let isUnique = false;

        while (!isUnique) {
            pharmacist_id = generatePharmacistId();
            isUnique = await isPharmacistIdUnique(pharmacist_id);
        }

        // Insert into database
        const newPharmacist = await db.Pharmacist.create({
            pharmacist_id,
            pharmacist_name,
            mobile_number,
            license_number,
            aadhaar_number,
            email_id,
            password
        });

        res.json({ success: 'Pharmacist added successfully', pharmacist: newPharmacist });
    } catch (error) {
        console.error('Error adding pharmacist:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API to edit pharmacist details
app.post('/api/edit_pharmacist', isAdmin, async (req, res) => {
    try {
        const { pharmacist_id, pharmacist_name, mobile_number, license_number, aadhaar_number, email_id, password } = req.body;

        // Find the pharmacist by ID
        const pharmacist = await db.Pharmacist.findByPk(pharmacist_id);
        if (!pharmacist) return res.status(404).json({ error: 'Pharmacist not found' });

        // Update the data
        const updateData = {};
        if (pharmacist_name) updateData.pharmacist_name = pharmacist_name;
        if (mobile_number) updateData.mobile_number = mobile_number;
        if (license_number) updateData.license_number = license_number;
        if (aadhaar_number) updateData.aadhaar_number = aadhaar_number;
        if (email_id) updateData.email_id = email_id;
        if (password) updateData.password = password; 

        await pharmacist.update(updateData);
        res.json({ success: 'Pharmacist updated successfully' });

    } catch (error) {
        console.error('Error editing pharmacist:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API to delete a pharmacist
app.delete('/api/delete_pharmacist/:pharmacist_id', isAdmin, async (req, res) => {
    try {
        const { pharmacist_id } = req.params;

        // Find the pharmacist by ID
        const pharmacist = await db.Pharmacist.findByPk(pharmacist_id);

        if (!pharmacist) {
            return res.status(404).json({ error: 'Pharmacist not found' });
        }

        // Delete the pharmacist
        await pharmacist.destroy();

        res.json({ success: 'Pharmacist deleted successfully' });

    } catch (error) {
        console.error('Error deleting pharmacist:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API to reset pharmacist password
app.post('/api/reset_pharmacist_password', isAdmin, async (req, res) => {
    try {
        const { pharmacist_id, new_password } = req.body;

        // Find the pharmacist by ID
        const pharmacist = await db.Pharmacist.findByPk(pharmacist_id);
        
        if (!pharmacist) {
            return res.status(404).json({ error: 'Pharmacist not found' });
        }

        // Update the password
        await pharmacist.update({ password: new_password });

        res.json({ success: 'Pharmacist password reset successfully' });

    } catch (error) {
        console.error('Error resetting pharmacist password:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

















// Serve the admin patient consultation history page
app.get('/admin/patient_consultation_history', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_patient_consultation_history.html'));  // Serve the HTML page for managing patient consultation history
});

// API to get all consultations
app.get('/api/admin/consultations', isAdmin, async (req, res) => {
    try {
        const consultations = await db.PatientConsultationHistory.findAll({
            include: [
                {
                    model: db.Patient, // Include patient data
                    attributes: ['medical_id'] // Only fetch medical_id
                },
                {
                    model: db.Doctor, // Include doctor data
                    attributes: ['doctor_id'] // Only fetch doctor_id
                }
            ]
        });

        // Map the results to include necessary fields
        const result = consultations.map(consultation => ({
            id: consultation.id,
            medical_id: consultation.Patient.medical_id,
            doctor_id: consultation.Doctor.doctor_id,
            consultation_date: consultation.consultation_date,
            description: consultation.description,
            prescription: consultation.prescription,
            report_link: consultation.report_link
        }));

        res.json(result);
    } catch (error) {
        console.error('Error fetching consultations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API to add a new consultation
app.post('/api/admin/add_consultation', isAdmin, async (req, res) => {
    try {
        const { medical_id, doctor_id, consultation_date, description, prescription } = req.body;

        if (!medical_id || !doctor_id || !consultation_date || !description || !prescription) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const newConsultation = await db.PatientConsultationHistory.create({
            medical_id,
            doctor_id,
            consultation_date, // Ensure this matches your model
            description, 
            prescription // Ensure this matches your model
        });

        res.json({ success: 'Consultation added successfully', consultation: newConsultation });
    } catch (error) {
        console.error('Error adding consultation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API to edit a consultation
app.post('/api/admin/edit_consultation', isAdmin, async (req, res) => {
    try {
        const { consultation_id, date, notes } = req.body;

        if (!consultation_id || !date || !notes) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const consultation = await db.PatientConsultationHistory.findByPk(consultation_id);
        
        if (!consultation) {
            return res.status(404).json({ error: 'Consultation not found' });
        }

        await consultation.update({ consultation_date: date, description: notes });

        res.json({ success: 'Consultation updated successfully' });
    } catch (error) {
        console.error('Error editing consultation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API to delete a consultation
app.delete('/api/admin/delete_consultation/:consultation_id', isAdmin, async (req, res) => {
    try {
        const { consultation_id } = req.params;

        const consultation = await db.PatientConsultationHistory.findByPk(consultation_id);

        if (!consultation) {
            return res.status(404).json({ error: 'Consultation not found' });
        }

        await consultation.destroy();

        res.json({ success: 'Consultation deleted successfully' });
    } catch (error) {
        console.error('Error deleting consultation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


















// Patient signup routes
// Handle patient signup form display
app.get('/patient_signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'patient_signup.html'));
});

// Handle patient signup form submission
app.post('/patient_signup', async (req, res) => {
    try {
        const { name, aadhaar_number, mobile_number, date_of_birth, gender, blood_group, address, password } = req.body;

        // Generate a random 12-digit medical ID
        const medical_id = generateMedicalId(); // Ensure this function is defined

        const newPatient = await db.Patient.create({
            name,
            aadhaar_number,
            mobile_number,
            date_of_birth,
            gender,
            blood_group,
            address,
            password,
            medical_id
        });

        console.log('Patient signed up successfully:', newPatient);

        return res.redirect(`/patient_signup?success=${encodeURIComponent(medical_id)}`);
    } catch (error) {
        console.error('Error during patient signup:', error);
        return res.redirect('/patient_signup?error=An+error+occurred+during+signup');
    }
});

// Patient signin routes
app.get('/patient_signin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'patient_signin.html'));
});

app.post('/patient_signin', async (req, res) => {
    try {
        console.log(req.body); // Check incoming form data
        const { identifier, password } = req.body;

        const patient = await db.Patient.findOne({ where: { medical_id: identifier, password: password } });

        if (patient) {
            req.session.patientId = patient.medical_id;
            console.log('Sign-in successful:', patient.medical_id);
            return res.redirect('/patient_profile_view');
        } else {
            console.log('Invalid credentials');
            return res.redirect('/patient_signin?error=Invalid+credentials');
        }
    } catch (error) {
        console.error('Error in patient signin:', error);
        return res.redirect('/patient_signin?error=An+error+occurred+during+sign+in');
    }
});
















// Patient profile routes
// Handle patient profile display
app.get('/patient_profile_view', (req, res) => {
    if (!req.session.patientId) {
        return res.redirect('/patient_signin');
    }
    res.sendFile(path.join(__dirname, 'public', 'patient_profile_view.html'));
});

// Route to fetch patient data
app.get('/get_patient_data', async (req, res) => {
    try {
        if (!req.session.patientId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const patient = await db.Patient.findOne({
            where: { medical_id: req.session.patientId },
            attributes: ['medical_id', 'name', 'aadhaar_number', 'mobile_number', 'date_of_birth', 'gender', 'blood_group', 'address']
        });

        if (!patient) {
            req.session.destroy();
            return res.status(404).json({ error: "Patient not found" });
        }

        // Fetch consultation history
        const consultationHistory = await db.PatientConsultationHistory.findAll({
            where: { medical_id: req.session.patientId },
            attributes: ['consultation_date', 'description', 'prescription', 'doctor_id', 'report_link'],
            order: [['consultation_date', 'DESC']]
        });

        // Fetch medical history
        const medicalHistory = await db.PatientMedicalHistory.findAll({
            where: { medical_id: req.session.patientId },
            attributes: ['known_allergies', 'chronic_diseases', 'past_surgeries', 'previous_hospitalizations', 'family_medical_history'],
            order: [['updatedAt', 'DESC']]
        });

        res.json({ patient, consultationHistory, medicalHistory });
    } catch (error) {
        console.error('Error fetching patient data:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});
















// Doctor routes 
// Doctor signin routes
app.get('/doctor_signin', (req, res) => {
    const error = req.query.error || '';
    res.sendFile(path.join(__dirname, 'public', 'doctor_signin.html'));
});

// Doctor signin post route
app.post('/doctor_signin', async (req, res) => {
    try {
        const { doctor_id, password } = req.body;
        console.log('Doctor login attempt:', { doctor_id, password });

        const doctor = await db.Doctor.findOne({ 
            where: { 
                doctor_id: doctor_id,
                password: password
            } 
        });

        console.log('Doctor found:', doctor ? 'Yes' : 'No');

        if (doctor) {
            req.session.userId = doctor.doctor_id;
            req.session.userType = 'doctor';
            res.redirect('/doctor/dashboard');
        } else {
            res.redirect('/doctor_signin?error=Invalid%20credentials');
        }
    } catch (error) {
        console.error('Error in doctor login:', error);
        res.redirect('/doctor_signin?error=An%20error%20occurred%20during%20login');
    }
});

// Doctor dashboard route
app.get('/doctor/dashboard', isDoctor, async (req, res) => {
    try {
        const doctor = await db.Doctor.findByPk(req.session.userId);
        if (!doctor) {
            req.session.destroy();
            return res.redirect('/doctor_signin');
        }
        res.redirect(`/doctor_dashboard.html?name=${encodeURIComponent(doctor.name)}`);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server error');
    }
});

// Doctor search patient post route
app.post('/doctor/search_patient', isDoctor, async (req, res) => {
    try {
        console.log('Searching for patient with ID:', req.body.medical_id);
        const { medical_id } = req.body;
        const doctor = await db.Doctor.findByPk(req.session.userId);
        
        if (!doctor) {
            console.log('Doctor not found in session:', req.session.userId);
            req.session.destroy();
            return res.redirect('/doctor_signin');
        }

        // First check if patient exists
        const patient = await db.Patient.findOne({ where: { medical_id } });
        console.log('Patient found:', patient ? 'Yes' : 'No');
        
        if (!patient) {
            console.log('Patient not found for ID:', medical_id);
            return res.render('doctor_dashboard', { 
                doctor,
                consultationHistory: [],
                error: 'Patient not found. Please check the medical ID.'
            });
        }

        // Get patient's consultation history
        const consultationHistory = await db.PatientConsultationHistory.findAll({
            where: { medical_id: patient.medical_id }, 
            order: [['consultation_date', 'DESC']]
        });
        console.log('Found consultation history records:', consultationHistory.length);

        res.render('doctor_dashboard', { 
            doctor,
            consultationHistory,
            success: consultationHistory.length ? `Found ${consultationHistory.length} records for patient ${medical_id}` : `No consultation records found for patient ${medical_id}`
        });
    } catch (error) {
        console.error('Error in search_patient:', error);
        const doctor = await db.Doctor.findByPk(req.session.userId);
        res.render('doctor_dashboard', { 
            doctor,
            consultationHistory: [],
            error: 'Error searching for patient records. Please try again.'
        });
    }
});

// Add patient consultation record route
app.get('/doctor/add_patient_consultation_record', isDoctor, async (req, res) => {
    const doctor = await db.Doctor.findByPk(req.session.userId);
    if (!doctor) {
        console.log('Doctor not found in session:', req.session.userId);
        req.session.destroy();
        return res.redirect('/doctor_signin');
    }

    // Serve the static HTML file
    res.sendFile(path.join(__dirname, 'public', 'add_patient_consultation_record.html'));
});

// Doctor add patient consultation record post route
app.post('/doctor/add_patient_consultation_record', isDoctor, async (req, res) => {
    try {
        console.log('Adding consultation record for patient:', req.body.patient_medical_id);
        const { patient_medical_id, description, prescription, report_link } = req.body;
        
        const doctor = await db.Doctor.findByPk(req.session.userId);
        if (!doctor) {
            console.log('Doctor not found in session:', req.session.userId);
            req.session.destroy();
            return res.redirect('/doctor_signin');
        }

        // Check if patient exists
        const patient = await db.Patient.findOne({ where: { medical_id: patient_medical_id } });
        console.log('Patient found:', patient ? 'Yes' : 'No');
        
        if (!patient) {
            return res.redirect(`/doctor/add_patient_consultation_record?error=Patient not found. Please check the medical ID.`);
        }

        // Create consultation record
        await db.PatientConsultationHistory.create({
            medical_id: patient_medical_id,
            doctor_id: doctor.doctor_id,
            consultation_date: new Date(),
            description,
            prescription,
            report_link
        });

        console.log('New consultation record added successfully');

        // Redirect with success message
        res.redirect(`/doctor/add_patient_consultation_record?success=Consultation record added successfully!`);
    } catch (error) {
        console.error('Error in add_consultation_record:', error);
        res.redirect(`/doctor/add_patient_consultation_record?error=Failed to add consultation record. Please try again.`);
    }
});

// View patient consultation history route
app.get('/doctor/view_patient_consultation_history', isDoctor, async (req, res) => {
    const doctor = await db.Doctor.findByPk(req.session.userId);
    if (!doctor) {
        console.log('Doctor not found in session:', req.session.userId);
        req.session.destroy();
        return res.redirect('/doctor_signin');
    }

    // Serve the static HTML file
    res.sendFile(path.join(__dirname, 'public', 'view_patient_consultation_history.html'));
});

// Doctor view patient consultation history post route
app.post('/doctor/view_patient_consultation_history', async (req, res) => {
    console.log('Request Headers:', req.headers);  // Log headers
    console.log('Request Body:', req.body);
    const { medical_id } = req.body;  // Get medical_id from the request body

    if (!medical_id) {
        return res.json({ error: 'Medical ID is required.' }); // Error if medical_id is missing
    }

    // Assuming you're using sessions for authentication
    const doctor = await db.Doctor.findByPk(req.session.userId);
    if (!doctor) {
        console.log('Doctor not found in session:', req.session.userId);
        req.session.destroy();
        return res.redirect('/doctor_signin');
    }

    // Fetch consultation history using the medical_id
    const consultationHistory = await db.PatientConsultationHistory.findAll({
        where: { medical_id: medical_id }, // Query using the medical_id
        include: [{
            model: db.Doctor,
            attributes: ['name']
        }],
        order: [['consultation_date', 'DESC']]  // Order records by consultation date
    });

    // If no records found, send an error message
    if (consultationHistory.length === 0) {
        return res.json({ error: 'No consultation records found for this patient.' });
    }

    // Return the consultation history
    const formattedHistory = consultationHistory.map(record => ({
        consultation_date: record.consultation_date,
        description: record.description,
        prescription: record.prescription,
        doctor_id: record.doctor_id,
        report_link: record.report_link
    }));

    res.json({ consultationHistory: formattedHistory }); // Send the formatted consultation history
});











// Pharmacy Sign-in route
app.get('/pharmacy_signin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pharmacy_signin.html'));
});

// Pharmacy Sign-in POST route
app.post('/pharmacy_signin', async (req, res) => {
    try {
        const { shop_id, password } = req.body;
        console.log('Pharmacy login attempt:', { shop_id, password });

        // Find Pharmacy in the database
        const pharmacy = await Pharmacy.findOne({ where: { pharmacy_id: shop_id } });

        console.log('Database Query Result:', pharmacy); // Log the query result

        if (!pharmacy) {
            console.log('Pharmacy Not Found');
            return res.redirect('/pharmacy_signin?error=Invalid%20credentials');
        }

        const passwordMatch = password === pharmacy.password;
        console.log('Password Match:', passwordMatch); // Log password comparison result

        if (passwordMatch) {
            req.session.shopId = pharmacy.pharmacy_id;
            req.session.userType = 'pharmacy';
            res.redirect('/pharmacy_dashboard');
        } else {
            console.log('Incorrect Password');
            res.redirect('/pharmacy_signin?error=Invalid%20credentials');
        }
    } catch (error) {
        console.error('Error during pharmacy login:', error);
        res.redirect('/pharmacy_signin?error=An%20error%20occurred');
    }
});

// Pharmacy Dashboard route
app.get('/pharmacy_dashboard', isPharmacy, async (req, res) => {
    try {
        const pharmacy = await Pharmacy.findByPk(req.session.shopId);

        if (!pharmacy) {
            req.session.destroy();
            return res.redirect('/pharmacy_signin');
        }

        res.sendFile(path.join(__dirname, 'public', 'pharmacy_dashboard.html'));
    } catch (error) {
        console.error('Error fetching pharmacy details:', error);
        res.status(500).send('Server error');
    }
});

// Pharmacy Dashboard Data fetch route
app.post('/pharmacy_dashboard_data', async (req, res) => {
    const { patient_medical_id } = req.body;

    try {
        const patientHistory = await db.PatientConsultationHistory.findAll({
            where: {
                medical_id: patient_medical_id
            }
        });

        if (patientHistory.length === 0) {
            return res.json({ error: 'No consultation history found' });
        }

        res.json({ patientHistory });
    } catch (error) {
        console.error('Error fetching patient history:', error);
        res.json({ error: 'An error occurred while fetching patient history' });
    }
});

















// Pharmacist Routes
// Pharmacist Sign-in route
app.get('/pharmacist_signin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pharmacist_signin.html'));
});

// Pharmacist Sign-in POST route
app.post('/pharmacist_signin', async (req, res) => {
    try {
        const { pharmacist_id, password } = req.body;
        console.log('Pharmacist login attempt:', { pharmacist_id, password });

        // Find Pharmacist in the database
        const pharmacist = await Pharmacist.findOne({ where: { pharmacist_id } });

        console.log('Database Query Result:', pharmacist);

        if (!pharmacist) {
            console.log('Pharmacist Not Found');
            return res.redirect('/pharmacist_signin?error=Invalid%20credentials');
        }

        const passwordMatch = password === pharmacist.password;
        console.log('Password Match:', passwordMatch);

        if (passwordMatch) {
            req.session.pharmacistId = pharmacist.pharmacist_id;
            req.session.userType = 'pharmacist';
            res.redirect('/pharmacist_dashboard');
        } else {
            console.log('Incorrect Password');
            res.redirect('/pharmacist_signin?error=Invalid%20credentials');
        }
    } catch (error) {
        console.error('Error during pharmacist login:', error);
        res.redirect('/pharmacist_signin?error=An%20error%20occurred');
    }
});

// Pharmacist Dashboard route
app.get('/pharmacist_dashboard', isPharmacist, async (req, res) => {
    try {
        const pharmacist = await Pharmacist.findByPk(req.session.pharmacistId);

        if (!pharmacist) {
            req.session.destroy();
            return res.redirect('/pharmacist_signin');
        }

        res.sendFile(path.join(__dirname, 'public', 'pharmacist_dashboard.html'));
    } catch (error) {
        console.error('Error fetching pharmacist details:', error);
        res.status(500).send('Server error');
    }
});

// Pharmacist Dashboard Data Fetch Route
app.post('/pharmacist_dashboard_data', isPharmacist, async (req, res) => {
    try {
        const pharmacist = await Pharmacist.findByPk(req.session.pharmacistId);

        if (!pharmacist) {
            return res.json({ error: 'Pharmacist data not found' });
        }

        // Return all required fields
        res.json({ 
            pharmacist: {
                pharmacist_id: pharmacist.pharmacist_id,
                name: pharmacist.pharmacist_name,   // Fixed field name
                email: pharmacist.email_id,        // Fixed field name
                phone: pharmacist.mobile_number,   // Fixed field name
                license_number: pharmacist.license_number,  // Added field
                aadhaar_number: pharmacist.aadhaar_number  // Added field
            }
        });
    } catch (error) {
        console.error('Error fetching pharmacist details:', error);
        res.json({ error: 'An error occurred while fetching pharmacist details' });
    }
});










// The server is already started in the initializeDatabase function
// No need for additional server startup code here
