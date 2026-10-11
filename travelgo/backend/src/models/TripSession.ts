import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export interface TripSessionAttributes {
  id: string; userId: string; name: string; destinationCity: string; departureCity: string; startDate: string; endDate: string;
  daysCount: number; totalBudgetVND: number; estimatedCostVND: number; actualSpentVND: number;
  pacing: 'relaxed' | 'balanced' | 'packed'; status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  preferences: string[]; itinerary: unknown[]; selectedPlaceIds: string[]; selectedTourIds: string[]; checkins: unknown[];
  progressPercent: number; notes?: string; isPublic: boolean; createdAt?: Date; updatedAt?: Date;
}
type TripSessionCreationAttributes = Optional<TripSessionAttributes, 'id' | 'actualSpentVND' | 'status' | 'preferences' | 'selectedPlaceIds' | 'selectedTourIds' | 'checkins' | 'progressPercent' | 'notes' | 'isPublic'>;
export class TripSession extends Model<TripSessionAttributes, TripSessionCreationAttributes> implements TripSessionAttributes {
  public id!: string; public userId!: string; public name!: string; public destinationCity!: string; public departureCity!: string;
  public startDate!: string; public endDate!: string; public daysCount!: number; public totalBudgetVND!: number; public estimatedCostVND!: number;
  public actualSpentVND!: number; public pacing!: TripSessionAttributes['pacing']; public status!: TripSessionAttributes['status'];
  public preferences!: string[]; public itinerary!: unknown[]; public selectedPlaceIds!: string[]; public selectedTourIds!: string[];
  public checkins!: unknown[]; public progressPercent!: number; public notes?: string; public isPublic!: boolean;
  public readonly createdAt!: Date; public readonly updatedAt!: Date;
}
TripSession.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, userId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING(255), allowNull: false }, destinationCity: { type: DataTypes.STRING(120), allowNull: false },
  departureCity: { type: DataTypes.STRING(120), allowNull: false }, startDate: { type: DataTypes.DATEONLY, allowNull: false }, endDate: { type: DataTypes.DATEONLY, allowNull: false },
  daysCount: { type: DataTypes.INTEGER, allowNull: false }, totalBudgetVND: { type: DataTypes.DECIMAL(15,2), allowNull: false, defaultValue: 0, field: 'total_budget_vnd' },
  estimatedCostVND: { type: DataTypes.DECIMAL(15,2), allowNull: false, defaultValue: 0, field: 'estimated_cost_vnd' }, actualSpentVND: { type: DataTypes.DECIMAL(15,2), allowNull: false, defaultValue: 0, field: 'actual_spent_vnd' },
  pacing: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'balanced' }, status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'upcoming' },
  preferences: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }, itinerary: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  selectedPlaceIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }, selectedTourIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  checkins: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }, progressPercent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  notes: { type: DataTypes.TEXT, allowNull: true }, isPublic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { sequelize, tableName: 'trip_sessions', timestamps: true, underscored: true });
