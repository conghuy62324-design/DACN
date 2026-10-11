import { Op } from 'sequelize';

export interface PageQuery { page?: number; limit?: number; search?: string; status?: string; sort?: string; }
export function pageOptions(query: PageQuery) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  return { page, limit, offset: (page - 1) * limit };
}
export function searchLike(value?: string) {
  return value?.trim() ? { [Op.iLike]: `%${value.trim()}%` } : undefined;
}
export function paged<T>(rows: T[], count: number, page: number, limit: number) {
  return { items: rows, total: count, page, limit, pages: Math.ceil(count / limit) };
}
export function idOrSlug(value:string) {
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuid.test(value) ? { id:value } : { slug:value };
}
