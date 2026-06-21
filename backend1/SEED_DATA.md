# Delivery Services Seed Data

## Overview
Successfully seeded **10 delivery services** from **3 delivery providers** into MongoDB.

## Delivery Providers Created

### 1. FastDelivery Pro
- **ID**: `69ad7b9f861389d4c05cd022`
- **Status**: Active & Verified
- **Coverage**: New York, Los Angeles
- **Specialties**: Fast, affordable delivery for food and retail
- **Services**: 3
  - Express Food Delivery ($5 base + $1.50/km)
  - Retail Shop Delivery ($3.50 base + $1/km)
  - Quick Package Delivery ($4 base + $0.80/km)

### 2. Express Courier Network
- **ID**: `69ad7b9f861389d4c05cd025`
- **Status**: Active & Verified
- **Coverage**: Chicago, Houston
- **Specialties**: Premium furniture and fragile items
- **Services**: 3
  - Premium Furniture Delivery ($25 base + $3/km)
  - Electronics Safe Delivery ($10 base + $2/km)
  - Business Courier ($6 base + $1.20/km)

### 3. ColdChain Logistics
- **ID**: `69ad7b9f861389d4c05cd028`
- **Status**: Active & Verified
- **Coverage**: Miami, Phoenix
- **Specialties**: Temperature-controlled deliveries
- **Services**: 4
  - Cold Food Delivery ($8 base + $2/km)
  - Pharmacy Safe Delivery ($6 base + $1.50/km)
  - Premium Grocery Delivery ($5.50 base + $1.20/km)
  - Perishable Goods Delivery ($10 base + $2.50/km)

## Services by Category

| Category | Count | Examples |
|----------|-------|----------|
| Food | 2 | Express Food Delivery, Cold Food Delivery |
| Retail | 1 | Retail Shop Delivery |
| Packages | 3 | Quick Package, Electronics Safe, Business Courier |
| Furniture | 1 | Premium Furniture Delivery |
| Pharmacy | 1 | Pharmacy Safe Delivery |
| Grocery | 1 | Premium Grocery Delivery |
| Perishable | 1 | Perishable Goods Delivery |

## API Endpoints to Test

### Get all services for a provider
```
GET /delivery-providers/{providerId}/services
```

### Search services
```
GET /delivery-providers/search?query=Food&category=food
```

### Get services by category
```
GET /delivery-providers/category/food
GET /delivery-providers/category/retail
GET /delivery-providers/category/furniture
```

## Testing the Frontend

To test in the delivery dashboard:

1. **Navigate to**: `/delivery-dashboard`
2. **Click**: "My Services" in the sidebar
3. **Current behavior**: Shows "No services added yet" because the logged-in user's deliveryId doesn't match any provider ID

## Next Steps for Integration

To display the seeded services in the UI, you need to:

1. **Option A**: Use one of the provider IDs above in the frontend
   - Store the provider ID in localStorage as `deliveryId`
   - Restart the app

2. **Option B**: Create a delivery provider user
   - Register as a delivery provider with email/password
   - The system will assign a deliveryId
   - That user can then see/add services

3. **Option C**: Mock data display
   - Update the frontend to accept a test provider ID
   - Make test API calls to see the data

## Sample Service Data Structure

```json
{
  "_id": "ObjectId",
  "providerId": "ObjectId",
  "name": "Express Food Delivery",
  "category": "food",
  "description": "Fast delivery for restaurants",
  "basePrice": 5.00,
  "perKmRate": 1.50,
  "perKgRate": 0.50,
  "estimatedDeliveryTime": 30,
  "maxDistance": 25,
  "maxWeight": 30,
  "features": {
    "realTimeTracking": true,
    "insurance": true,
    "temperature_control": false,
    "signature_required": false,
    "scheduled_delivery": true
  },
  "coverage": ["New York", "Los Angeles"],
  "isActive": true,
  "stats": {
    "totalOrders": 0,
    "successfulOrders": 0,
    "averageRating": 0,
    "successRate": 100
  }
}
```

## Running the Seed Script Again

To re-seed the data:
```bash
cd backend
node functions/scripts/seedDeliveryServices.js
```

This will clear existing services and create fresh data with new IDs.
