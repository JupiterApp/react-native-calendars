import React, {Component} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import PropTypes from 'prop-types';
import XDate from 'xdate';

import dateutils from '../dateutils';
import {xdateToData, parseDate} from '../interface';
import {SELECT_DATE_SLOT} from '../testIDs';
import styleConstructor from './style';

import Day from '../calendar/day/basic';
import UnitDay from '../calendar/day/period';
import MultiDotDay from '../calendar/day/multi-dot';
import MultiPeriodDay from '../calendar/day/multi-period';
import SingleDay from '../calendar/day/custom';
import Calendar from '../calendar';

const commons = require('./commons');

const EmptyArray = [];

class Week extends Component {
  static displayName = 'IGNORE';

  static propTypes = {
    ...Calendar.propTypes,
    // the current date
    current: PropTypes.any
  };

  constructor(props) {
    super(props);
    
    this.style = styleConstructor(props.theme);
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


  getThreeDaysBeforeMin (dates, minDate) {
    const newDates = [];
    const ARR = [1, 2, 3].reverse();
    ARR.forEach(value => {
      newDates.push(minDate.clone().addDays(-value));
    });
    return newDates;
  }


  getDayComponent() {
    const {dayComponent} = this.props;
    if (dayComponent) {
      return dayComponent;
    }

    switch (this.props.markingType) {
    case 'period':
      return UnitDay;
    case 'multi-dot':
      return MultiDotDay;
    case 'multi-period':
      return MultiPeriodDay;
    case 'custom':
      return SingleDay;
    default:
      return Day;
    }
  }

  getDateMarking(day) {
    const {markedDates} = this.props;
    if (!markedDates) {
      return false;
    }

    const dates = markedDates[day.toString('yyyy-MM-dd')] || EmptyArray;
    if (dates.length || dates) {
      return dates;
    } else {
      return false;
    }
  }

  // renderWeekNumber (weekNumber) {
  //   return <Day key={`week-${weekNumber}`} theme={this.props.theme} marking={{disableTouchEvent: true}} state='disabled'>{weekNumber}</Day>;
  // }

  renderDay(day, id) {
    const {current} = this.props;
    const minDate = parseDate(this.props.minDate);
    const maxDate = parseDate(this.props.maxDate);

    let state = '';
    if (this.props.disabledByDefault) {
      state = 'disabled';
    } else if ((minDate && !dateutils.isGTE(day, minDate)) || (maxDate && !dateutils.isLTE(day, maxDate))) {
      state = 'disabled';
    } else if (!dateutils.sameMonth(day, parseDate(current))) { // for extra days
      if (dateutils.sameDate(day, XDate())) {
        state = 'today';
      } else {
        state = 'not-disabled';
      }
    } else if (dateutils.sameDate(day, XDate())) {
      state = 'today';
    } else if (dateutils.sameDate(current, day)) {
      state = 'today';
    }

    // hide extra days
    if (current && this.props.hideExtraDays) {
      if (!dateutils.sameMonth(day, parseDate(current))) {
        return (<View key={id} style={{flex: 1}}/>);
      }
    }

    const DayComp = this.getDayComponent();
    const dayDate = day.getDate();
    const dateAsObject = xdateToData(day);
    const WIDTH = (commons.screenWidth - 30) / 7;
    const containerStyle = this.props.calendarMode === 'schedule' ? {width: WIDTH, alignItems: 'center'} : {flex: 1, alignItems: 'center'};

    return (
      <TouchableOpacity onPress={() => this.props.onDayPress(dateAsObject)} disabled={state === 'disabled'} key={id}>
        <View style={containerStyle}>
          <View style={[this.style.week]}>
            <Text 
              allowFontScaling={false} 
              style={[this.style.dayHeader, this.getDateMarking(day).selected && this.style.dayHeaderSelected]} 
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
            disabled={state === 'disabled'}
          >
            {dayDate}
          </DayComp>
        </View>
      </TouchableOpacity>
    );
  }

  render() {
    const {current, calendarMode} = this.props;
    const minDate = parseDate(this.props.minDate);
    let dates = this.getWeek(current);
    let week = [];

    if (calendarMode === 'schedule' && this.props.index === 0) {
      const originalDates = dates;
      dates = originalDates.filter(day => dateutils.isGTE(day, minDate));
      const threeDays = this.getThreeDaysBeforeMin(dates, minDate);
      dates = [...threeDays, ...dates];
    }

    if (dates) {
      dates.forEach((day, id) => {
        week.push(this.renderDay(day, id));
      }, this);
    }
    
    
    // if (this.props.showWeekNumbers) {
    //   week.unshift(this.renderWeekNumber(item[item.length - 1].getWeek()));
    // }

    const weekStyle = [this.style.week, this.props.style];

    return (
      <View style={this.style.container}>
        <View style={weekStyle}>{week}</View>
      </View>
    );
  }
}

export default Week;
