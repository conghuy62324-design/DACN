import React from 'react';
import { Star, ShieldCheck, Info } from 'lucide-react';
import { calculateBayesianScore, getBayesianTrustLevel } from '../../utils/bayesian';

interface RatingBadgeProps {
  rating: number;
  reviewCount: number;
  showBayesianDetail?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({
  rating,
  reviewCount,
  showBayesianDetail = false,
  size = 'md',
}) => {
  const bayesianScore = calculateBayesianScore(reviewCount, rating);
  const trust = getBayesianTrustLevel(reviewCount);

  if (size === 'sm') {
    return (
      <div className="inline-flex items-center space-x-1">
        <span className="flex items-center text-amber-500 font-bold text-xs">
          <Star className="w-3.5 h-3.5 fill-amber-400 mr-0.5" />
          {rating.toFixed(1)}
        </span>
        <span className="text-slate-400 text-xs">({reviewCount})</span>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <div className="flex items-center bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl">
        <Star className="w-4 h-4 fill-amber-400 text-amber-500 mr-1.5" />
        <span className="font-extrabold text-slate-800 text-sm">{rating.toFixed(1)}</span>
        <span className="text-slate-500 text-xs ml-1.5">({reviewCount} đánh giá)</span>
      </div>

      {showBayesianDetail && (
        <div className="group relative inline-flex items-center">
          <span
            className={`text-xs px-2 py-0.5 rounded-lg border font-semibold flex items-center cursor-help ${trust.color}`}
          >
            <ShieldCheck className="w-3 h-3 mr-1" />
            Bayesian: {bayesianScore.toFixed(2)} / 5.0
          </span>

          {/* Bayesian Explanatory Tooltip */}
          <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-900 text-slate-200 text-xs rounded-xl p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
            <p className="font-bold text-white mb-1 flex items-center">
              <Info className="w-3.5 h-3.5 text-orange-400 mr-1.5" />
              Thuật toán Bayesian Average
            </p>
            <p className="text-slate-300 mb-1 leading-relaxed">
              Điểm số đã chuẩn hóa chống đánh giá ảo dựa trên công thức:
            </p>
            <div className="bg-slate-800 font-mono text-[11px] p-1.5 rounded text-amber-300 text-center my-1">
              S = (v/(v+m))×R + (m/(v+m))×C
            </div>
            <p className="text-[10px] text-slate-400">
              v: {reviewCount} lượt | m: 10 ngưỡng tối thiểu | C: 4.20 trung bình hệ thống
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
