# Bitespeed Identity Reconciliation

A web service that identifies and links customer contacts across multiple purchases using shared email or phone number.

## Live Endpoint

POST https://bitespeed-identity-w88y.onrender.com/identify

## API

### POST /identify

Identifies a customer across purchases using email or phone number and returns the consolidated contact information.

Request:
{
  "email": "user@example.com",
  "phoneNumber": "1234567890"
}

Response:
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["primary@example.com", "secondary@example.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": [2, 3]
  }
}

## Local Setup

npm install
cp .env.example .env
# add your DATABASE_URL in .env
npm run dev

## Tech Stack

- Node.js
- TypeScript
- Express
