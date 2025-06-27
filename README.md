# HealthSync - Medical Management System

HealthSync is a comprehensive medical management system designed to streamline healthcare operations, patient management, and medical record-keeping.

## Features

- **Multi-role Access Control**
  - Admin: Full system access and user management
  - Doctors: Patient consultation and medical records
  - Pharmacists: Medication and prescription management
  - Patients: Access to personal health records

- **Patient Management**
  - Complete patient profiles
  - Medical history tracking
  - Appointment scheduling
  - Consultation records

- **Doctor Portal**
  - Patient lookup
  - Medical record management
  - Prescription generation
  - Consultation history

- **Pharmacy Module**
  - Medication inventory
  - Prescription processing
  - Patient medication history

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher) or yarn
- MySQL or SQLite database

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/health-sync.git
   cd health-sync
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update database credentials and other settings

4. Initialize the database:
   ```bash
   # For development (SQLite)
   npm run db:reset
   
   # For production (MySQL)
   # Update config/config.json with your database credentials
   npx sequelize-cli db:migrate
   npx sequelize-cli db:seed:all
   ```

5. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. Access the application at `http://localhost:3000`

## Default Admin Credentials

For initial setup, you can log in with the default admin account:

- **Username**: `admin`
- **Password**: `admin123`

**Important**: Change the default password immediately after your first login for security purposes.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=health_sync
SESSION_SECRET=your_session_secret
```

## Docker Support

You can run the application using Docker Compose:

### Starting the Application

```bash
# Build and start the containers in detached mode
docker-compose up -d --build

# View logs (follow mode)
docker-compose logs -f

# View logs for a specific service
docker-compose logs -f web  # or 'db' for database logs
```

### Stopping the Application

```bash
# Stop all running containers (keeps data)
docker-compose down

# Stop and remove all containers, networks, and volumes
# WARNING: This will delete all data in the database
docker-compose down -v
```

### Managing Containers

```bash
# List all running containers
docker ps

# List all containers (including stopped ones)
docker ps -a

# Stop a specific container
docker stop <container_id>

# Remove a specific container
docker rm <container_id>

# Force remove a running container
docker rm -f <container_id>
```

### Cleaning Up

```bash
# Remove all stopped containers
docker container prune

# Remove unused networks
docker network prune

# Remove all unused containers, networks, and images
docker system prune

# Remove all unused containers, networks, images, and volumes
docker system prune --volumes
```

### Database Management

```bash
# Access database shell
docker-compose exec db mysql -u root -p

# Backup database to a file
docker-compose exec -T db mysqldump -u root -p$MYSQL_ROOT_PASSWORD $MYSQL_DATABASE > backup.sql

# Restore database from a file
cat backup.sql | docker-compose exec -T db mysql -u root -p$MYSQL_ROOT_PASSWORD $MYSQL_DATABASE
```

## API Documentation

API documentation is available at `/api-docs` when running in development mode.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository.
