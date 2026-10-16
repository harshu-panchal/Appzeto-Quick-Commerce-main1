import User from "../../models/customer.js";
import Seller from "../../models/seller.js";
import Delivery from "../../models/delivery.js";
import Order from "../../models/order.js";
import Product from "../../models/product.js";

const DASHBOARD_CATEGORY_COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444"];

/** "+12.3%" style change between two periods; null when there is nothing to compare. */
function percentChange(current, previous) {
  if (!previous) return current > 0 ? "+100%" : null;
  const p = ((current - previous) / previous) * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
}

export async function getAdminDashboardStats() {
  const [totalCustomers, totalSellers, totalRiders, totalOrders] =
    await Promise.all([
      User.countDocuments({ role: "user" }),
      Seller.countDocuments(),
      Delivery.countDocuments(),
      Order.countDocuments(),
    ]);

  const totalUsers = totalCustomers;
  const activeSellers = await Seller.countDocuments({ isVerified: true });

  // last 30 days vs the 30 before, for the KPI trend badges (these used to be
  // fixed numbers)
  const DAY = 24 * 60 * 60 * 1000;
  const since30 = new Date(Date.now() - 30 * DAY);
  const since60 = new Date(Date.now() - 60 * DAY);
  const windowCount = (Model, filter = {}) =>
    Promise.all([
      Model.countDocuments({ ...filter, createdAt: { $gte: since30 } }),
      Model.countDocuments({ ...filter, createdAt: { $gte: since60, $lt: since30 } }),
    ]);
  const windowRevenue = async (from, to) =>
    (await Order.aggregate([
      { $match: { status: "delivered", createdAt: { $gte: from, $lt: to } } },
      { $group: { _id: null, total: { $sum: "$pricing.total" } } },
    ]))[0]?.total || 0;
  const [[newUsers, prevUsers], [newSellers, prevSellers], [orders30, ordersPrev30], revenue30, revenuePrev30, totalProducts] =
    await Promise.all([
      windowCount(User, { role: "user" }),
      windowCount(Seller),
      windowCount(Order),
      windowRevenue(since30, new Date()),
      windowRevenue(since60, since30),
      Product.countDocuments(),
    ]);

  const revenueData = await Order.aggregate([
    { $match: { status: "delivered" } },
    { $group: { _id: null, total: { $sum: "$pricing.total" } } },
  ]);
  const totalRevenue = revenueData[0]?.total || 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const historyAggregation = await Order.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo }, status: "delivered" } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        revenue: { $sum: "$pricing.total" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Create a map of existing revenue data
  const revenueMap = new Map(historyAggregation.map(item => [item._id, item.revenue]));
  
  // Fill in the last 30 days with 0 where no data exists
  const revenueHistory = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    revenueHistory.push({
      name: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      revenue: revenueMap.get(dateStr) || 0,
      fullDate: dateStr
    });
  }

  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("customer", "name");

  const categoryData = await Product.aggregate([
    { $group: { _id: "$headerId", count: { $sum: 1 } } },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
    { $project: { name: "$category.name", value: "$count" } },
    { $limit: 4 },
  ]);

  const topProducts = await Order.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        sales: { $sum: "$items.quantity" },
        revenue: {
          $sum: { $multiply: ["$items.quantity", "$items.price"] },
        },
      },
    },
    { $sort: { sales: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $project: {
        name: "$product.name",
        sales: 1,
        rev: "$revenue",
        image: "$product.mainImage",
      },
    },
  ]);

  return {
    overview: {
      totalUsers,
      activeSellers,
      totalOrders,
      totalRevenue,
      totalProducts,
      trends: {
        users: percentChange(newUsers, prevUsers),
        sellers: percentChange(newSellers, prevSellers),
        orders: percentChange(orders30, ordersPrev30),
        revenue: percentChange(revenue30, revenuePrev30),
      },
      newUsers30: newUsers,
      orders30,
    },
    revenueHistory,
    recentOrders: recentOrders.map((order) => ({
      id: order.orderId,
      customer: order.customer?.name || "Guest",
      statusText: order.status,
      status:
        order.status === "delivered"
          ? "success"
          : order.status === "cancelled"
            ? "error"
            : "warning",
      amount: `\u20B9${order.pricing.total}`,
      time: order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }) : "Recently",
    })),
    categoryData: categoryData.map((category, index) => ({
      ...category,
      color: DASHBOARD_CATEGORY_COLORS[index % DASHBOARD_CATEGORY_COLORS.length],
    })),
    topProducts: topProducts.map((product) => ({
      name: product.name,
      sales: product.sales,
      rev: `\u20B9${product.rev.toFixed(2)}`,
      cat: "Product",
      image: product.image,
      icon: "\u{1F4E6}", // Fallback package icon
      color: "bg-blue-50 text-blue-600",
    })),
  };
}
