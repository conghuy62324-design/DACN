import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export interface TicketAttributes {
  id: string;
  title: string;
  type: 'flight' | 'bus' | 'train' | 'tour' | 'sightseeing';
  operator: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: Date;
  arrivalTime?: Date;
  duration?: string;
  price: number;
  originalPrice?: number;
  availableSeats: number;
  features: string[];
  imageUrl?: string;
  createdAt?: Date;
}

export interface TicketCreationAttributes extends Optional<TicketAttributes, 'id' | 'originalPrice' | 'availableSeats' | 'imageUrl'> {}

export class Ticket extends Model<TicketAttributes, TicketCreationAttributes> implements TicketAttributes {
  public id!: string;
  public title!: string;
  public type!: 'flight' | 'bus' | 'train' | 'tour' | 'sightseeing';
  public operator!: string;
  public departureCity!: string;
  public arrivalCity!: string;
  public departureTime!: Date;
  public arrivalTime?: Date;
  public duration?: string;
  public price!: number;
  public originalPrice?: number;
  public availableSeats!: number;
  public features!: string[];
  public imageUrl?: string;

  public readonly createdAt!: Date;
}

Ticket.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('flight', 'bus', 'train', 'tour', 'sightseeing'),
      allowNull: false,
    },
    operator: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    departureCity: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    arrivalCity: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    departureTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    arrivalTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    duration: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    originalPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    availableSeats: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
    },
    features: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'tickets',
    timestamps: true,
    updatedAt: false,
    underscored: true,
  }
);
