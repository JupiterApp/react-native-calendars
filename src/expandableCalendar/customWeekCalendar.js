import _ from 'lodash';
import React, {Component} from 'react';
import {View, Text} from 'react-native';
import PropTypes from 'prop-types';
import XDate from 'xdate';
import Carousel from 'react-native-snap-carousel';

import {SELECT_DATE_SLOT} from '../testIDs';
import styleConstructor from './style';
import {xdateToData, parseDate} from '../interface';
import CalendarList from '../calendar-list';
import asCalendarConsumer from './asCalendarConsumer';
import {sameDate, sameMonth, isLTE, isGTE} from '../dateutils';
import Day from '../calendar/day/basic';


const commons = require('./commons');
const UPDATE_SOURCES = commons.UPDATE_SOURCES;
const NUMBER_OF_PAGES = 2; // must be a positive numbee
const INSET_PADDING = 0;
const MIDDLE_INDEX = 4;
const NUMBER_OF_ITEMS = 8;



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
      items: this.getDatesArray()
    };
  }

  componentDidUpdate(prevProps) {
    const {updateSource, date} = this.props.context;
    
    if (date !== prevProps.context.date && updateSource !== UPDATE_SOURCES.WEEK_SCROLL) {
      const items = this.getDatesArray();
      this.setState({items});
      const currentDate = parseDate(this.props.current);
      const indexFound = items.findIndex(item => sameDate(currentDate, item));
      this._carousel.snapToItem(indexFound + 1, false);
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
      days.forEach((dayArr) => {
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
    const minDate = parseDate(this.props.minDate);
    const items = this.getDateMaxForTimeSelection();
    const filteredItems = _.flatten(items.map(item => this.getWeek(item))).filter(day => isGTE(day, minDate));
    const threeDates = this.getThreeDaysBeforeMin(minDate);
    const snapItems = [...threeDates, ...filteredItems];
    return snapItems;
  }

  getDate(weekIndex) {
    const {firstDay} = this.props;
    const d = XDate(this.props.minDate);
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
    const days = _.flatten(this.state.items.map(block => this.getWeek(block)));
    const scrollIndex = days.findIndex(day => sameDate(XDate(value.dateString), day));
    // If last element in list, we need to adjust invoked date

    // _.invoke(this.props.context, 'setDate', value.dateString, UPDATE_SOURCES.WEEK_SCROLL);
    this.list.current.scrollToIndex({animated: true, index: scrollIndex + 1, viewPosition: 0.5});
  }

  getThreeDaysBeforeMin (minDate) {
    const newDates = [];
    const ARR = [1, 2, 3].reverse();
    ARR.forEach(value => {
      newDates.push(minDate.clone().addDays(-value));
    });
    return newDates;
  }

  renderDay(day, id) {
    const {current} = this.props;
    const minDate = parseDate(this.props.minDate);
    const maxDate = parseDate(this.props.maxDate);

    let state = '';
    if (this.props.disabledByDefault) {
      state = 'disabled';
    } else if ((minDate && !isGTE(day, minDate)) || (maxDate && !isLTE(day, maxDate))) {
      state = 'disabled';
    } else if (!sameMonth(day, parseDate(current))) { // for extra days
      state = 'not-disabled';
    }

    // hide extra days
    if (current && this.props.hideExtraDays) {
      if (!sameMonth(day, parseDate(current))) {
        return (<View key={id} style={{flex: 1}}/>);
      }
    }

    const DayComp = Day;
    const dayDate = day.getDate();
    const dateAsObject = xdateToData(day);
    const WIDTH = (this.containerWidth - (INSET_PADDING * 2)) / 8;
    const containerStyle = {width: WIDTH, alignItems: 'center'};

    return (
      <View style={containerStyle} key={id}>
        <View style={[this.style.week, {paddingRight: 0, paddingLeft: 0}]}>
          <Text 
            allowFontScaling={false} 
            style={[this.style.dayHeader]} 
            numberOfLines={1} 
            accessibilityLabel={''}
            // accessible={false} // not working
            // importantForAccessibility='no'
          >
            {day.toString('ddd').toUpperCase()}
          </Text>
        </View>
        <DayComp
          testID={`${SELECT_DATE_SLOT}-${dateAsObject.dateString}`}
          state={state}
          theme={this.props.theme}
          onPress={this.props.onDayPress}
          onLongPress={this.props.onDayPress}
          date={dateAsObject}
          marking={this.getDateMarking(day)}
          disabled={true}
        >
          {dayDate}
        </DayComp>
      </View>
    );
  }

  renderItem = ({item, index}) => {
    return (
      <View key={item}>
        {this.renderDay(item, index)}
      </View>
    );
  }

  getDateMarking(day) {
    const markedDates = this.getMarkedDates();
    if (!markedDates) {
      return false;
    }

    const dates = markedDates[day.toString('yyyy-MM-dd')] || [];
    if (dates.length || dates) {
      return dates;
    } else {
      return false;
    }
  }

  getItemLayout = (data, index) => {
    const SNAP_WIDTH = (this.containerWidth - (INSET_PADDING * 2)) / NUMBER_OF_ITEMS;
    return {
      length: SNAP_WIDTH,
      offset: SNAP_WIDTH * index,
      index
    };
  }

  onSnapToItem = (index) => {
    const slideIndex = index - 1;
    this.setState({slideIdx: slideIndex});
    const date = this.state.items[slideIndex];
    if (slideIndex < MIDDLE_INDEX) {
      _.invoke(this.props.context, 'setDate', this.props.minDate, UPDATE_SOURCES.WEEK_SCROLL);
      return this._carousel.snapToItem(MIDDLE_INDEX);
    }
    _.invoke(this.props.context, 'setDate', date.toString('yyyy-MM-dd'), UPDATE_SOURCES.WEEK_SCROLL);
  }


  keyExtractor = (item) => item.toString();

  render() {
    const {allowShadow, hideDayNames} = this.props;
    const {items} = this.state;
    const SNAP_WIDTH = (this.containerWidth - (INSET_PADDING * 2)) / NUMBER_OF_ITEMS;


    return (
      <View style={[allowShadow && this.style.containerShadow, !hideDayNames && {paddingBottom: 6}]}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: SNAP_WIDTH * 3,
            paddingHorizontal: 50,
            paddingVertical: 37,
            borderColor: '#000',
            borderWidth: 2,
            borderRadius: 3
          }}
        />
        <Carousel
          ref={(c) => { this._carousel = c; }}
          data={items}
          containerCustomStyle={{position: 'absolute', top: 8, paddingHorizontal: 0}}
          horizontal
          renderItem={this.renderItem}
          inactiveSlideOpacity={1}
          inactiveSlideScale={1}
          sliderWidth={this.containerWidth + SNAP_WIDTH}
          itemWidth={SNAP_WIDTH}
          onSnapToItem={this.onSnapToItem}
          firstItem={MIDDLE_INDEX}
        />
        <View style={[this.style.container, {width: this.containerWidth, height: 100, zIndex: -1}]}/>
      </View>
    );
  }
}

export default asCalendarConsumer(CustomWeekCalendar);
