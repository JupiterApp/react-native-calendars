import _ from 'lodash';
import React, {Component} from 'react';
import {Animated, FlatList, View, Text} from 'react-native';
import PropTypes from 'prop-types';
import XDate from 'xdate';

import styleConstructor from './style';
import {xdateToData, parseDate} from '../interface';
import CalendarList from '../calendar-list';
import Week from '../expandableCalendar/week';
import asCalendarConsumer from './asCalendarConsumer';
import {weekDayNames, sameDate} from '../dateutils';


const commons = require('./commons');
const UPDATE_SOURCES = commons.UPDATE_SOURCES;
const NUMBER_OF_PAGES = 2; // must be a positive numbee
const INSET_PADDING = 15;


const EmptyArray = [];

/**
 * @description: Week calendar component
 * @example: https://github.com/wix/react-native-calendars/blob/master/example/src/screens/expandableCalendar.js
 */
class CustomWeekCalendar extends Component {
  static displayName = 'WeekCalendar';

  static propTypes = {
    ...CalendarList.propTypes,
    // the current date
    current: PropTypes.any,
    /** whether to have shadow/elevation for the calendar */
    allowShadow: PropTypes.bool,
    /** whether to hide the names of the week days */
    hideDayNames: PropTypes.bool
  };

  static defaultProps = {
    firstDay: 0,
    allowShadow: true

  }

  constructor(props) {
    super(props);

    this.style = styleConstructor(props.theme);

    this.list = React.createRef();
    this.page = NUMBER_OF_PAGES;

    this.state = {
      items: this.getDatesArray(),
      leftPosition: new Animated.Value(0),
      leftPositionIndex: 0,
      firstDateVisible: this.props.minDate
    };
  }

  componentDidMount () {
    this.state.leftPosition.setValue(INSET_PADDING + 5);
  }

  componentDidUpdate(prevProps) {
    const {updateSource, date} = this.props.context;
   
    
    if (date !== prevProps.context.date && updateSource !== UPDATE_SOURCES.WEEK_SCROLL) {
      const items = this.getDatesArray();
      this.setState({items});
      const days = items.map(block => this.getWeek(block));
      days.forEach((dayArr, idx) => {
        if (dayArr.find(day => sameDate(XDate(this.props.current), day))) {
          currentDateIdx = idx;
        }
      });
      const SNAP_WIDTH = (this.containerWidth - (INSET_PADDING * 2)) / 7 + 1;
      this.list.current.scrollToIndex({animated: false, index: currentDateIdx});
    }
  }

  get containerWidth() {
    return this.props.calendarWidth || commons.screenWidth;
  }

  getWeek(date , firstDate) {
    const firstDay = firstDate || this.props.firstDay;
    if (date) {
      const current = parseDate(date);
      const daysArray = [current];
      let dayOfTheWeek = current.getDay() - firstDay;
      if (dayOfTheWeek < 0) { // to handle firstDay > 0
        dayOfTheWeek = 7 + dayOfTheWeek;
      }
      
      let newDate = current;
      let index = dayOfTheWeek - 1;
      while (index >= 0) {
        newDate = parseDate(newDate).addDays(-1);
        daysArray.unshift(newDate);
        index -= 1;
      }

      newDate = current;
      index = dayOfTheWeek + 1;
      while (index < 7) {
        newDate = parseDate(newDate).addDays(1);
        daysArray.push(newDate);
        index += 1;
      }
      return daysArray;
    }
  }

  getDateMaxForTimeSelection () {
    let endReached = false;
    let counter = 0;
    let array = [];
    while (!endReached) {
      const d = this.getDate(counter);
      const days = array.map(block => this.getWeek(block));
      days.forEach((dayArr, idx) => {
        if (dayArr.find(day => sameDate(day, XDate(this.props.maxDate)))) {
          endReached = true;
          return;
        }
      });
      array.push(d);
      counter++;
    }

    return array;
  }

  getDatesArray() {
    return  this.getDateMaxForTimeSelection();
  }

  getDate(weekIndex) {
    const {current, context} = this.props;
    let firstDay = XDate(current).getDay();
    if (firstDay === 0) firstDay = 7;
    const d = XDate(current || context.date);
    // get the first day of the week as date (for the on scroll mark)
    let dayOfTheWeek = d.getDay();
    if (dayOfTheWeek < firstDay && firstDay > 0) {
      dayOfTheWeek = 7 + dayOfTheWeek;
    }

    // leave the current date in the visible week as is
    const dd = weekIndex === 0 ? d : d.addDays(firstDay - dayOfTheWeek);
    const newDate = dd.addWeeks(weekIndex);
    const dateString = newDate.toString('yyyy-MM-dd');
    
    return dateString;
  }

  getMarkedDates() {
    const {context, markedDates} = this.props;

    if (markedDates) {
      const marked = _.cloneDeep(markedDates);

      if (marked[context.date]) {
        marked[context.date].selected = false;
      } else {
        marked[context.date] = {selected: false};
      }
      return marked;
    } 
    return {[context.date]: {selected: false}};
  }

  onDayPress = (value) => {
    const DAY_WIDTH = (this.containerWidth - (INSET_PADDING * 2)) / 7;
    let firstDay = XDate(this.state.firstDateVisible).getDay();
    if (firstDay === 0) firstDay = 7;
    const days = this.state.items.map(block => this.getWeek(block, firstDay));
    let currentDateIdx = 0;
    let currentDate = '';
    days.forEach((dayArr, idx) => {
      if (dayArr.find(day => sameDate(XDate(value.dateString), day))) {
        currentDate = dayArr.find(day => sameDate(XDate(value.dateString), day));
        currentDateIdx = dayArr.findIndex(day => sameDate(XDate(value.dateString), day));
      }
    });
    const flattened = _.flattenDeep(days);
    const found = Math.max(0, flattened.findIndex(day => sameDate(XDate(value.dateString), day)));
    const previous = Math.max(0, found - 1);
    
    let toValue = DAY_WIDTH * currentDateIdx + INSET_PADDING + 2;
    // If last element in list, we need to adjust invoked date
    if (currentDateIdx === 6) {
      currentDateIdx = 5;
      toValue = DAY_WIDTH * 5 + INSET_PADDING + 2;
      _.invoke(this.props.context, 'setDate', XDate(flattened[previous]).toString('yyyy-MM-dd'), UPDATE_SOURCES.WEEK_SCROLL);
    } else {
      _.invoke(this.props.context, 'setDate', value.dateString, UPDATE_SOURCES.WEEK_SCROLL);
    }
    this.setState({leftPositionIndex: currentDateIdx});
    Animated.timing(this.state.leftPosition, {
      toValue: toValue,
      duration: 500
    }).start();
  }

  onScroll = ({nativeEvent: {contentOffset: {x}}}) => {
  }

  onMomentumScrollEnd = (e) => {
    let contentOffset = e.nativeEvent.contentOffset;
    let viewSize = e.nativeEvent.layoutMeasurement;

    const SNAP_WIDTH = (this.containerWidth - (INSET_PADDING * 2)) / 7;
    // Divide the horizontal offset by the width of the view to see which page is visible
    const pageNum = Math.round(contentOffset.x / SNAP_WIDTH) + 1;
    const days = _.flatten(this.state.items.map(block => this.getWeek(block)));
    const firstDateVisible = days[pageNum].toString('yyyy-MM-dd');
    let firstDay = XDate(firstDateVisible).getDay();
    if (firstDay === 0) firstDay = 7;
    const newDays = this.state.items.map(block => this.getWeek(block, firstDay));
    let currentDateIdx = 0;
    newDays.forEach((dayArr, idx) => {
      if (dayArr.find(day => sameDate(XDate(firstDateVisible), day))) {
        currentDateIdx = idx;
      }
    });
    let currentDate = newDays[currentDateIdx][this.state.leftPositionIndex];
    this.setState({firstDateVisible});
    _.invoke(this.props.context, 'setDate', XDate(currentDate).toString('yyyy-MM-dd'), UPDATE_SOURCES.WEEK_SCROLL);
  }

  renderItem = ({item}) => {
    const {calendarWidth, style, onDayPress, ...others} = this.props;

    return (
      <Week 
        {...others} 
        key={item} 
        current={item} 
        style={[{paddingLeft: 0, paddingRight: 0}, style]}
        markedDates={this.getMarkedDates()}
        onDayPress={this.onDayPress}
      />
    );
  }

  getItemLayout = (data, index) => {
    return {
      length: this.containerWidth,
      offset: this.containerWidth * index,
      index
    };
  }

  keyExtractor = (item, index) => item.toString();

  render() {
    const {allowShadow, firstDay, hideDayNames} = this.props;
    const {items} = this.state;
    let weekDaysNames = weekDayNames(firstDay);

    const SNAP_WIDTH = (this.containerWidth - (INSET_PADDING * 2)) / 7;

    return (
      <View style={[allowShadow && this.style.containerShadow, !hideDayNames && {paddingBottom: 6}]}>
        <FlatList
          ref={this.list}
          data={items}
          extraData={this.props.current || this.props.context.date}
          style={this.style.container}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled
          renderItem={this.renderItem}
          keyExtractor={this.keyExtractor}
          bounces={false}
          // getItemLayout={this.getItemLayout}
          // onScroll={this.onScroll}
          onMomentumScrollEnd={this.onMomentumScrollEnd}
          // snapToInterval={SNAP_WIDTH}
          snapToOffsets={this.state.items.map((item, i) => i * SNAP_WIDTH)}
          decelerationRate={0}
          style={{marginHorizontal: INSET_PADDING, position: 'relative'}}
        />
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: this.state.leftPosition,
            paddingHorizontal: 50,
            paddingVertical: 35,
            borderColor: '#000',
            borderWidth: 2,
            borderRadius: 3
          }}
        />
      </View>
    );
  }
}

export default asCalendarConsumer(CustomWeekCalendar);
