import React from 'react';
import { getCategoryColor } from '../utils/colorUtils';
import './YearCalendar.css';

export default function YearCalendar({ year, categories, entries, selectedDate, onDateClick }) {
  function getEntryForDate(dateStr) {
    return entries.find(entry => entry.date === dateStr);
  }

  function getCategoryColorForEntry(entry) {
    const category = categories.find(cat => cat.id === entry.categoryId);
    if (!category) return 'var(--default-grey)';
    
    return getCategoryColor(category, entry.subcategoryIndex);
  }

  // Build contribution graph data structure
  function buildContributionGraph() {
    const months = [];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
      const weeks = [];
      
      // Start with offset for the first week
      let currentWeek = new Array(7).fill(null);
      const startDayIndex = firstDay === 0 ? 6 : firstDay - 1; // Convert to Monday = 0
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        const weekIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        currentWeek[weekIndex] = {
          date: dateStr,
          day: day,
          entry: getEntryForDate(dateStr),
          isToday: dateStr === new Date().toISOString().split('T')[0]
        };
        
        // If it's Saturday or last day of month, push week and start new one
        if (weekIndex === 6 || day === daysInMonth) {
          weeks.push(currentWeek);
          currentWeek = new Array(7).fill(null);
        }
      }
      
      months.push({
        name: monthNames[month],
        weeks: weeks
      });
    }
    
    return months;
  }

  const contributionData = buildContributionGraph();
  
  return (
    <div className="year-calendar">
      <div className="graph-container">
        {/* Contribution graph */}
        <div className="contribution-graph">
          {contributionData.map((monthData, monthIndex) => (
            <React.Fragment key={monthIndex}>
              <div className={`month-group ${monthIndex === 4 || monthIndex === 9 ? 'month-gap-after' : ''}`}>
                {monthData.weeks.map((week, weekIndex) => (
                  <div key={`${monthIndex}-${weekIndex}`} className="graph-column">
                    {/* Show month label above first column only */}
                    {weekIndex === 0 && (
                      <div className="graph-month-label">{monthData.name}</div>
                    )}
                    <div className="graph-days">
                      {week.map((dayData, dayIndex) => {
                        if (!dayData) {
                          return (
                            <div
                              key={dayIndex}
                              className="graph-pixel empty"
                            ></div>
                          );
                        }

                        const pixelColor = dayData.entry 
                          ? getCategoryColorForEntry(dayData.entry)
                          : 'var(--default-grey)';

                        const isSelected = dayData.date === selectedDate;
                        const isToday = dayData.date === new Date().toISOString().split('T')[0];

                        return (
                          <div
                            key={dayIndex}
                            className={`graph-pixel ${dayData.entry ? 'has-entry' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                            style={{ backgroundColor: pixelColor }}
                            onClick={() => onDateClick(dayData.date)}
                            title={`${dayData.date}${dayData.entry ? ' - Has entry' : ''}`}
                          ></div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

    </div>
  );
}
