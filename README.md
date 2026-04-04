# 🛒 ShopyDash Marketplace

![ShopyDash Logo](./public/logo.png)

A modern, full-featured multi-vendor marketplace platform built with **React**, **TypeScript**, and **Supabase**. ShopyDash provides a seamless experience for customers to browse shops, and a powerful dashboard for shop owners to manage their business.

[Visit ShopyDash](https://www.shopydash.store/)

---

## 🚀 Key Features

### 👤 Customer Experience
- **Multi-Store Shopping**: Browse multiple shops and add products from different vendors to a single unified cart.
- **Smart Checkout**: Authoritative calculation of platform fees, delivery fees, and discounts across multiple sub-orders.
- **Order Tracking**: Real-time status updates from "Placed" to "Delivered".
- **Responsive UI**: A premium, mobile-first design optimized for all devices using Tailwind CSS and Radix UI.
- **Map Integration**: Visualizing shop locations and delivery points using Leaflet.

### 🏪 Shop Owner Dashboard
- **Inventory Management**: Track stock levels, manage product categories, and toggle product visibility.
- **Order Processing**: Advanced workflow for confirming, preparing, and handing over orders.
- **Live Monitoring (Kiosk Mode)**: Auto-refreshing dashboard for kitchen or counter staff to track incoming orders.
- **Financial Analytics**: Visualize sales performance and metrics with interactive Recharts.
- **Flexible Settings**: Manage shop status (Open/Closed), working hours, and delivery configurations.

### 🚚 Delivery & Logistics
- **Driver Management**: System for assigning drivers to orders and tracking delivery progress.
- **Earnings Tracking**: Real-time calculation of monthly earnings and delivery statistics for drivers.
- **GPS Integration**: Precise location tracking for efficient delivery routing.

---

## 🛠️ Tech Stack

- **Frontend**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **State Management**: [TanStack Query (React Query)](https://tanstack.com/query/latest)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Maps**: [React Leaflet](https://react-leaflet.js.org/)

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A [Supabase](https://supabase.com/) account and project

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Ahmedtarekmekled/shopydash.git
   cd shopydash
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ☁️ Deployment

This project is optimized for deployment on **Vercel**.

1. Connect your GitHub repository to Vercel.
2. Ensure the Framework Preset is set to **Vite**.
3. Add the environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) in the Vercel dashboard.
4. Deploy!

For detailed instructions, see [DEPLOY.md](./DEPLOY.md).

---

## 📝 Database Schema & SQL

The project includes SQL scripts for database initialization, including tables for:
- `shops`, `products`, `categories`
- `orders`, `order_items`, `parent_orders`
- `profiles`, `delivery_settings`, `shop_working_hours`

Refer to the `/sql` and `/supabase` directories for database migrations and RLS policies.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details (if applicable).

---

*Built with ❤️ by [Ahmed Tarek Mekled](https://github.com/Ahmedtarekmekled)*
