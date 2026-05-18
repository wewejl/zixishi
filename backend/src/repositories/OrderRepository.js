import { BaseRepository } from './BaseRepository.js';

export class OrderRepository extends BaseRepository {
  createOrder(order) {
    this.db.prepare(`
      INSERT INTO orders (
        id, user_id, order_no, status, pay_channel, amount_cents, paid_cents,
        currency, wechat_prepay_id, created_at, updated_at
      )
      VALUES (?, ?, ?, 'pending_payment', 'wechat_pay', ?, 0, ?, ?, ?, ?)
    `).run(
      order.id,
      order.userId,
      order.orderNo,
      order.amountCents,
      order.currency,
      order.wechatPrepayId,
      order.createdAt,
      order.updatedAt,
    );

    return this.findById(order.id);
  }

  createOrderItem(item) {
    this.db.prepare(`
      INSERT INTO order_items (
        id, order_id, plan_id, quantity, unit_price_cents, total_price_cents, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.id,
      item.orderId,
      item.planId,
      item.quantity,
      item.unitPriceCents,
      item.totalPriceCents,
      item.createdAt,
    );
  }

  findById(orderId) {
    return this.db.prepare(`
      SELECT *
      FROM orders
      WHERE id = ?
      LIMIT 1
    `).get(orderId);
  }

  findByIdForUser(orderId, userId) {
    return this.db.prepare(`
      SELECT *
      FROM orders
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `).get(orderId, userId);
  }

  findPrimaryItem(orderId) {
    return this.db.prepare(`
      SELECT oi.*, p.name AS plan_name, p.plan_type, p.minutes_total, p.uses_total,
        p.valid_days, p.available_store_id, p.currency
      FROM order_items oi
      JOIN plans p ON p.id = oi.plan_id
      WHERE oi.order_id = ?
      ORDER BY oi.created_at ASC
      LIMIT 1
    `).get(orderId);
  }

  findReservationByOrderId(orderId) {
    return this.db.prepare(`
      SELECT *
      FROM reservations
      WHERE order_id = ?
      LIMIT 1
    `).get(orderId);
  }

  findReservationForPayment(reservationId, userId) {
    return this.db.prepare(`
      SELECT r.*, s.seat_no, a.name AS area_name, st.name AS store_name
      FROM reservations r
      JOIN seats s ON s.id = r.seat_id
      JOIN store_areas a ON a.id = r.area_id
      JOIN stores st ON st.id = r.store_id
      WHERE r.id = ? AND r.user_id = ?
      LIMIT 1
    `).get(reservationId, userId);
  }

  attachOrderToReservation(reservationId, orderId, at) {
    this.db.prepare(`
      UPDATE reservations
      SET order_id = ?, updated_at = ?
      WHERE id = ? AND order_id IS NULL
    `).run(orderId, at, reservationId);
  }

  markPaid({ orderId, paidCents, transactionId, rawNotifyJson, paidAt }) {
    this.db.prepare(`
      UPDATE orders
      SET status = 'paid',
        paid_cents = ?,
        wechat_transaction_id = ?,
        raw_notify_json = ?,
        paid_at = ?,
        updated_at = ?
      WHERE id = ? AND status = 'pending_payment'
    `).run(paidCents, transactionId, rawNotifyJson, paidAt, paidAt, orderId);

    return this.findById(orderId);
  }

  confirmReservationByOrderId(orderId, at) {
    const result = this.db.prepare(`
      UPDATE reservations
      SET status = 'confirmed', updated_at = ?
      WHERE order_id = ?
        AND status = 'pending_payment'
    `).run(at, orderId);

    return result.changes;
  }

  listForUser({ userId, status = null, limit = 20, cursor = null }) {
    const params = [userId];
    const clauses = ['o.user_id = ?'];

    if (status) {
      clauses.push('o.status = ?');
      params.push(status);
    }

    if (cursor) {
      clauses.push('o.created_at < ?');
      params.push(cursor);
    }

    params.push(limit + 1);

    return this.db.prepare(`
      SELECT o.*,
        p.name AS plan_name,
        r.id AS reservation_id,
        r.start_at AS reservation_start_at,
        r.end_at AS reservation_end_at
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN plans p ON p.id = oi.plan_id
      LEFT JOIN reservations r ON r.order_id = o.id
      WHERE ${clauses.join(' AND ')}
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT ?
    `).all(...params);
  }
}
