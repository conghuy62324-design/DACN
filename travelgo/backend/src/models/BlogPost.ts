import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export interface BlogPostAttributes {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  destinationName: string;
  placeId?: string;
  authorId?: string;
  authorName: string;
  authorAvatar?: string;
  coverImage: string;
  costEstimate?: string;
  tripDuration?: string;
  tags: string[];
  likesCount: number;
  isFeatured: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BlogPostCreationAttributes extends Optional<BlogPostAttributes, 'id' | 'likesCount' | 'isFeatured' | 'authorAvatar' | 'placeId' | 'authorId'> {}

export class BlogPost extends Model<BlogPostAttributes, BlogPostCreationAttributes> implements BlogPostAttributes {
  public id!: string;
  public title!: string;
  public slug!: string;
  public excerpt!: string;
  public content!: string;
  public destinationName!: string;
  public placeId?: string;
  public authorId?: string;
  public authorName!: string;
  public authorAvatar?: string;
  public coverImage!: string;
  public costEstimate?: string;
  public tripDuration?: string;
  public tags!: string[];
  public likesCount!: number;
  public isFeatured!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BlogPost.init(
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
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    excerpt: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    destinationName: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    placeId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    authorName: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    authorAvatar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    coverImage: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    costEstimate: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    tripDuration: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    tags: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    likesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'blog_posts',
    timestamps: true,
    underscored: true,
  }
);
