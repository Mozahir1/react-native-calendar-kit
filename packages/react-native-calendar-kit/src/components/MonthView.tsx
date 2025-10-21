import React, { useCallback, useMemo } from 'react';
import {
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
    const baseStyle: ViewStyle = {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      minHeight: 100,
      padding: 4,
    };

    if (isToday) {
      return {
        ...baseStyle,
        backgroundColor: colors.primary,
        ...todayNumberContainer,
      };
    }

    if (!isCurrentMonth) {
      return {
        ...baseStyle,
        backgroundColor: colors.surface,
        opacity: 0.5,
      };
    }

    if (highlightDates?.length) {
      return {
        ...baseStyle,
        backgroundColor: colors.surface,
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
        color: colors.onPrimary,
        ...todayNumber,
      };
    }

    if (!isCurrentMonth) {
      return {
        color: colors.text,
        opacity: 0.5,
      };
    }

    return {
      color: colors.text,
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
      <View style={styles.eventsContainer}>
        {events.slice(0, 3).map((event, index) => (
          <TouchableOpacity
            key={`${event.id}-${index}`}
            style={[styles.eventItem, { backgroundColor: event.color || colors.primary }]}
            onPress={() => handlePressEvent(event)}
          >
            {renderEvent ? (
              renderEvent(event)
            ) : (
              <Text style={styles.eventText} numberOfLines={1}>
                {event.title}
              </Text>
            )}
          </TouchableOpacity>
        ))}
        {events.length > 3 && (
          <Text style={[styles.moreEventsText, { color: colors.text }]}>
            +{events.length - 3} more
          </Text>
        )}
      </View>
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

  const renderWeekDay = useCallback(
    ({ item }: { item: string }) => (
      <View style={styles.weekDayHeader}>
        <Text style={styles.weekDayText}>{item}</Text>
      </View>
    ),
    []
  );

  const renderWeek = useCallback(
    ({ item: weekDays, index: weekIndex }: { item: any[]; index: number }) => (
      <View style={styles.weekRow}>
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
    ),
    [onPressDay, onPressEvent, renderEvent, renderDayItem]
  );

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
      <FlatList
        data={weeks}
        renderItem={renderWeek}
        keyExtractor={(_, index) => index.toString()}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekDayHeaders: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  weekDayHeader: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  weekRow: {
    flexDirection: 'row',
    flex: 1,
  },
  eventsContainer: {
    flex: 1,
    marginTop: 4,
  },
  eventItem: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginVertical: 1,
    borderRadius: 2,
  },
  eventText: {
    fontSize: 10,
    color: '#fff',
  },
  moreEventsText: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
});

export default MonthView;
