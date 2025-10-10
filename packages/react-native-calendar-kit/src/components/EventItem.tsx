import isEqual from 'lodash.isequal';
import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  type GestureResponderEvent,
} from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import { MILLISECONDS_IN_DAY } from '../constants';
import { useBody } from '../context/BodyContext';
import { useTheme } from '../context/ThemeProvider';
import type { OnEventResponse, PackedEvent, SizeAnimation } from '../types';
import { parseDateTime } from '../utils/dateUtils';
import Text from './Text';

interface EventItemProps {
  event: PackedEvent;
  startUnix: number;
  renderEvent?: (event: PackedEvent, size: SizeAnimation) => React.ReactNode;
  onPressEvent?: (event: OnEventResponse) => void;
  onLongPressEvent?: (
    event: PackedEvent,
    resEvent: GestureResponderEvent
  ) => void;
  isDragging?: boolean;
  visibleDates: Record<string, { diffDays: number; unix: number }>;
  totalResources?: number;
}

const EventItem: FC<EventItemProps> = ({
  event: eventInput,
  startUnix,
  renderEvent,
  onPressEvent,
  onLongPressEvent,
  isDragging,
  visibleDates,
  totalResources,
}) => {
  const theme = useTheme(
    useCallback((state) => {
      return {
        eventContainerStyle: state.eventContainerStyle,
        eventTitleStyle: state.eventTitleStyle,
      };
    }, [])
  );

  const {
    minuteHeight,
    start,
    end,
    rightEdgeSpacing,
    overlapEventsSpacing,
    columnWidth,
    resourcePerPage,
    enableResourceScroll,
  } = useBody();
  const { _internal, ...event } = eventInput;
  const timeRange = end - start;
  const {
    duration,
    startMinutes = 0,
    total,
    index,
    columnSpan,
    startUnix: eventStartUnix,
    widthPercentage,
    xOffsetPercentage,
    resourceIndex,
  } = _internal;

  const data = useMemo(() => {
    const maxDuration = end - start;
    let newStart = startMinutes - start;
    let totalDuration = Math.min(duration, maxDuration);
    if (newStart < 0) {
      totalDuration += newStart;
      newStart = 0;
    }

    let diffDays = Math.floor(
      (eventStartUnix - startUnix) / MILLISECONDS_IN_DAY
    );

    if (eventStartUnix < startUnix) {
      for (
        let dayUnix = eventStartUnix;
        dayUnix < startUnix;
        dayUnix = parseDateTime(dayUnix).plus({ days: 1 }).toMillis()
      ) {
        const dayStartUnix = parseDateTime(dayUnix).startOf('day').toMillis();
        if (!visibleDates[dayStartUnix]) {
          diffDays++;
        }
      }
    } else {
      for (
        let dayUnix = startUnix;
        dayUnix < eventStartUnix;
        dayUnix = parseDateTime(dayUnix).plus({ days: 1 }).toMillis()
      ) {
        const dayStartUnix = parseDateTime(dayUnix).startOf('day').toMillis();
        if (!visibleDates[dayStartUnix]) {
          diffDays--;
        }
      }
    }

    return {
      totalDuration,
      startMinutes: newStart,
      diffDays,
    };
  }, [
    duration,
    end,
    eventStartUnix,
    start,
    startMinutes,
    startUnix,
    visibleDates,
  ]);

  const childColumns = enableResourceScroll
    ? resourcePerPage
    : totalResources && totalResources > 0
      ? totalResources
      : 1;

  const eventHeight = useDerivedValue(
    () => data.totalDuration * minuteHeight.value - 1,
    [data.totalDuration]
  );

  const widthPercent = useMemo(() => {
    if (total && columnSpan) {
      const availableWidth = columnWidth / childColumns - rightEdgeSpacing;
      const totalColumns = total - columnSpan;
      const overlapSpacing = (totalColumns * overlapEventsSpacing) / total;
      const eventWidth = (availableWidth / total) * columnSpan - overlapSpacing;
      const percent = eventWidth / availableWidth;
      return percent;
    }

    const basePercent = widthPercentage ? widthPercentage / 100 : 1;
    return basePercent;
  }, [
    widthPercentage,
    columnSpan,
    rightEdgeSpacing,
    overlapEventsSpacing,
    total,
    columnWidth,
    childColumns,
  ]);

  const availableWidth = columnWidth / childColumns - rightEdgeSpacing;
  const eventWidth = widthPercent * availableWidth;
  const eventPosX = useMemo(() => {
    const colWidth = columnWidth / childColumns;
    const startOffset = resourceIndex
      ? (enableResourceScroll
          ? resourceIndex % resourcePerPage
          : resourceIndex) * colWidth
      : 0;
    let left = data.diffDays * colWidth + startOffset;
    if (xOffsetPercentage) {
      left += availableWidth * (xOffsetPercentage / 100);
    } else if (columnSpan && index) {
      left += (eventWidth + overlapEventsSpacing) * (index / columnSpan);
    }
    return left;
  }, [
    availableWidth,
    childColumns,
    columnSpan,
    columnWidth,
    data.diffDays,
    enableResourceScroll,
    eventWidth,
    index,
    overlapEventsSpacing,
    resourceIndex,
    resourcePerPage,
    xOffsetPercentage,
  ]);

  const _onPressEvent = () => {
    if (onPressEvent) {
      onPressEvent(eventInput);
    }
  };

  const _onLongPressEvent = (resEvent: GestureResponderEvent) => {
    onLongPressEvent!(eventInput, resEvent);
  };

  const opacity = isDragging ? 0.5 : 1;

  const eventWidthAnim = useDerivedValue(() => eventWidth, [eventWidth]);

  return (
    <View
      style={[
        styles.container,
        {
          width: eventWidth,
          left: eventPosX + 1,
          height: `${((data.totalDuration - 1) / timeRange) * 100}%`,
          top: `${((data.startMinutes + 1) / timeRange) * 100}%`,
        },
      ]}>
      <Pressable
        style={(state) => [
          StyleSheet.absoluteFill,
          { opacity: state.pressed ? 0.6 : 1 },
        ]}
        disabled={!onPressEvent && !onLongPressEvent}
        onPress={onPressEvent ? _onPressEvent : undefined}
        onLongPress={onLongPressEvent ? _onLongPressEvent : undefined}>
        <View
          style={[
            styles.contentContainer,
            !!xOffsetPercentage && styles.overlapEvent,
            { backgroundColor: event.color },
            theme.eventContainerStyle,
            { opacity },
          ]}>
          {renderEvent ? (
            renderEvent(eventInput, {
              width: eventWidthAnim,
              height: eventHeight,
            })
          ) : (
            <Text
              style={[
                styles.title,
                theme.eventTitleStyle,
                { color: event.titleColor },
              ]}>
              {event.title}
            </Text>
          )}
        </View>
      </Pressable>
    </View>
  );
};

export default React.memo(EventItem, (prev, next) => {
  return (
    isEqual(prev.event, next.event) &&
    isEqual(prev.visibleDates, next.visibleDates) &&
    prev.startUnix === next.startUnix &&
    prev.renderEvent === next.renderEvent &&
    prev.isDragging === next.isDragging &&
    prev.onPressEvent === next.onPressEvent &&
    prev.onLongPressEvent === next.onLongPressEvent
  );
});

const styles = StyleSheet.create({
  container: { position: 'absolute', overflow: 'hidden' },
  title: { fontSize: 12, paddingHorizontal: 2 },
  contentContainer: {
    borderRadius: 2,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  overlapEvent: { borderWidth: 1, borderColor: '#FFF' },
});
