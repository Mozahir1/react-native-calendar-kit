import React, { useCallback, useMemo } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Platform, RefreshControl, StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  ScrollView,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import BodyItem from './components/BodyItem';
import BodyResourceItem from './components/BodyResourceItem';
import MonthViewBody from './components/MonthViewBody';
import CalendarListView from './components/CalendarListView';
import DragEventPlaceholder from './components/DraggingEvent';
import DraggingHour from './components/DraggingHour';
import { NowIndicatorResource } from './components/NowIndicator';
import ResourceListView from './components/Resource/ResourceListView';
import ResourceOverlay from './components/Resource/ResourceOverlay';
import TimeColumn from './components/TimeColumn';
import { EXTRA_HEIGHT, ScrollType } from './constants';
import { useActions } from './context/ActionsProvider';
import type { BodyContextProps } from './context/BodyContext';
import { BodyContext } from './context/BodyContext';
import { useCalendar } from './context/CalendarProvider';
import { useResources } from './context/EventsProvider';
import { useLocale } from './context/LocaleProvider';
import useDragEventGesture from './hooks/useDragEventGesture';
import useDragToCreateGesture from './hooks/useDragToCreateGesture';
import usePinchToZoom from './hooks/usePinchToZoom';
import useSyncedList from './hooks/useSyncedList';
import type { CalendarBodyProps, ResourceItem } from './types';
import {
  dateTimeToISOString,
  parseDateTime,
  toHourStr,
} from './utils/dateUtils';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const CalendarBody: React.FC<CalendarBodyProps> = ({
  hourFormat = 'HH:mm',
  renderHour,
  showNowIndicator = true,
  showTimeColumnRightLine = true,
  renderCustomOutOfRange,
  renderCustomUnavailableHour,
  renderEvent,
  renderDraggableEvent,
  renderDraggingEvent,
  renderDraggingHour,
  NowIndicatorComponent,
  renderCustomHorizontalLine,
}) => {
  const {
    calendarLayout,
    hourWidth,
    numberOfDays,
    offsetY,
    minuteHeight,
    maxTimelineHeight,
    maxTimeIntervalHeight,
    minTimeIntervalHeight,
    timeIntervalHeight,
    allowPinchToZoom,
    spaceFromTop,
    spaceFromBottom,
    timelineHeight,
    slots,
    totalSlots,
    start,
    end,
    timeInterval,
    columnWidth,
    scrollVisibleHeight,
    verticalListRef,
    visibleDateUnix,
    gridListRef,
    calendarData,
    calendarGridWidth,
    initialOffset,
    isRTL,
    columns,
    snapToInterval,
    calendarListRef,
    startOffset,
    scrollVisibleHeightAnim,
    visibleDateUnixAnim,
    pagesPerSide,
    rightEdgeSpacing,
    overlapEventsSpacing,
    allowDragToCreate,
    allowDragToEdit,
    firstDay,
    dragToCreateMode,
    allowHorizontalSwipe,
    enableResourceScroll,
    resourcePerPage,
    resourcePagingEnabled,
    linkedScrollGroup,
  } = useCalendar();
  const { onTouchStart, onWheel } = linkedScrollGroup.addAndGet(
    ScrollType.calendarGrid,
    gridListRef
  );

  const locale = useLocale();
  const { onRefresh, onLoad, onPressDayNumber, onPressEvent } = useActions();
  const resources = useResources();
  const scrollProps = useSyncedList({
    id: ScrollType.calendarGrid,
  });

  const animContentStyle = useAnimatedStyle(() => ({
    height: timelineHeight.value,
  }));

  const { pinchGesture, pinchGestureRef } = usePinchToZoom();
  const dragEventGesture = useDragEventGesture();
  const dragToCreateGesture = useDragToCreateGesture({
    mode: dragToCreateMode,
  });

  const _onLayout = (event: LayoutChangeEvent) => {
    (scrollVisibleHeight as any).current = event.nativeEvent.layout.height;
    scrollVisibleHeightAnim.value = event.nativeEvent.layout.height;
  };

  const _onRefresh = useCallback(() => {
    if (onRefresh) {
      const date = parseDateTime(visibleDateUnix.current || 0);
      const dateString = dateTimeToISOString(date);
      if (dateString) {
        onRefresh(dateString);
      }
    }
  }, [onRefresh, visibleDateUnix]);

  const extraData = useMemo(() => {
    return {
      firstDay,
      minDate: calendarData.minDateUnix,
      columns,
      visibleDatesArray: calendarData.visibleDatesArray,
      renderDraggableEvent,
      resources,
    };
  }, [
    calendarData.minDateUnix,
    calendarData.visibleDatesArray,
    columns,
    renderDraggableEvent,
    firstDay,
    resources,
  ]);

  const _renderTimeSlots = useCallback(
    (index: number, extra: typeof extraData) => {
      const pageIndex = index * extra.columns;
      const dateUnixByIndex = extra.visibleDatesArray[pageIndex];
      if (!dateUnixByIndex) {
        return null;
      }

      // Check if we're in month view (numberOfDays === 30)
      if (numberOfDays === 30) {
        return (
          <MonthViewBody
            pageIndex={pageIndex}
            dateUnix={dateUnixByIndex}
            onPressDay={onPressDayNumber}
            onPressEvent={onPressEvent}
            renderEvent={renderEvent}
          />
        );
      }

      return (
        <BodyItem
          pageIndex={pageIndex}
          startUnix={dateUnixByIndex}
          renderDraggableEvent={extra.renderDraggableEvent}
          resources={extra.resources}
        />
      );
    },
    [numberOfDays, onPressDayNumber, onPressEvent, renderEvent]
  );

  const _onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetY.value = e.nativeEvent.contentOffset.y;
  };

  const extraScrollData = useMemo(() => {
    return {
      visibleDates: calendarData.visibleDatesArray,
      visibleColumns: numberOfDays,
    };
  }, [calendarData.visibleDatesArray, numberOfDays]);

  const hours = useMemo(() => {
    return slots.map((slot) => {
      return {
        slot,
        time: toHourStr(slot, hourFormat, locale.meridiem),
      };
    });
  }, [hourFormat, locale.meridiem, slots]);

  const _renderResourceItem = useCallback(
    (item: { items: ResourceItem[]; index: number }) => {
      return <BodyResourceItem resources={item.items} />;
    },
    []
  );

  const value = useMemo<BodyContextProps>(
    () => ({
      renderHour,
      offsetY,
      minuteHeight,
      maxTimelineHeight,
      maxTimeIntervalHeight,
      minTimeIntervalHeight,
      timeIntervalHeight,
      allowPinchToZoom,
      spaceFromTop,
      spaceFromBottom,
      timelineHeight,
      hours,
      hourFormat,
      totalSlots,
      numberOfDays,
      hourWidth,
      start,
      end,
      timeInterval,
      showNowIndicator,
      showTimeColumnRightLine,
      columnWidth,
      calendarLayout,
      isRTL,
      columns,
      calendarData,
      renderCustomOutOfRange,
      renderCustomUnavailableHour,
      renderEvent,
      startOffset,
      rightEdgeSpacing,
      overlapEventsSpacing,
      visibleDateUnixAnim,
      NowIndicatorComponent,
      allowDragToCreate,
      allowDragToEdit,
      renderCustomHorizontalLine,
      dragToCreateMode,
      verticalListRef,
      gridListRef,
      resourcePerPage,
      enableResourceScroll,
    }),
    [
      renderHour,
      offsetY,
      minuteHeight,
      maxTimelineHeight,
      maxTimeIntervalHeight,
      minTimeIntervalHeight,
      timeIntervalHeight,
      allowPinchToZoom,
      spaceFromTop,
      spaceFromBottom,
      timelineHeight,
      hours,
      hourFormat,
      totalSlots,
      numberOfDays,
      hourWidth,
      start,
      end,
      timeInterval,
      showNowIndicator,
      showTimeColumnRightLine,
      columnWidth,
      calendarLayout,
      isRTL,
      columns,
      calendarData,
      renderCustomOutOfRange,
      renderCustomUnavailableHour,
      renderEvent,
      startOffset,
      rightEdgeSpacing,
      overlapEventsSpacing,
      visibleDateUnixAnim,
      NowIndicatorComponent,
      allowDragToCreate,
      allowDragToEdit,
      renderCustomHorizontalLine,
      dragToCreateMode,
      verticalListRef,
      gridListRef,
      resourcePerPage,
      enableResourceScroll,
    ]
  );

  const composedGesture =
    Platform.OS === 'android'
      ? Gesture.Race(
          pinchGesture,
          dragEventGesture.activateAfterLongPress(200),
          dragToCreateGesture.activateAfterLongPress(200)
        )
      : Gesture.Race(pinchGesture, dragEventGesture, dragToCreateGesture);

  const leftSize = numberOfDays > 1 || !!resources ? hourWidth : 0;

  const _renderResourceOverlay = useCallback(
    (props: { totalSize: number; resources: ResourceItem[] }) => {
      return (
        <ResourceOverlay
          {...props}
          renderDraggableEvent={renderDraggableEvent}
        />
      );
    },
    [renderDraggableEvent]
  );

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <AnimatedScrollView
          ref={verticalListRef}
          scrollEventThrottle={16}
          pinchGestureEnabled={false}
          showsVerticalScrollIndicator={false}
          onLayout={_onLayout}
          onScroll={_onScroll}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={false} onRefresh={_onRefresh} />
            ) : undefined
          }
          simultaneousHandlers={pinchGestureRef}>
          <BodyContext.Provider value={value}>
            <Animated.View
              style={[
                {
                  width: calendarLayout.width,
                  overflow: Platform.select({
                    web: 'hidden',
                    default: 'visible',
                  }),
                },
                animContentStyle,
              ]}>
              <View
                style={[
                  styles.absolute,
                  { top: -EXTRA_HEIGHT, width: calendarLayout.width },
                ]}>
                {(numberOfDays > 1 || !!resources) && <TimeColumn />}
                <View
                  style={[
                    styles.absolute,
                    {
                      left: Math.max(0, leftSize - 1),
                      width: calendarLayout.width - leftSize,
                    },
                  ]}>
                  {enableResourceScroll ? (
                    <ResourceListView
                      ref={gridListRef}
                      resources={resources}
                      width={calendarGridWidth}
                      height={maxTimelineHeight + EXTRA_HEIGHT * 2}
                      resourcePerPage={resourcePerPage}
                      renderItem={_renderResourceItem}
                      pagingEnabled={resourcePagingEnabled}
                      renderOverlay={_renderResourceOverlay}
                      scrollEnabled={allowHorizontalSwipe}
                      onTouchStart={onTouchStart}
                      onWheel={onWheel}
                    />
                  ) : (
                    <CalendarListView
                      ref={calendarListRef as any}
                      animatedRef={gridListRef}
                      count={calendarData.count}
                      scrollEnabled={allowHorizontalSwipe}
                      width={calendarGridWidth}
                      height={maxTimelineHeight + EXTRA_HEIGHT * 2}
                      renderItem={_renderTimeSlots}
                      extraData={extraData}
                      inverted={isRTL}
                      snapToInterval={snapToInterval}
                      initialOffset={initialOffset}
                      columnsPerPage={columns}
                      renderAheadItem={pagesPerSide}
                      extraScrollData={extraScrollData}
                      {...scrollProps}
                      onLoad={onLoad}
                      onTouchStart={onTouchStart}
                      onWheel={onWheel}
                    />
                  )}
                </View>
                <View
                  pointerEvents="box-none"
                  style={[
                    styles.absolute,
                    { top: EXTRA_HEIGHT + spaceFromTop },
                    styles.dragContainer,
                  ]}>
                  {enableResourceScroll && <NowIndicatorResource />}
                  <DragEventPlaceholder
                    renderDraggingEvent={renderDraggingEvent}
                    resources={resources}
                  />
                  <DraggingHour renderHour={renderDraggingHour} />
                </View>
              </View>
            </Animated.View>
          </BodyContext.Provider>
        </AnimatedScrollView>
      </GestureDetector>
    </View>
  );
};

export default React.memo(CalendarBody);

const styles = StyleSheet.create({
  container: { flex: 1 },
  absolute: { position: 'absolute' },
  dragContainer: { zIndex: 99999 },
});
