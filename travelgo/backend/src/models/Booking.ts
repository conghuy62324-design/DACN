import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export interface BookingAttributes {
  id: string;
  bookingCode: string;
  userId?: string;
  businessId?: string;
  placeId?: string;
  tourId?: string;
  ticketId?: string;
  serviceType: 'tour' | 'hotel' | 'restaurant' | 'ticket';
  serviceId: string;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingDate: string;
  returnDate?: string;
  adultsCount: number;
  childrenCount: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  discountAmount: number;
  idempotencyKey?: string;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  bookingStatus: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REJECTED';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BookingCreationAttributes extends Optional<BookingAttributes, 'id' | 'placeId' | 'tourId' | 'ticketId' | 'paymentStatus' | 'bookingStatus' | 'childrenCount' | 'quantity' | 'discountAmount' | 'idempotencyKey' | 'notes'> {}

export class Booking extends Model<BookingAttributes, BookingCreationAttributes> implements BookingAttributes {
  public id!: string;
  public bookingCode!: string;
  public userId?: string;
  public businessId?: string;
  public placeId?: string;
  public tourId?: string;
  public ticketId?: string;
  public serviceType!: 'tour' | 'hotel' | 'restaurant' | 'ticket';
  public serviceId!: string;
  public serviceName!: string;
  public customerName!: string;
  public customerEmail!: string;
  public customerPhone!: string;
  public bookingDate!: string;
  public returnDate?: string;
  public adultsCount!: number;
  public childrenCount!: number;
  public quantity!: number;
  public unitPrice!: number;
  public totalAmount!: number;
  public discountAmount!: number;
  public idempotencyKey?: string;
  public paymentStatus!: 'unpaid' | 'paid' | 'refunded';
  public bookingStatus!: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REJECTED';
  public notes?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Booking.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bookingCode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    businessId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    placeId: { type: DataTypes.UUID, allowNull: true },
    tourId: { type: DataTypes.UUID, allowNull: true },
    ticketId: { type: DataTypes.UUID, allowNull: true },
    serviceType: {
      type: DataTypes.ENUM('tour', 'hotel', 'restaurant', 'ticket'),
      allowNull: false,
    },
    serviceId: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    serviceName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    customerName: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    customerEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    customerPhone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    bookingDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    returnDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    adultsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    childrenCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    unitPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    discountAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    idempotencyKey: { type: DataTypes.STRING(120), allowNull: true },
    paymentStatus: {
      type: DataTypes.ENUM('unpaid', 'paid', 'refunded'),
      defaultValue: 'unpaid',
    },
    bookingStatus: {
      type: DataTypes.STRING(30),
      defaultValue: 'PENDING',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'bookings',
    timestamps: true,
    underscored: true,
  }
);
