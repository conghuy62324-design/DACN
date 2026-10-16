import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';
import { AiItemType } from './UserEvent.js';

export interface RecommendationCandidateAttributes {
  id: string;
  requestId: string;
  itemId: string;
  itemType: Exclude<AiItemType, 'booking' | 'trip'>;
  eligible: boolean;
  eligibilityCode: string;
  returned: boolean;
  rankPosition?: number;
  score?: number;
  scoreBreakdown: Record<string, number>;
  reasonCodes: string[];
  policyVersion: string;
  modelVersion: string;
  createdAt?: Date;
}

type RecommendationCandidateCreationAttributes = Optional<RecommendationCandidateAttributes,
  'id' | 'returned' | 'rankPosition' | 'score' | 'scoreBreakdown' | 'reasonCodes' | 'createdAt'>;

export class RecommendationCandidate extends Model<RecommendationCandidateAttributes, RecommendationCandidateCreationAttributes>
  implements RecommendationCandidateAttributes {
  public id!: string;
  public requestId!: string;
  public itemId!: string;
  public itemType!: Exclude<AiItemType, 'booking' | 'trip'>;
  public eligible!: boolean;
  public eligibilityCode!: string;
  public returned!: boolean;
  public rankPosition?: number;
  public score?: number;
  public scoreBreakdown!: Record<string, number>;
  public reasonCodes!: string[];
  public policyVersion!: string;
  public modelVersion!: string;
  public readonly createdAt!: Date;
}

RecommendationCandidate.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  requestId: { type: DataTypes.UUID, allowNull: false },
  itemId: { type: DataTypes.STRING(120), allowNull: false },
  itemType: { type: DataTypes.STRING(30), allowNull: false },
  eligible: { type: DataTypes.BOOLEAN, allowNull: false },
  eligibilityCode: { type: DataTypes.STRING(80), allowNull: false },
  returned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  rankPosition: { type: DataTypes.INTEGER, allowNull: true },
  score: { type: DataTypes.DECIMAL(8, 6), allowNull: true },
  scoreBreakdown: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  reasonCodes: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  policyVersion: { type: DataTypes.STRING(100), allowNull: false },
  modelVersion: { type: DataTypes.STRING(100), allowNull: false },
}, { sequelize, tableName: 'recommendation_candidates', timestamps: true, updatedAt: false, underscored: true });

