# Bonus Management System

## Overview

The Bonus Management System is a comprehensive solution for creating, managing, calculating, approving, and reporting on employee bonuses. This system integrates with your existing MEAN stack application and provides a complete workflow for bonus management.

## Features

- **Template Management**: Create and manage reusable bonus templates with different calculation methods
- **Rule Engine**: Define and apply complex eligibility and adjustment rules
- **Personnel Integration**: Capture employee data snapshots for bonus calculations
- **Workflow Management**: Support for complete bonus lifecycle from creation to payment
- **Allocation Management**: Review and adjust individual bonus allocations
- **Reporting & Dashboard**: Generate detailed reports and visualize key metrics
- **Notification System**: Receive notifications for important bonus events
- **Role-Based Access Control**: Secure access based on user roles

## System Architecture

### Backend (Node.js/Express)

- RESTful API endpoints for all bonus operations
- MongoDB database for data storage
- Modular service architecture
- Secure rule and formula evaluation
- Comprehensive logging and error handling

### Frontend (Angular)

- Responsive UI components for all bonus management functions
- Role-based interface adaptation
- Interactive dashboards and reporting
- Form validation and error handling

## Installation

### Prerequisites

- Node.js (v16.x or later)
- MongoDB (v4.4 or later)
- Angular CLI (v13 or later)
- Git

### Backend Setup

1. Clone the repository:
   ```
   git clone https://github.com/your-org/bonus-management.git
   cd bonus-management/bonus_app_backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   ```
   cp env.template .env.backend
   ```
   Edit `.env.backend` with your specific configuration values.

4. Start the development server:
   ```
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd ../bonus_frontend_app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   ```
   cp env.template .env.frontend
   ```
   Edit `.env.frontend` with your specific configuration values.

4. Start the development server:
   ```
   npm start
   ```

5. Access the application at `http://localhost:4200`

## Configuration

### Backend Configuration

The backend configuration is managed through environment variables. Key configuration options include:

- **Server Settings**: Port, allowed origins, etc.
- **Database Connection**: MongoDB URI
- **Authentication**: JWT secret and expiration
- **Main Application Integration**: API URLs and keys
- **Notification Settings**: Enable/disable notifications
- **Performance Settings**: Batch sizes, timeouts, etc.

See `env.template` for a complete list of configuration options.

### Frontend Configuration

The frontend configuration includes:

- **API Base URL**: URL of the backend API
- **Authentication Settings**: Token storage, security options
- **Feature Flags**: Enable/disable specific features
- **UI Settings**: Pagination, display options, etc.

## Usage Guide

### Template Management

1. Navigate to the Templates section
2. Click "Create Template" to create a new bonus template
3. Fill in the template details:
   - Name and description
   - Calculation method (Fixed, Percentage, Parts-Based, Custom Formula)
   - Calculation parameters
4. Save the template

### Rule Management

1. Navigate to the Rules section
2. Click "Create Rule" to create a new rule
3. Define the rule:
   - Condition (e.g., `personnel.department === "Engineering"`)
   - Action (Include, Exclude, Adjust)
   - Parameters for the action
   - Priority level
4. Save the rule

### Bonus Instance Creation

1. Navigate to the Instances section
2. Click "Create Instance" to create a new bonus instance
3. Select a template
4. Set the reference period and other details
5. Save the instance

### Allocation Generation

1. Open a bonus instance in draft status
2. Click "Generate Allocations"
3. Wait for the generation process to complete
4. Review the generated allocations

### Workflow Management

1. Review allocations and make any necessary adjustments
2. Submit the instance for review
3. Approvers can review and approve or reject the instance
4. Once approved, finance can mark the instance as paid

### Reporting

1. Navigate to the Reporting section
2. Select the report type (Summary or Detailed)
3. Set filters and parameters
4. Generate the report
5. Export to CSV or Excel if needed

## Development Guide

### Project Structure

#### Backend Structure

```
bonus_app_backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   └── server.js        # Entry point
├── tests/               # Test files
├── .env.backend         # Environment variables
└── package.json         # Dependencies
```

#### Frontend Structure

```
bonus_frontend_app/
├── src/
│   ├── app/
│   │   ├── core/        # Core functionality
│   │   ├── features/    # Feature modules
│   │   └── shared/      # Shared components
│   ├── assets/          # Static assets
│   └── environments/    # Environment configs
├── .env.frontend        # Environment variables
└── package.json         # Dependencies
```

### Adding New Features

1. Create backend components:
   - Model: Define the data schema
   - Service: Implement business logic
   - Controller: Handle API requests
   - Routes: Define API endpoints

2. Create frontend components:
   - Service: Connect to API
   - Components: Create UI elements
   - Update routing

3. Add tests for new functionality

### Testing

#### Backend Testing

Run backend tests:
```
cd bonus_app_backend
npm test
```

#### Frontend Testing

Run frontend tests:
```
cd bonus_frontend_app
npm test
```

#### End-to-End Testing

Run end-to-end tests:
```
cd bonus_frontend_app
npm run e2e
```

## Deployment

### Production Build

#### Backend

1. Create production build:
   ```
   cd bonus_app_backend
   npm run build
   ```

2. Start production server:
   ```
   NODE_ENV=production npm start
   ```

#### Frontend

1. Create production build:
   ```
   cd bonus_frontend_app
   npm run build -- --prod
   ```

2. Deploy the contents of the `dist` directory to your web server

### Deployment Scripts

The repository includes deployment scripts for both backend and frontend:

- `bonus_app_backend/deploy.sh`: Deploys the backend application
- `bonus_frontend_app/deploy.sh`: Deploys the frontend application

These scripts handle:
- Building the application
- Creating release directories
- Setting up configuration
- Starting/restarting services
- Configuring web servers

### Environment Variables

For production deployment, create secure environment variable files:

1. Create backend environment file:
   ```
   cp env.template /opt/bonus-management/env/.env.backend
   ```
   Edit with production values.

2. Create frontend environment file:
   ```
   cp env.template /opt/bonus-management/env/.env.frontend
   ```
   Edit with production values.

### Monitoring Setup

The system includes configuration for comprehensive monitoring:

- Prometheus for metrics collection
- Grafana for dashboards and visualization
- ELK Stack for log aggregation
- APM for application performance monitoring

See `monitoring-config.yml` for detailed configuration.

## Troubleshooting

### Common Issues

1. **Connection Issues**:
   - Check MongoDB connection string
   - Verify network connectivity
   - Check for firewall restrictions

2. **Authentication Problems**:
   - Verify JWT secret is consistent
   - Check token expiration settings
   - Ensure cookies are properly configured

3. **Performance Issues**:
   - Check database indexes
   - Review batch size settings
   - Monitor memory usage

### Logs

- Backend logs are located in `/var/log/bonus-app/`
- Frontend logs can be viewed in the browser console
- Production logs are aggregated in Elasticsearch

## Support

For issues or questions, please contact:
- Email: support@example.com
- Issue Tracker: https://github.com/your-org/bonus-management/issues

## License

This project is licensed under the MIT License - see the LICENSE file for details.
