<template>
  <v-app dark>
    <v-content>
      <v-container>
        <v-layout  column fill-height>
          <v-flex>
            <v-img
              :src="require('./assets/logo.svg')"
              contain
              position="left center"
              min-width="140"
              max-height="128"
              style="margin-left: -16px;"
            ></v-img>
          </v-flex>
          <v-flex>
            <v-calendar
              color="primary"
              :events="events"
              :event-color="getEventColor"
              :now="today"
              :start="beforeStart"
              :end="beforeEnd"
              type="custom-weekly"
              :weekdays="[1, 2, 3, 4, 5, 6, 0]"
            >
              <!-- <template v-slot:day-month="{ present, past, date }">
                <v-layout
                  fill-height
                >
                  <template v-if="past">
                    <v-sheet
                      v-for="i in 3"
                      :key="i"
                      :title="i"
                      color="blue"
                      :width="`20%`"
                      height="100%"
                      tile
                    ></v-sheet>
                  </template>
                </v-layout>
              </template> -->
            </v-calendar>
          </v-flex>
          <v-flex>
            <v-sheet ref="week" id="week" height="500">
              <v-calendar
                :events="events"
                :event-color="getEventColor"
                :now="today"
                :value="today"
                :start="today"
                :end="today"
                :interval-height="25"
                :first-interval="8"
                :interval-count="16"
                :short-intervals="false"
                :short-months="false"
                :short-weekdays="true"
                type="week"
                :weekdays="[1, 2, 3, 4, 5, 6, 0]"
              >
                <template v-slot:event="{event, day}">
                  <div v-if="event.weather" class="weather">
                    <skycon :condition="event.weather.icon" width="24" height="24" color="white"></skycon>
                    <span v-if="event.weather.temperature" class="weatherCurrent">
                      {{Math.round(event.weather.temperature)}}&nbsp;<span class="weahterUnit">°C</span>
                      <div class="weatherForecast">
                        {{Math.round(event.weather.temperatureHigh)}}&nbsp;<span class="weahterUnit">°C / </span>{{Math.round(event.weather.temperatureLow)}}&nbsp;<span class="weahterUnit">°C</span>
                      </div>
                    </span>
                    <span v-else class="weather weatherDaily">
                      {{Math.round(event.weather.temperatureHigh)}}&nbsp;<span class="weahterUnit">°C</span>
                    </span>
                  </div>
                  <div v-else-if="day.index" class="eventAllDay">
                    <div v-html="event.name" v-if="day.index == 0 || (day.day == event.startMoment.date() && day.month == event.startMoment.month()+1 && day.year == event.startMoment.year())"></div>
                  </div>
                  <div v-else class="eventTimed">
                    <div class="eventTime">{{ event.startMoment.format("HH:mm") }}</div>
                    <div class="eventTitle" v-html="event.name"></div>
                    <div class="eventLocation" v-if="event.raw && event.raw.location">{{ event.raw.location }}</div>
                    <!-- <v-sheet class="eventTime darken-2" :color="event.color">{{ event.startMoment.format("HH:mm") }}</v-sheet> -->
                  </div>
                </template>
              </v-calendar>
            </v-sheet>
          </v-flex>
          <v-flex>
            <v-calendar
              color="primary"
              :events="events"
              :event-color="getEventColor"
              :now="today"
              :start="afterStart"
              :end="afterEnd"
              type="custom-weekly"
              :weekdays="[1, 2, 3, 4, 5, 6, 0]"
            ></v-calendar>
          </v-flex>
        </v-layout>
      </v-container>
    </v-content>
    
    <v-layout column style="position: fixed; right: 16px; bottom: 16px;">
      <v-btn
        fab
        color="green"
        @click="scrollToCurrentWeek()"
      >
        <v-icon>view_week</v-icon>
      </v-btn>
      <v-btn
        fab
        color="blue"
        @click="updateEvents()"
      >
        <v-icon>refresh</v-icon>
      </v-btn>
    </v-layout>
  </v-app>
</template>

<script>

import config from '../config.js';

import moment from 'moment';
import ical from 'node-ical';
import DarkSkyApi from 'dark-sky-api';
DarkSkyApi.apiKey = config.darkSkyApiKey;
DarkSkyApi.proxy = `http://localhost:8080/forecast/${DarkSkyApi.apiKey}`; 
DarkSkyApi.units = 'si'; // default 'us'
DarkSkyApi.language = 'de'; // default 'en'

export default {
  name: 'App',
  data: () => ({
    fab: false,
    calendars: [
      {
        name: "weather",
        coordinates: config.weatherLocation,
        color: "transparent",
        events: [{
          name: 'Necessary for Template initialization',
          start: '2018-01-08 08:00',
          end: '2018-01-08 10:00',
        }]
      }
    ],
    today: moment().format('YYYY-MM-DD'),
    beforeStart: moment().subtract(1, 'month').format('YYYY-MM-DD'),
    beforeEnd: moment().subtract(1, 'week').format('YYYY-MM-DD'),
    afterStart: moment().add(1, 'week').format('YYYY-MM-DD'),
    afterEnd: moment().add(6, 'month').format('YYYY-MM-DD'),
    forecast: undefined
  }),
  computed: {
    events () {
      return this.calendars.reduce((r, { events }) => [...r, ...events], []);
    },
  },
  created() {
    // Add the calendars from config.js
    this.calendars = this.calendars.concat(config.calendars);
  },
  mounted() {
  },
  methods:
  {
    getEventColor (event) {
      return event.color
    },
    getEventsFromIcal(url, color, name, func, numTries)
    {
      if (numTries === undefined) numTries = 0;

      ical.fromURL(url, {}, (err, data) => {
        if (err != undefined && numTries < 5) {
          return this.getEventsFromIcal(url, color, name, func, numTries + 1);
        }

        let events = [];
        for (let k in data) {
          if (data.hasOwnProperty(k)) {
            // When dealing with calendar recurrences, you need a range of dates to query against,
            // because otherwise you can get an infinite number of calendar events.
            var rangeStart = moment();
            var rangeEnd = moment().add(6, 'month');

            var event = data[k];

            if (data[k].type == 'VEVENT') {
              var title = event.summary;
              var startDate = moment(event.start);
              var endDate = moment(event.end);

              // Calculate the duration of the event for use with recurring events.
              var duration = parseInt(endDate.format("x")) - parseInt(startDate.format("x"));
              
              // Complicated case - if an RRULE exists, handle multiple recurrences of the event.
              if (typeof event.rrule !== 'undefined')
              {
                // For recurring events, get the set of event start dates that fall within the range
                // of dates we're looking for.
                var dates = event.rrule.between(
                  rangeStart.toDate(),
                  rangeEnd.toDate(),
                  true,
                  function() {return true;}
                )

                // The "dates" array contains the set of dates within our desired date range range that are valid
                // for the recurrence rule.  *However*, it's possible for us to have a specific recurrence that
                // had its date changed from outside the range to inside the range.  One way to handle this is
                // to add *all* recurrence override entries into the set of dates that we check, and then later
                // filter out any recurrences that don't actually belong within our range.
                if (event.recurrences != undefined)
                {
                  for (var r in event.recurrences)
                  {
                    // Only add dates that weren't already in the range we added from the rrule so that 
                    // we don't double-add those events.
                    if (moment(new Date(r)).isBetween(rangeStart, rangeEnd) != true)
                    {
                      dates.push(new Date(r));
                    }
                  }
                }

                // Loop through the set of date entries to see which recurrences should be printed.
                for(var i in dates) {

                  var date = dates[i];
                  var curEvent = event;
                  var showRecurrence = true;
                  var curDuration = duration;

                  startDate = moment(date);

                  // Use just the date of the recurrence to look up overrides and exceptions (i.e. chop off time information)
                  var dateLookupKey = date.toISOString().substring(0, 10);

                  // For each date that we're checking, it's possible that there is a recurrence override for that one day.
                  if ((curEvent.recurrences != undefined) && (curEvent.recurrences[dateLookupKey] != undefined))
                  {
                    // We found an override, so for this recurrence, use a potentially different title, start date, and duration.
                    curEvent = curEvent.recurrences[dateLookupKey];
                    startDate = moment(curEvent.start);
                    curDuration = parseInt(moment(curEvent.end).format("x")) - parseInt(startDate.format("x"));
                  }
                  // If there's no recurrence override, check for an exception date.  Exception dates represent exceptions to the rule.
                  else if ((curEvent.exdate != undefined) && (curEvent.exdate[dateLookupKey] != undefined))
                  {
                    // This date is an exception date, which means we should skip it in the recurrence pattern.
                    showRecurrence = false;
                  }

                  // Set the the title and the end date from either the regular event or the recurrence override.
                  var recurrenceTitle = curEvent.summary;
                  endDate = moment(parseInt(startDate.format("x")) + curDuration, 'x');

                  // If this recurrence ends before the start of the date range, or starts after the end of the date range, 
                  // don't process it.
                  if (endDate.isBefore(rangeStart) || startDate.isAfter(rangeEnd)) {
                    showRecurrence = false;
                  }

                  if (showRecurrence === false) {
                    continue;
                  }

                }
              }
              
              // Add event
              if (parseInt(endDate.format("x")) - parseInt(startDate.format("x")) == 86400000) // All day event
              {
                events.push({
                  name: title === undefined ? recurrenceTitle : title,
                  details: event.description,
                  color: color,
                  start: startDate.format('YYYY-MM-DD'),
                  startMoment: startDate,
                  raw: event
                });
              }
              else
              {
                if (event["MICROSOFT-CDO-ALLDAYEVENT"] == "TRUE")
                {
                  events.push({
                    name: title === undefined ? recurrenceTitle : title,
                    details: event.description,
                    color: color,
                    start: startDate.format('YYYY-MM-DD'), 
                    end: endDate.format('YYYY-MM-DD'),
                    startMoment: startDate,
                    endMoment: endDate,
                    raw: event
                  });
                }
                else
                {
                  events.push({
                    name: title === undefined ? recurrenceTitle : title,
                    details: event.description,
                    color: color,
                    start: startDate.format('YYYY-MM-DD HH:mm'), 
                    end: endDate.format('YYYY-MM-DD HH:mm'),
                    startMoment: startDate,
                    endMoment: endDate,
                    raw: event
                  });
                }
              }
            }
          }
        }

        func(events);
      });
    },
    updateEvents()
    {
      this.calendars.forEach(calendar => {
        if (calendar.url != undefined) {
          this.getEventsFromIcal(calendar.url, calendar.color, calendar.name, (events) => calendar.events = events);
        }
        else if (calendar.name == "weather") {
          // Retrieve weather information from coordinates
          DarkSkyApi.loadItAll('flags', calendar.coordinates).then(result => {
            result.currently.temperatureHigh = result.daily.data[0].temperatureHigh;
            result.currently.temperatureLow  = result.daily.data[0].temperatureLow;

            calendar.events = [
              {
                name: `<span class="weather weatherCurrent">
                        ${Math.round(result.currently.temperature)}&nbsp;<span class="weahterUnit">°C</span>
                        <div class="weatherForecast">
                          ${Math.round(result.daily.data[0].temperatureHigh)}&nbsp;<span class="weahterUnit">°C / </span>${Math.round(result.daily.data[0].temperatureLow)}&nbsp;<span class="weahterUnit">°C</span>
                        </div>
                      </span>`,
                weather: result.currently,
                details: result.currently.summary,
                color: calendar.color,
                start: result.currently.dateTime.format('YYYY-MM-DD'),
                startMoment: result.currently.dateTime
              }
            ];
            

            // Remove first element of daily array
            result.daily.data.shift();

            // result.hourly.data.forEach(hour => {
            //   calendar.events.push({
            //     name: `<span class="weather weatherHourly">${this.weatherIconToUnicode(hour.icon)} ${Math.round(hour.temperature)}&nbsp;<span class="weahterUnit">°C</span></span>`,
            //     details: hour.summary,
            //     color: calendar.color,
            //     start: moment.unix(hour.time).format('YYYY-MM-DD HH:mm'),
            //     end: moment.unix(hour.time).add(30, 'minutes').format('YYYY-MM-DD HH:mm')
            //   });
            // });

            result.daily.data.forEach(day => {
              calendar.events.push({
                name: `<span class="weather weatherDaily">${this.weatherIconToUnicode(day.icon)} ${Math.round(day.temperatureHigh)}&nbsp;<span class="weahterUnit">°C</span></span>`,
                weather: day,
                details: day.summary,
                color: calendar.color,
                start: day.dateTime.format('YYYY-MM-DD'),
                startMoment: day.dateTime
              });
            });
          });
        }
      });
    },
    weatherIconToUnicode(icon) {
      switch (icon) {
        case "clear-day":
          return "☀";
        case "clear-night": 
          return "🌑";
        case "rain": 
          return "🌧";
        case "snow": 
          return "❄";
        case "sleet": 
          return "🌨";
        case "wind": 
          return "🍃";
        case "fog": 
          return "🌫";
        case "cloudy": 
          return "☁";
        case "partly-cloudy-day": 
          return "🌤";
        case "partly-cloudy-night": 
          return "🌥";
        default:
          return "❓";
      }
    },
    scrollToCurrentWeek()
    {
      this.$vuetify.goTo("#week", {
        duration: 1000,
        offset: 0,
        easing: 'easeInOutCubic',
      });
    }
  },
};
</script>

<style>

::-webkit-scrollbar {
    display: none;
}

.v-calendar-weekly__head,
.v-calendar-daily__intervals-head,
.v-calendar-daily__intervals-body {
  display: none ! important;
}

.v-calendar *,
.theme--dark.v-calendar-events .v-event-timed-container .v-event-timed {
  border: none ! important;
}

.v-outside {
  background: none ! important;
}

.v-present {
  background: rgba(255,255,255,.1);
}

.v-calendar-weekly__day-label,
.v-calendar-daily_head-day-label {
  text-align: left ! important;
}

.v-calendar-daily {
  background: rgba(255, 255, 255, .05) ! important;
}

.v-calendar-daily .v-calendar-daily__day-interval {
  border-top: rgba(255,255,255,0.05) 1px solid ! important;
}

.v-calendar-weekly__week {
  min-height: 150px ! important;
  max-height: 150px ! important;
}

.v-calendar-weekly__week:nth-child(even),
.v-calendar-weekly__day:nth-child(even) {
    background: rgba(255,255,255,.03) ! important;
}


.v-calendar-daily_head-day-label button.v-btn {
  margin: 0;
  max-width: 20px;
  max-height: 20px;
  font-size: 24px;
  font-weight: 200;
  background-color: transparent ! important;
}

.v-calendar-daily_head-weekday {
  position: absolute;
  left: 26px;
  top: 12px;
  font-weight: 600;
}

.v-event-timed {
  box-shadow: 0px 3px 3px -2px rgba(0, 0, 0, 0.2), 0px 3px 4px 0px rgba(0, 0, 0, 0.14), 0px 1px 8px 0px rgba(0, 0, 0, 0.12) !important;
}

.eventTitle {
  display: inline-block;
  text-overflow: ellipsis;
  padding: 2px 2px 0px;
  width: 100%;
  font-size: larger;
}

.v-sheet.eventTime {
  position: absolute;
  right: 1px;
  top: 1px;
  padding: 1px 2px;
  border-radius: 3px;
}

.eventTime {
  margin: 0px 4px -3px;
  font-size: smaller;
  opacity: 0.75;
  font-weight: 600;
}

.eventLocation {
  padding: 0px 3px;
  font-weight: 400;
  opacity: 0.7;
  font-size: smaller;
}

.v-calendar .v-event-timed-container {
  width: 96% ! important;
  left: 2% ! important;
}

.v-calendar-daily_head-day {
    position: relative;
}

.v-calendar-daily .v-event.transparent {
  overflow: visible;
  top: -20px ! important;
}

.weather {
  font-weight: normal;
  vertical-align: text-bottom;
  text-align: right;
  opacity: 0.7;
}

.weahterUnit {
    opacity: .4;
    font-size: smaller;
}

.weatherForecast {
  font-size: smaller;
  margin-top: -4px;
}

</style>