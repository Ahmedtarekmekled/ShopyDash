export const AR = {
  // App
  app: {
    name: "سوق أبو حمص",
    tagline: "تسوق محلي سهل وسريع",
    description: "منصة التسوق المحلية الأولى في المنطقة",
  },

  // Navigation
  nav: {
    home: "الرئيسية",
    categories: "التصنيفات",
    shops: "المتاجر",
    products: "المنتجات",
    cart: "السلة",
    account: "حسابي",
    orders: "طلباتي",
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    logout: "تسجيل الخروج",
  },

  // Auth
  auth: {
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور",
    fullName: "الاسم الكامل",
    phone: "رقم الهاتف",
    forgotPassword: "نسيت كلمة المرور؟",
    noAccount: "ليس لديك حساب؟",
    hasAccount: "لديك حساب بالفعل؟",
    registerNow: "سجل الآن",
    loginNow: "سجل دخولك",
    orContinueWith: "أو المتابعة عبر",
    loginSuccess: "تم تسجيل الدخول بنجاح",
    registerSuccess: "تم إنشاء الحساب بنجاح",
    logoutSuccess: "تم تسجيل الخروج بنجاح",
  },

  // Categories
  categories: {
    title: "التصنيفات",
    all: "جميع التصنيفات",
    electronics: "إلكترونيات",
    dairy: "ألبان ومنتجات ألبان",
    vegetables: "خضروات وفواكه",
    meat: "لحوم ودواجن",
    beverages: "مشروبات",
    cleaning: "منظفات",
    household: "مستلزمات منزلية",
    bakery: "مخبوزات",
    frozen: "مجمدات",
    personal: "عناية شخصية",
  },

  // Products
  products: {
    title: "المنتجات",
    all: "جميع المنتجات",
    featured: "منتجات مميزة",
    new: "وصل حديثاً",
    offers: "عروض خاصة",
    search: "ابحث عن منتج...",
    noResults: "لم يتم العثور على منتجات",
    addToCart: "أضف إلى السلة",
    outOfStock: "غير متوفر",
    inStock: "متوفر",
    unit: "الوحدة",
    price: "السعر",
    quantity: "الكمية",
    description: "الوصف",
    details: "التفاصيل",
    related: "منتجات ذات صلة",
  },

  // Shops
  shops: {
    title: "المتاجر",
    all: "جميع المتاجر",
    featured: "متاجر مميزة",
    open: "مفتوح",
    closed: "مغلق",
    rating: "التقييم",
    orders: "طلب",
    products: "منتج",
    viewShop: "زيارة المتجر",
    noShops: "لم يتم العثور على متاجر",
    pending: "قيد المراجعة",
    approved: "معتمد",
    rejected: "مرفوض",
  },

  // Cart
  cart: {
    title: "سلة التسوق",
    empty: "سلة التسوق فارغة",
    emptyDescription: "ابدأ بإضافة منتجات إلى سلتك",
    startShopping: "ابدأ التسوق",
    subtotal: "المجموع الفرعي",
    deliveryFee: "رسوم التوصيل",
    total: "الإجمالي",
    checkout: "إتمام الطلب",
    continueShopping: "متابعة التسوق",
    remove: "إزالة",
    update: "تحديث",
    itemAdded: "تمت إضافة المنتج إلى السلة",
    itemRemoved: "تم إزالة المنتج من السلة",
  },

  // Checkout
  checkout: {
    title: "إتمام الطلب",
    deliveryInfo: "معلومات التوصيل",
    address: "العنوان",
    addressPlaceholder: "أدخل عنوان التوصيل بالتفصيل",
    phone: "رقم الهاتف",
    notes: "ملاحظات",
    notesPlaceholder: "أي ملاحظات إضافية للطلب",
    paymentMethod: "طريقة الدفع",
    cashOnDelivery: "الدفع عند الاستلام",
    orderSummary: "ملخص الطلب",
    placeOrder: "تأكيد الطلب",
    processing: "جاري معالجة الطلب...",
    success: "تم إنشاء الطلب بنجاح",
    orderNumber: "رقم الطلب",
  },

  // Orders
  orders: {
    title: "طلباتي",
    empty: "لا توجد طلبات",
    emptyDescription: "لم تقم بأي طلبات بعد",
    orderNumber: "رقم الطلب",
    date: "التاريخ",
    status: "الحالة",
    total: "الإجمالي",
    items: "المنتجات",
    viewDetails: "عرض التفاصيل",
    trackOrder: "تتبع الطلب",
    reorder: "إعادة الطلب",
    cancelOrder: "إلغاء الطلب",
    cancelConfirm: "هل أنت متأكد من إلغاء الطلب؟",
  },

  // Order Status
  orderStatus: {
    PLACED: "تم استلام الطلب",
    CONFIRMED: "تم تأكيد الطلب",
    PREPARING: "جاري التجهيز",
    READY: "جاهز للاستلام",
    PICKED_UP: "مع المندوب",
    OUT_FOR_DELIVERY: "في الطريق",
    DELIVERED: "تم التسليم",
    CANCELLED: "تم الإلغاء",
  },

  // Shop Owner Dashboard
  dashboard: {
    title: "لوحة التحكم",
    overview: "نظرة عامة",
    products: "إدارة المنتجات",
    orders: "الطلبات",
    settings: "إعدادات المتجر",
    analytics: "الإحصائيات",

    // Stats
    totalOrders: "إجمالي الطلبات",
    totalRevenue: "إجمالي الإيرادات",
    totalProducts: "إجمالي المنتجات",
    pendingOrders: "طلبات معلقة",

    // Products
    addProduct: "إضافة منتج",
    editProduct: "تعديل المنتج",
    deleteProduct: "حذف المنتج",
    deleteConfirm: "هل أنت متأكد من حذف هذا المنتج؟",
    productName: "اسم المنتج",
    productPrice: "السعر",
    productCategory: "التصنيف",
    productDescription: "الوصف",
    productStock: "المخزون",
    productImage: "صورة المنتج",
    productSaved: "تم حفظ المنتج بنجاح",
    productDeleted: "تم حذف المنتج بنجاح",

    // Orders
    newOrders: "طلبات جديدة",
    updateStatus: "تحديث الحالة",
    statusUpdated: "تم تحديث حالة الطلب",
  },

  // Admin
  admin: {
    title: "لوحة الإدارة",
    shops: "إدارة المتاجر",
    categories: "إدارة التصنيفات",
    regions: "إدارة المناطق",
    users: "إدارة المستخدمين",

    // Shops
    approveShop: "قبول المتجر",
    rejectShop: "رفض المتجر",
    suspendShop: "تعليق المتجر",
    shopApproved: "تم قبول المتجر",
    shopRejected: "تم رفض المتجر",

    // Categories
    addCategory: "إضافة تصنيف",
    editCategory: "تعديل التصنيف",
    deleteCategory: "حذف التصنيف",
    categoryName: "اسم التصنيف",
    categorySaved: "تم حفظ التصنيف",

    // Regions
    addRegion: "إضافة منطقة",
    editRegion: "تعديل المنطقة",
    deleteRegion: "حذف المنطقة",
    regionName: "اسم المنطقة",
    regionSaved: "تم حفظ المنطقة",
  },

  // Common
  common: {
    loading: "جاري التحميل...",
    error: "حدث خطأ",
    retry: "إعادة المحاولة",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    add: "إضافة",
    search: "بحث",
    filter: "تصفية",
    sort: "ترتيب",
    all: "الكل",
    yes: "نعم",
    no: "لا",
    confirm: "تأكيد",
    back: "رجوع",
    next: "التالي",
    previous: "السابق",
    viewAll: "عرض الكل",
    more: "المزيد",
    less: "أقل",
    close: "إغلاق",
    open: "فتح",
    required: "مطلوب",
    optional: "اختياري",
    noData: "لا توجد بيانات",
    selectOption: "اختر...",
  },

  // Validation
  validation: {
    required: "هذا الحقل مطلوب",
    email: "البريد الإلكتروني غير صالح",
    minLength: "يجب أن يكون على الأقل {min} حروف",
    maxLength: "يجب أن لا يتجاوز {max} حروف",
    passwordMatch: "كلمات المرور غير متطابقة",
    phone: "رقم الهاتف غير صالح",
    number: "يجب أن يكون رقم صحيح",
    positive: "يجب أن يكون رقم موجب",
  },

  // Footer
  footer: {
    about: "عن سوق أبو حمص",
    aboutText:
      "منصة التسوق المحلية الأولى في المنطقة. نربط بين المتاجر المحلية والعملاء لتوفير تجربة تسوق سهلة وسريعة.",
    quickLinks: "روابط سريعة",
    contact: "تواصل معنا",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    address: "العنوان",
    followUs: "تابعنا",
    rights: "جميع الحقوق محفوظة",
  },
};

export type TranslationKey = keyof typeof AR;
