# SmartClass AI Dashboard 🚀

A modern, premium SaaS dashboard for intelligent classroom monitoring, built with React, Tailwind CSS, shadcn/ui, and Framer Motion.

## 🏗️ Project Structure

- `smartclass-frontend/`: React + Vite application (Frontend)
- `smartclass-backend/`: Node.js + Express mock server (Backend)

---

## 🚀 Getting Started

To run the full application, you need to start both the backend and the frontend servers.

### 1. Start the Backend Server
The backend handles authentication and provides mock data for students, attendance, and engagement.

```bash
cd smartclass-backend
npm install
npm start
```
*The backend will run on `http://localhost:5000`*

### 2. Start the Frontend Application
The frontend is the main dashboard interface.

```bash
cd smartclass-frontend
npm install
npm run dev
```
*The frontend will run on `http://localhost:5173` (or the next available port)*

---

## 🔐 Mock Credentials

Use these credentials to explore the different dashboard roles:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `pass` |
| **Teacher** | `teacher@example.com` | `pass` |
| **Parent** | `parent@example.com` | `pass` |

---

## ✨ Features

- **Premium UI**: Modern dark/light mode support with a clean, Apple-like aesthetic.
- **Micro-Animations**: Smooth transitions and interactive elements using `framer-motion`.
- **Advanced Visualization**: Interactive charts for attendance and engagement trends.
- **Live Monitoring**: Real-time simulation of classroom activity.
- **Role-Based Access**: Dedicated portals for Admins, Teachers, and Parents.
- **Responsive Design**: Fully optimized for mobile, tablet, and desktop views.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui + Radix UI
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Backend**: Express.js
