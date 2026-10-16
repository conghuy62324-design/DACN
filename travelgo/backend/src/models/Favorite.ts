import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Place } from './Place.js';

interface FavoriteAttributes {
  id: string;
  userId: string;
  placeId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type FavoriteCreationAttributes = Optional<FavoriteAttributes, 'id' | 'createdAt' | 'updatedAt'>;

export class Favorite extends Model<FavoriteAttributes, FavoriteCreationAttributes> implements FavoriteAttributes {
  public id!: string;
  public userId!: string;
  public placeId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public place?: Place;
}

Favorite.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  placeId: { type: DataTypes.UUID, allowNull: false },
}, {
  sequelize,
  tableName: 'user_favorites',
  timestamps: true,
  underscored: true,
});
