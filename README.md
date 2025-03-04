# Korpor Node.js Backend - Crafted with Love by Assil Khaldi ☕


This repository contains a Node.js Express backend that provides authentication, user management, and role-based access control. 
It also integrates with Cloudinary for image uploads and includes Swagger for API documentation.

## Table of Contents

1. [Project Structure](#project-structure)  
2. [Prerequisites](#prerequisites)  
3. [Installation](#installation)  
4. [Environment Variables](#environment-variables)  
5. [Running the Server](#running-the-server)  
6. [API Endpoints](#api-endpoints)  
7. [Using the API from a Frontend](#using-the-api-from-a-frontend)  
8. [Swagger API Documentation](#swagger-api-documentation)  
9. [Additional Notes](#additional-notes)  

---

## Project Structure



=======




- **src/**
   - **controllers/**
       - `adminController.js`
       - `roleController.js`
       - `authController.js`
       - `userController.js`
  
   - **middleware/**
       - `auth.js`

   - **models/**
       - `Role.js`
       - `User.js`

  - **routes/**
       - `adminRoutes.js`
       - `authRoutes.js`.
       - `roleRoutes.js`
       - `userRoutes.js`


- **swaggerConfig.js**

- **server.js**

- **.env**

- **.gitignore**

- **package.json**

- **package-lock.json**

- **README.md**



---



- **controllers/**: Contains the business logic for each resource (admin, auth, roles, users, etc.).  
- **middleware/**: Houses middleware for authentication and role-based checks.  
- **models/**: Mongoose models for `User` and `Role`.  
- **routes/**: Defines the Express routes for each resource.  
- **swaggerConfig.js**: Sets up Swagger documentation.  
- **server.js**: Entry point of the application (starts the Express server).  

---

## Prerequisites

- **Node.js**: v16+ (or v18+) recommended.  
- **npm**: v8+ recommended (usually comes with Node.js).  
- **MongoDB**: A MongoDB instance or MongoDB Atlas connection string.  
- **Cloudinary Account**: For handling profile picture uploads


You will also need to create a `.env` file in the root of the project with your environment variables (details in [Environment Variables](#environment-variables) section).

---

## Installation

1. **Clone the repository** (or download it)  
   ```bash

  

   'git clone https://github.com/Assil10/korpor-back/'

   cd your-repo




**Install dependencies**

         'npm install'





**env file**
    
    MONGO_URI=your-mongodb-uri
    JWT_SECRET=your_jwt_secret
    CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
    CLOUDINARY_API_KEY=your_cloudinary_api_key
    CLOUDINARY_API_SECRET=your_cloudinary_api_secret
    EMAIL_USER=your_email_username
    EMAIL_PASS=your_email_password
    PORT=5000




 **Running the Server**

     'npm run dev'




 **API Endpoints**

Authentication (/api/auth)
POST /api/auth/register
Register a new user.
Body: { name, surname, email, password, birthdate }

POST /api/auth/login
Login for approved users.
Body: { email, password }

POST /api/auth/forgot-password
Request a password reset (sends a verification code).
Body: { email }

POST /api/auth/verify-code
Verify the password reset code.
Body: { email, code }

POST /api/auth/reset-password
Reset the user's password using the verification code.
Body: { email, code, newPassword }

User (/api/user)
GET /api/user/profile
Retrieve the authenticated user's profile.

POST /api/user/upload-profile-picture
Upload or update the user's profile picture.
Form Data: profilePicture (binary file)

Admin (`/api/admin)
GET /api/admin/registration-requests
Retrieve pending registration requests.

POST /api/admin/approve-user/:id
Approve a user registration and assign a role.
Body: { role }

POST /api/admin/reject-user/:id
Reject a user registration.

GET /api/admin/users
Retrieve all users.

GET /api/admin/users/:id
Retrieve a specific user's details.

POST /api/admin/users
Create a new user directly (approved).
Body: { name, surname, email, password, birthdate, role }

PUT /api/admin/users/:id
Update a user's details.

DELETE /api/admin/users/:id
Delete a user.

Role Management (/api/roles)
GET /api/roles
Retrieve all roles.

GET /api/roles/:id
Retrieve a specific role by its ID.

POST /api/roles
Create a new role.
Body: { name, privileges }

PUT /api/roles/:id
Update an existing role.

DELETE /api/roles/:id
Delete a role.




**Using the API from a Frontend**

The backend exposes a RESTful API. Frontend developers can interact with it by sending HTTP requests 
to the endpoints described above. Make sure to include the JWT token in the Authorization header for protected routes, for example

Authorization: Bearer <your-jwt-token>





**Swagger API Documentation**

The project uses Swagger for API documentation. Once the server is running, you can view the interactive documentation at: [http://localhost:5000/api-docs]





**Additional Notes**

-Authentication Middleware:
The middleware in src/middleware/auth.js handles JWT verification and role/privilege checks.

-Cloudinary Integration:
Cloudinary is used for handling image uploads. The configuration is set in src/server.js and used in userController.js.

-Default Role Initialization:
Default roles are initialized automatically when MongoDB connects (via the initializeDefaultRoles function in src/controllers/roleController.js).

-Error Handling:
The API returns standardized error messages and HTTP status codes for easier debugging and integration.

-Contributing:
Pull requests, issues, and feature requests are welcome. Please follow the existing code style and document your changes.






---

## Instructions to Run the Project

1. **Clone the repository** and navigate to its directory.
2. **Create a `.env` file** in the root with the necessary environment variables (see above).
3. **Install dependencies** with `npm install`.
4. **Start the server** with `npm run dev`.
5. **Access the API documentation** at `http://localhost:5000/api-docs`.



