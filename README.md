# MarketHub Backend API

Express.js + MongoDB backend for the MarketHub marketplace application.

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
MONGODB_URI=mongodb://localhost:27017/markethub
PORT=5001
NODE_ENV=development
JWT_SECRET=your_secret_key_here
CORS_ORIGIN=http://localhost:3000
```

### 3. Start the Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will start on `http://localhost:5000`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (vendors)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

**Query Parameters:**
- `category` - Filter by category
- `service` - Filter by service (shopping, hotels, food, etc.)
- `page` - Pagination (default: 1)
- `limit` - Items per page (default: 10)
- `search` - Text search

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get all orders (with pagination)
- `GET /api/orders/:id` - Get order by ID
- `GET /api/orders/customer/:customerId` - Get customer orders
- `PUT /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Delete order

## 📊 Database Models

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  address: Object,
  profileImage: String,
  userType: String (customer|vendor|admin),
  isVerified: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Product
```javascript
{
  name: String,
  description: String,
  price: Number,
  originalPrice: Number,
  category: String,
  service: String,
  image: String,
  images: Array,
  rating: Number,
  reviews: Number,
  stock: Number,
  vendor: ObjectId (ref: User),
  features: Array,
  specifications: Object,
  inStock: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Order
```javascript
{
  orderId: String (unique),
  customer: ObjectId (ref: User),
  items: Array,
  totalAmount: Number,
  tax: Number,
  shippingCost: Number,
  discount: Number,
  paymentMethod: String,
  paymentStatus: String,
  orderStatus: String,
  shippingAddress: Object,
  trackingNumber: String,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔌 Connect Frontend to Backend

In your Angular app, update the API base URL in services:

```typescript
import { HttpClient } from '@angular/common/http';

export class ApiService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  getProducts(filters = {}) {
    return this.http.get(`${this.apiUrl}/products`, { params: filters });
  }

  login(email: string, password: string) {
    return this.http.post(`${this.apiUrl}/auth/login`, { email, password });
  }
}
```

## 🌱 Sample API Calls

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get Products
```bash
curl http://localhost:5000/api/products?service=shopping&page=1&limit=10
```

### Create Order
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer": "user_id_here",
    "items": [
      {
        "product": "product_id_here",
        "quantity": 2,
        "price": 49.99,
        "subtotal": 99.98
      }
    ],
    "totalAmount": 99.98,
    "paymentMethod": "credit-card",
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    }
  }'
```

## 🧪 Health Check

```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "Backend is running",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── models/
│   ├── User.js              # User schema
│   ├── Product.js           # Product schema
│   └── Order.js             # Order schema
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── products.js          # Product endpoints
│   ├── users.js             # User endpoints
│   └── orders.js            # Order endpoints
├── .env.example             # Environment variables template
├── server.js                # Main server file
├── package.json             # Dependencies
└── README.md                # This file
```

## 🔐 Security Considerations

- Passwords are hashed using bcryptjs
- JWTs are used for authentication
- Environment variables for sensitive data
- CORS is configured for frontend origin
- Input validation on all endpoints
- MongoDB injection prevention with Mongoose

## 🚨 Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description here"
}
```

## 📞 Support

For issues or questions, check the main project README or create an issue in the repository.

## 📄 License

ISC
