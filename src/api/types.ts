// 对应官网 /api/v1/providers 返回的字段
// 注意：API 返回 camelCase，不是 snake_case
export interface Provider {
  id: number;
  companyName: string;
  city: string;
  province?: string;
  description?: string;
  serviceTypes?: string; // JSON 数组字符串
  priceQuotes?: unknown; // 价格报价（JSON）
  rating?: number;
  orderCount?: number;
  reviewCount?: number;
  successRate?: number;
  isVerified?: boolean;
  status?: string;
  membershipLevel?: string;
  hasDeposit?: boolean;
  depositAmount?: number;
  certImages?: string[];
  licenseImage?: string;
  slogan?: string;
  website?: string;
  foundedYear?: number;
  employeeCount?: number;
  // AI 评分字段（camelCase，与 API 一致）
  aiMatchScoreOverall?: number;
  aiMatchScoreIndustry?: number;
  aiMatchScoreRegion?: number;
  aiMatchScoreCapability?: number;
}

// 对应官网 /api/v1/providers/{id}/reviews
export interface Review {
  id: number;
  providerId: number;
  rating: number;
  content: string;
  serviceType?: string;
  userName?: string;
  createdAt: string;
}

// 对应官网 /api/v1/categories
export interface Category {
  id: number;
  parentId?: number;
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// 对应官网 POST /api/v1/open/demands
export interface CreateDemandInput {
  title: string;
  city?: string;
  source?: string;
  description?: string;
  contact?: string;
  contactPhone?: string;
  categoryId?: number;
  categoryName?: string;
  accessSecret?: string;
  callbackUrl?: string;
}

export interface CreateDemandResult {
  id: number;
  notifiedCount: number;
}
