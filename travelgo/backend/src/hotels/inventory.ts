import type { InventoryDay } from './contracts.js';
import { hotelError, int, stayDates } from './validation.js';
/** Read-only availability across every local stay date, checkout excluded. Never a reservation. */
export function checkStayInventory(roomTypeId: string, checkIn: string, checkOut: string, rooms: number, rows: InventoryDay[]) {
    int(rooms, 1, 10, 'Số phòng');
    const dates = stayDates(checkIn, checkOut), map = new Map<string, InventoryDay>();
    for (const r of rows) {
        if (r.roomTypeId !== roomTypeId)
            hotelError('HOTEL_INVENTORY_SCOPE', 'Tồn phòng không cùng hạng phòng.');
        if (map.has(r.stayDate))
            hotelError('HOTEL_INVENTORY_DUPLICATE', 'Tồn phòng trùng ngày.');
        int(r.sellableQuantity, 0, 100000, 'Tổng phòng');
        int(r.allocatedQuantity, 0, r.sellableQuantity, 'Phòng đã phân bổ');
        int(r.version, 1, Number.MAX_SAFE_INTEGER, 'Phiên bản');
        if (typeof r.closed !== 'boolean')
            hotelError('HOTEL_INVENTORY_INVALID', 'Trạng thái tồn phòng không hợp lệ.');
        map.set(r.stayDate, r);
    }
    let minimum = Number.MAX_SAFE_INTEGER;
    const observed = dates.map(stayDate => {
        const r = map.get(stayDate);
        if (!r)
            hotelError('HOTEL_INVENTORY_UNKNOWN', 'Chưa có tồn phòng cho toàn bộ kỳ lưu trú.', 409);
        const available = r!.closed ? 0 : r!.sellableQuantity - r!.allocatedQuantity;
        minimum = Math.min(minimum, available);
        if (available < rooms)
            hotelError('HOTEL_INVENTORY_UNAVAILABLE', 'Một hoặc nhiều đêm không đủ phòng.', 409);
        return { roomTypeId, stayDate, requested: rooms, version: r!.version };
    });
    return { minimumAvailableRooms: minimum, observed, reservationMade: false as const };
}
/** Plan consumed by the existing Booking transaction adapter in phase D; this function performs no writes. */
export function inventoryLockPlan(lines: {
    roomTypeId: string;
    checkIn: string;
    checkOut: string;
    quantity: number;
    inventory: InventoryDay[];
}[]) {
    const grouped = new Map<string, {
        roomTypeId: string;
        stayDate: string;
        quantity: number;
        version: number;
    }>();
    for (const l of lines) {
        const { observed } = checkStayInventory(l.roomTypeId, l.checkIn, l.checkOut, l.quantity, l.inventory);
        for (const day of observed) {
            const key = day.roomTypeId + ':' + day.stayDate, prior = grouped.get(key);
            if (prior && prior.version !== day.version)
                hotelError('HOTEL_INVENTORY_VERSION', 'Snapshot tồn phòng không đồng nhất.', 409);
            grouped.set(key, { roomTypeId: day.roomTypeId, stayDate: day.stayDate, quantity: (prior?.quantity || 0) + l.quantity, version: day.version });
        }
    }
    // Lock the complete room/date set in one order before price/eligibility revalidation and allocation inserts.
    for (const g of grouped.values())
        for (const l of lines.filter(l => l.roomTypeId === g.roomTypeId)) {
            const day = l.inventory.find(d => d.stayDate === g.stayDate);
            if (day && (day.closed || day.sellableQuantity - day.allocatedQuantity < g.quantity))
                hotelError('HOTEL_INVENTORY_UNAVAILABLE', 'Tổng các dòng đặt vượt tồn phòng.', 409);
        }
    return [...grouped.values()].sort((a, b) => a.roomTypeId.localeCompare(b.roomTypeId) || a.stayDate.localeCompare(b.stayDate));
}
export const HOTEL_INVENTORY_LOCK_SQL = 'SELECT room_type_id,stay_date,sellable_quantity,allocated_quantity,closed,version FROM hotel_room_inventory WHERE (room_type_id,stay_date) IN (SELECT room_type_id,stay_date FROM jsonb_to_recordset($1::jsonb) AS x(room_type_id uuid,stay_date date)) ORDER BY room_type_id,stay_date FOR UPDATE';
