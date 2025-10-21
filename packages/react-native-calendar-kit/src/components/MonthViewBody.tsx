import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useCalendar } from '../context/CalendarProvider';
import { useTimezone } from '../context/TimeZoneProvider';
import type { EventItem } from '../types';
import { parseDateTime } from '../utils/dateUtils';
import MonthView from './MonthView';

interface MonthViewBodyProps {
  pageIndex: number;
  dateUnix: number;
  onPressDay?: (date: string) => void;
  onPressEvent?: (event: EventItem) => void;
  renderEvent?: (event: EventItem) => React.ReactNode;
  renderDayItem?: (date: { dateUnix: number; isCurrentMonth: boolean }) => React.ReactNode;
}

const MonthViewBody: React.FC<MonthViewBodyProps> = ({
  pageIndex,
  dateUnix,
  onPressDay,
  onPressEvent,
  renderEvent,
  renderDayItem,
}) => {
  const { timeZone } = useCalendar();
  const timezone = useTimezone();

  // For now, we'll pass an empty events array
  // The MonthView component will handle the event display
  const events: EventItem[] = [];

  return (
    <View style={styles.container}>
      <MonthView
        dateUnix={dateUnix}
        events={events}
        onPressDay={onPressDay}
        onPressEvent={onPressEvent}
        renderEvent={renderEvent}
        renderDayItem={renderDayItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default MonthViewBody;
