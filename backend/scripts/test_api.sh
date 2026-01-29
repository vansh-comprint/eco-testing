#!/bin/bash

# EcoTribe API Test Script
# Tests basic authentication and endpoints

BASE_URL="http://localhost:8000"
API_URL="${BASE_URL}/api/v1"

echo "🧪 Testing EcoTribe API"
echo "======================="
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Check..."
curl -s "${BASE_URL}/health" | jq '.'
echo ""

# Test 2: Login as Super Admin
echo "2️⃣  Testing Login (Super Admin)..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@ecotribe.io",
    "password": "password123"
  }')

echo "$LOGIN_RESPONSE" | jq '.'

# Extract access token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.access_token')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Login failed! Cannot proceed with authenticated tests."
  exit 1
fi

echo "✅ Login successful! Access token obtained."
echo ""

# Test 3: Get Current User
echo "3️⃣  Testing Get Current User..."
curl -s "${API_URL}/auth/me" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq '.'
echo ""

# Test 4: List Users
echo "4️⃣  Testing List Users..."
curl -s "${API_URL}/users" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq '.'
echo ""

# Test 5: List Enterprises
echo "5️⃣  Testing List Enterprises..."
curl -s "${API_URL}/enterprises" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq '.'
echo ""

echo "✅ API tests completed!"

