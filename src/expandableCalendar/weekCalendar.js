import _ from 'lodash';
import React, {Component} from 'react';
import {FlatList, View, Text} from 'react-native';
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
const NUMBER_OF_PAGES = 2; // must be a positive number

/**
 * @description: Week calendar component
 * @example: https://github.com/wix/react-native-calendars/blob/master/example/src/screens/expandableCalendar.js
 */
class WeekCalendar extends Component {
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
      initialScrollIndex: null
    };
  }

  getInitialScrollIndex = () => {
    let currentDateIdx = 0;
    const items = this.getDatesArray();
    const days = items.map(block => this.getWeek(block));
    days.forEach((dayArr, idx) => {
      if (dayArr.find(day => sameDate(XDate(this.props.context.date), day))) {
        currentDateIdx = idx;
      }
    });
    return currentDateIdx;
  }


  componentDidUpdate(prevProps) {
    const {updateSource, date} = this.props.context;
    
    if (date !== prevProps.context.date && updateSource !== UPDATE_SOURCES.WEEK_SCROLL) {
      let currentDateIdx = 0;
      const items = this.getDatesArray();
      this.setState({items});
      const days = items.map(block => this.getWeek(block));
      days.forEach((dayArr, idx) => {
        if (dayArr.find(day => sameDate(XDate(this.props.current), day))) {
          currentDateIdx = idx;
        }
      });
      this.list.current.scrollToIndex({animated: false, index: currentDateIdx});
    }
  }

  get containerWidth() {
    return this.props.calendarWidth || commons.screenWidth;
  }

  getWeek(date) {
    if (date) {
      const current = parseDate(date);
      const daysArray = [current];
      let dayOfTheWeek = current.getDay() - this.props.firstDay;
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
    if (this.props.calendarMode === 'timeSelection') return this.getDateMaxForTimeSelection();
    let array = [];
    for (let index = -NUMBER_OF_PAGES; index <= NUMBER_OF_PAGES; index++) {
      const d = this.getDate(index);
      array.push(d);
    }

    let dateIsTodayIdx = -1;
    let currentDateIdx = 0;
    const days = array.map(block => this.getWeek(block));
    days.forEach((dayArr, idx) => {
      if (dayArr.find(day => sameDate(day, XDate()))) {
        dateIsTodayIdx = idx;
      }
    });

    if (dateIsTodayIdx > 0) {
      const newArr = array.slice(dateIsTodayIdx);
      return newArr;
    }

    return array;
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
        marked[context.date].selected = true;
      } else {
        marked[context.date] = {selected: true};
      }
      return marked;
    } 
    return {[context.date]: {selected: true}};
  }

  onDayPress = (value) => {
    _.invoke(this.props.context, 'setDate', value.dateString, UPDATE_SOURCES.DAY_PRESS);
  }

  onScroll = ({nativeEvent: {contentOffset: {x}}}) => {
    const newPage = Math.round(x / this.containerWidth);
    
    if (this.page !== newPage) {
      const {items, initialScrollIndex} = this.state;
      this.page = newPage;


      if (!initialScrollIndex) return this.setState({initialScrollIndex: this.page});
      _.invoke(this.props.context, 'setDate', items[this.page], UPDATE_SOURCES.WEEK_SCROLL);

      // if (this.page === items.length - 1) {
      //   for (let i = 0; i <= NUMBER_OF_PAGES; i++) {
      //     items[i] = items[i + NUMBER_OF_PAGES];
      //   }
      //   this.setState({items: [...items]});
      // } else if (this.page === 0) {
      //   for (let i = items.length - 1; i >= NUMBER_OF_PAGES; i--) {
      //     items[i] = items[i - NUMBER_OF_PAGES];
      //   }
      //   this.setState({items: [...items]});
      // }
    }
  }

  onMomentumScrollEnd = () => {
    if (this.props.calendarMode === 'schedule' || this.props.calendarMode === 'timeSelection') return;
    const {items} = this.state;
    const isFirstPage = this.page === 0;
    const isLastPage = this.page === items.length - 1;

    if (isFirstPage || isLastPage) {
      this.list.current.scrollToIndex({animated: false, index: NUMBER_OF_PAGES});
      this.page = NUMBER_OF_PAGES;
      const newWeekArray = this.getDatesArray();

      if (isLastPage) {
        for (let i = NUMBER_OF_PAGES + 1; i < items.length; i++) {
          items[i] = newWeekArray[i];
        }
      } else {
        for (let i = 0; i < NUMBER_OF_PAGES; i++) {
          items[i] = newWeekArray[i];
        }
      }

      setTimeout(() => {
        this.setState({items: [...items]});
      }, 100);
    }
  }

  renderItem = ({item}) => {
    const {calendarWidth, style, onDayPress, ...others} = this.props;

    return (
      <Week 
        {...others} 
        key={item} 
        current={item} 
        style={[{width: calendarWidth || this.containerWidth}, style]}
        markedDates={this.getMarkedDates()}
        onDayPress={onDayPress || this.onDayPress}
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

  keyExtractor = (item, index) => index.toString();

  render() {
    const {allowShadow, firstDay, hideDayNames} = this.props;
    const {items} = this.state;
    let weekDaysNames = weekDayNames(firstDay);

    return (
      <View style={[allowShadow && this.style.containerShadow, !hideDayNames && {paddingBottom: 6}]}>
        {!hideDayNames &&
          <View style={[this.style.week, {marginTop: 12, marginBottom: -2}]}>
            {/* {this.props.weekNumbers && <Text allowFontScaling={false} style={this.style.dayHeader}></Text>} */}
            {weekDaysNames.map((day, idx) => (
              <Text 
                allowFontScaling={false} 
                key={idx} 
                style={this.style.dayHeader} 
                numberOfLines={1} 
                accessibilityLabel={''}
                // accessible={false} // not working
                // importantForAccessibility='no'
              >
                {day}
              </Text>
            ))}
          </View>
        }
        <FlatList
          ref={this.list}
          data={items}
          extraData={this.props.current || this.props.context.date}
          style={this.style.container}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          scrollEnabled
          renderItem={this.renderItem}
          keyExtractor={this.keyExtractor}
          getItemLayout={this.getItemLayout}
          onScroll={this.onScroll}
          onMomentumScrollEnd={this.onMomentumScrollEnd}
          bounces={false}
          style={{width: this.containerWidth}}
          initialScrollIndex={this.getInitialScrollIndex()}
          // snapToInterval={35}
          // decelerationRate={0}
          // snapToAlignment={'center'}
        />

      </View>
    );
  }
}

export default asCalendarConsumer(WeekCalendar);
