import React, { useCallback, useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useActions } from '../context/ActionsProvider';
import { useCalendar } from '../context/CalendarProvider';
import { useHighlightDates } from '../context/HighlightDatesProvider';
import { useLocale } from '../context/LocaleProvider';
import { useNowIndicator } from '../context/NowIndicatorProvider';
import { useTheme } from '../context/ThemeProvider';
import { useTimezone } from '../context/TimeZoneProvider';
import type { EventItem, WeekdayNumbers } from '../types';
import { dateTimeToISOString, parseDateTime } from '../utils/dateUtils';
import Text from './Text';

interface MonthViewProps {
  dateUnix: number;
  events?: EventItem[];
  onPressDay?: (date: string) => void;
  onPressEvent?: (event: EventItem) => void;
  renderEvent?: (event: EventItem) => React.ReactNode;
  renderDayItem?: (date: { dateUnix: number; isCurrentMonth: boolean }) => React.ReactNode;
}

interface MonthDayProps {
  dateUnix: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: EventItem[];
  onPressDay?: (date: string) => void;
  onPressEvent?: (event: EventItem) => void;
  renderEvent?: (event: EventItem) => React.ReactNode;
  renderDayItem?: (date: { dateUnix: number; isCurrentMonth: boolean }) => React.ReactNode;
}

const MonthDay: React.FC<MonthDayProps> = ({
  dateUnix,
  isCurrentMonth,
  isToday,
  events,
  onPressDay,
  onPressEvent,
  renderEvent,
  renderDayItem,
}) => {
  const { colors, dayContainer, dayNumber, todayNumberContainer, todayNumber } = useTheme(
    useCallback(
      (state) => ({
        colors: state.colors,
        dayContainer: state.dayContainer,
        dayNumber: state.dayNumber,
        todayNumberContainer: state.todayNumberContainer,
        todayNumber: state.todayNumber,
      }),
      []
    )
  );
  const { onPressDayNumber } = useActions();
  const highlightDates = useHighlightDates(dateUnix);
  const timezone = useTimezone();

  const date = useMemo(() => parseDateTime(dateUnix), [dateUnix]);
  const dateString = useMemo(() => dateTimeToISOString(date, timezone), [date, timezone]);

  const handlePressDay = useCallback(() => {
    if (onPressDay) {
      onPressDay(dateString);
    }
    onPressDayNumber?.(dateString);
  }, [onPressDay, onPressDayNumber, dateString]);

  const handlePressEvent = useCallback(
    (event: EventItem) => {
      if (onPressEvent) {
        onPressEvent(event);
      }
    },
    [onPressEvent]
  );

  const dayStyles = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const cellSize = screenWidth / 7; // Use full screen width divided by 7 columns
    
    const baseStyle: ViewStyle = {
      backgroundColor: colors.background,
      borderColor: colors.border || '#E5E7EB',
      borderRightWidth: 0.5,
      borderBottomWidth: 0.5,
      width: cellSize,
      height: cellSize,
      padding: 4,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    };

    if (isToday) {
      return {
        ...baseStyle,
        backgroundColor: colors.primary,
        borderRadius: 8,
        margin: 2,
        ...todayNumberContainer,
      };
    }

    if (!isCurrentMonth) {
      return {
        ...baseStyle,
        backgroundColor: colors.surface || '#F9FAFB',
        opacity: 0.4,
      };
    }

    if (highlightDates?.length) {
      return {
        ...baseStyle,
        backgroundColor: colors.surface || '#F3F4F6',
        borderRadius: 4,
        margin: 1,
      };
    }

    return {
      ...baseStyle,
      ...dayContainer,
    };
  }, [
    colors,
    isToday,
    isCurrentMonth,
    highlightDates,
    dayContainer,
    todayNumberContainer,
  ]);

  const textStyles = useMemo(() => {
    if (isToday) {
      return {
        color: colors.onPrimary || '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        ...todayNumber,
      };
    }

    if (!isCurrentMonth) {
      return {
        color: colors.text || '#9CA3AF',
        opacity: 0.5,
        fontSize: 14,
        fontWeight: '400',
      };
    }

    return {
      color: colors.text || '#374151',
      fontSize: 14,
      fontWeight: '500',
      ...dayNumber,
    };
  }, [colors, isToday, isCurrentMonth, dayNumber, todayNumber]);

  if (renderDayItem) {
    return (
      <TouchableOpacity style={dayStyles} onPress={handlePressDay}>
        {renderDayItem({ dateUnix, isCurrentMonth })}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={dayStyles} onPress={handlePressDay}>
      <Text style={textStyles}>{date.day}</Text>
      {events.length > 0 && (
        <View style={styles.eventsContainer}>
          {events.slice(0, 1).map((event, index) => (
            <TouchableOpacity
              key={`${event.id}-${index}`}
              style={[
                styles.eventItem, 
                { 
                  backgroundColor: event.color || colors.primary || '#3B82F6',
                }
              ]}
              onPress={() => handlePressEvent(event)}
            >
              <Text style={styles.eventText} numberOfLines={1}>
                {event.title}
              </Text>
            </TouchableOpacity>
          ))}
          {events.length > 1 && (
            <Text style={styles.moreEventsText}>
              +{events.length - 1}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const MonthView: React.FC<MonthViewProps> = ({
  dateUnix,
  events = [],
  onPressDay,
  onPressEvent,
  renderEvent,
  renderDayItem,
}) => {
  const { firstDay, timeZone } = useCalendar();
  const { weekDayShort } = useLocale();
  const { currentDateUnix } = useNowIndicator();
  const timezone = useTimezone();

  const monthData = useMemo(() => {
    const currentDate = parseDateTime(dateUnix);
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    
    // Get the first day of the week for the month
    const firstDayOfWeek = startOfMonth.weekday;
    const diffToFirstDay = (firstDayOfWeek - firstDay + 7) % 7;
    const startOfCalendar = startOfMonth.minus({ days: diffToFirstDay });
    
    // Generate 42 days (6 weeks) to ensure we have a complete month grid
    const days = [];
    for (let i = 0; i < 42; i++) {
      const dayDate = startOfCalendar.plus({ days: i });
      const dayUnix = dayDate.toMillis();
      const isCurrentMonth = dayDate.month === currentDate.month;
      const isToday = dayDate.toMillis() === currentDateUnix;
      
      // Filter events for this day
      const dayEvents = events.filter(event => {
        try {
          const eventDate = parseDateTime(event.start, { zone: timezone });
          return eventDate.toISODate() === dayDate.toISODate();
        } catch (error) {
          console.warn('Error parsing event date:', event.start, error);
          return false;
        }
      });

      days.push({
        dateUnix: dayUnix,
        date: dayDate,
        isCurrentMonth,
        isToday,
        events: dayEvents,
      });
    }

    return days;
  }, [dateUnix, firstDay, currentDateUnix, events, timezone]);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (firstDay + i - 1) % 7;
      days.push(weekDayShort[dayIndex]);
    }
    return days;
  }, [firstDay, weekDayShort]);



  const weeks = useMemo(() => {
    const weekRows = [];
    for (let i = 0; i < 6; i++) {
      const weekDays = monthData.slice(i * 7, (i + 1) * 7);
      weekRows.push(weekDays);
    }
    return weekRows;
  }, [monthData]);

  return (
    <View style={styles.container}>
      <View style={styles.weekDayHeaders}>
        {weekDays.map((day, index) => (
          <View key={index} style={styles.weekDayHeader}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {weeks.map((weekDays, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {weekDays.map((day, dayIndex) => (
              <MonthDay
                key={`${weekIndex}-${dayIndex}`}
                dateUnix={day.dateUnix}
                isCurrentMonth={day.isCurrentMonth}
                isToday={day.isToday}
                events={day.events}
                onPressDay={onPressDay}
                onPressEvent={onPressEvent}
                renderEvent={renderEvent}
                renderDayItem={renderDayItem}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  weekDayHeaders: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  weekDayHeader: {
    width: Dimensions.get('window').width / 7,
    paddingVertical: 16,
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#E5E7EB',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  monthGrid: {
    backgroundColor: '#FFFFFF',
  },
  weekRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  eventsContainer: {
    marginTop: 4,
    paddingHorizontal: 2,
  },
  eventItem: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    marginBottom: 1,
  },
  eventText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  moreEventsText: {
    fontSize: 8,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 1,
  },
});

export default MonthView;
