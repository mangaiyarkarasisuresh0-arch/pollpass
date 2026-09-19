import React from 'react';
import { Award } from 'lucide-react';

export default function LiveChart({ options = [], results = {}, totalVotes = 0 }) {
  // Find highest vote count to highlight leader
  let maxCount = 0;
  options.forEach((opt) => {
    const count = results[opt.id] || 0;
    if (count > maxCount) {
      maxCount = count;
    }
  });

  return (
    <div className="chart-container">
      {options.map((opt) => {
        const count = results[opt.id] || 0;
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const isLeader = maxCount > 0 && count === maxCount;

        return (
          <div key={opt.id} className={`chart-bar-row ${isLeader ? 'leading' : ''}`}>
            {/* Animated Background Progress Bar */}
            <div
              className="chart-bar-bg"
              style={{ width: `${percentage}%` }}
              aria-hidden="true"
            />

            <div className="chart-bar-content">
              <div className="chart-option-name">
                <span>{opt.text}</span>
                {isLeader && (
                  <span className="leader-badge">
                    <Award size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                    Leading
                  </span>
                )}
              </div>

              <div className="chart-stats">
                <span className="chart-count">
                  {count} {count === 1 ? 'vote' : 'votes'}
                </span>
                <span className="chart-percentage">{percentage}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
